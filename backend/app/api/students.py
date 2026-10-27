from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import json

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.audit import AuditEvent
from backend.app.schemas.student import (
    StudentResponse,
    StudentListResponse,
    StudentCreate,
    StudentUpdate,
    ImportConfirmRequest
)
from backend.app.services.apaar_validator import validate_apaar_syntax
from backend.app.services.csv_importer import (
    validate_csv_upload_bytes,
    preview_csv_records,
    commit_csv_import
)

router = APIRouter()

@router.get("/students", response_model=StudentListResponse, tags=["Students"])
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    institution_id: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve students with pagination, search, institution, and enrollment status filtering."""
    query = db.query(Student)

    if institution_id:
        query = query.filter(Student.institution_id == institution_id)
    if status:
        query = query.filter(Student.enrollment_status == status)
    if department:
        query = query.filter(
            or_(
                Student.programme.ilike(f"%{department}%"),
                Student.department.ilike(f"%{department}%")
            )
        )
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(s),
                Student.institution_student_id.ilike(s),
                Student.apaar_id.ilike(s),
                Student.email.ilike(s)
            )
        )

    total = query.count()
    items = query.order_by(Student.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return StudentListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )

@router.get("/students/{student_id}", response_model=StudentResponse, tags=["Students"])
def get_student_by_id(student_id: int, db: Session = Depends(get_db)):
    """Retrieve a single student record by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student record with ID {student_id} not found.")
    return student

@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED, tags=["Students"])
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """Create a new student enrollment."""
    # Determine student roll ID
    student_id_val = payload.institution_student_id or payload.roll_number
    if not student_id_val:
        raise HTTPException(status_code=422, detail="Field 'institution_student_id' or 'roll_number' is required.")

    # Enforce intra-institution uniqueness on (institution_id, institution_student_id)
    inst_id = payload.institution_id or "AICTE-1-432890123"
    existing = db.query(Student).filter(
        Student.institution_id == inst_id,
        Student.institution_student_id == student_id_val
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Student ID '{student_id_val}' is already registered in institution '{inst_id}'."
        )

    # Format-validate APAAR syntax if provided (format check only - does not claim verified identity)
    if payload.apaar_id:
        is_valid, reason = validate_apaar_syntax(payload.apaar_id)
        if not is_valid:
            raise HTTPException(status_code=422, detail=f"APAAR Format Validation Error: {reason}")

    student = Student(
        institution_id=inst_id,
        institution_student_id=student_id_val,
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        programme=payload.programme or payload.department or "Engineering & Technology",
        academic_year=str(payload.academic_year or "2025-2026"),
        apaar_id=payload.apaar_id,
        enrollment_status=payload.enrollment_status or "Active",
        first_name=payload.first_name,
        last_name=payload.last_name,
        gender=payload.gender or "Not Specified",
        father_name=payload.father_name,
        email=payload.email or f"{student_id_val.lower()}@institute.edu",
        mobile=payload.mobile or "9800000000",
        department=payload.programme or "Engineering",
        degree_program=payload.degree_program or "B.Tech",
        admission_year=2024,
        verification_status="Unverified",
        quality_score=95.0
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    audit = AuditEvent(
        actor_label="Admissions Officer",
        action="STUDENT_ENROLLED",
        entity_type="Student",
        entity_id=str(student.id),
        details_json=f'{{"student_id": "{student.institution_student_id}", "institution": "{student.institution_id}"}}'
    )
    db.add(audit)
    db.commit()

    return student

@router.patch("/students/{student_id}", response_model=StudentResponse, tags=["Students"])
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    """Update existing student attributes."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    update_dict = payload.model_dump(exclude_unset=True)

    # Handle roll_number / institution_student_id mapping
    if "institution_student_id" in update_dict and update_dict["institution_student_id"]:
        new_id = update_dict["institution_student_id"]
        # Check uniqueness within institution
        conflict = db.query(Student).filter(
            Student.institution_id == student.institution_id,
            Student.institution_student_id == new_id,
            Student.id != student.id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Student ID '{new_id}' is already assigned to another student.")
        student.institution_student_id = new_id

    if "apaar_id" in update_dict and update_dict["apaar_id"]:
        is_valid, reason = validate_apaar_syntax(update_dict["apaar_id"])
        if not is_valid:
            raise HTTPException(status_code=422, detail=f"APAAR format error: {reason}")
        student.apaar_id = update_dict["apaar_id"]

    for field, val in update_dict.items():
        if field not in ["institution_student_id", "roll_number", "apaar_id"]:
            setattr(student, field, val)

    db.commit()
    db.refresh(student)

    audit = AuditEvent(
        actor_label="Registrar Office",
        action="STUDENT_UPDATED",
        entity_type="Student",
        entity_id=str(student.id),
        details_json=f'{{"updated_fields": {list(update_dict.keys())}}}'
    )
    db.add(audit)
    db.commit()

    return student

@router.post("/students/import-preview", tags=["CSV Import"])
async def preview_csv_import(
    file: UploadFile = File(...),
    institution_id: str = Form("AICTE-1-432890123"),
    db: Session = Depends(get_db)
):
    """
    Inspect, validate, and preview CSV upload without mutating database.
    Detects required field omissions, malformed APAAR IDs, intra-file duplicates, and DB collisions.
    """
    content_bytes = await file.read()
    try:
        csv_text = validate_csv_upload_bytes(file.filename, content_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        preview_data = preview_csv_records(csv_text, institution_id, db)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return preview_data

@router.post("/students/import", tags=["CSV Import"])
def confirm_csv_import(payload: ImportConfirmRequest, db: Session = Depends(get_db)):
    """Execute confirmed insertion of validated student records."""
    try:
        summary = commit_csv_import(payload.records, payload.institution_id, db)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
