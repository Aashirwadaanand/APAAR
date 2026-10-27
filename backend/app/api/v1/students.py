from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import csv
import io

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.audit import AuditLog
from backend.app.schemas.student import StudentResponse, StudentListResponse, StudentCreate, StudentUpdate
from backend.app.services.apaar_validator import validate_apaar_syntax

router = APIRouter()

@router.get("/students", response_model=StudentListResponse, tags=["Students"])
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    department: Optional[str] = None,
    verification_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List institutional student records with server-side search, filtering, and pagination."""
    query = db.query(Student)

    if department:
        query = query.filter(Student.department == department)
    if verification_status:
        query = query.filter(Student.verification_status == verification_status)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(s),
                Student.roll_number.ilike(s),
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
def get_student(student_id: int, db: Session = Depends(get_db)):
    """Retrieve full student record with data quality and conflict details."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/students", response_model=StudentResponse, tags=["Students"])
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """Enroll a new student in the institutional registry."""
    existing_roll = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=400, detail=f"Roll number {payload.roll_number} already exists")

    # If APAAR ID provided, validate syntax & Verhoeff checksum
    if payload.apaar_id:
        valid_syntax, reason = validate_apaar_syntax(payload.apaar_id)
        if not valid_syntax:
            raise HTTPException(status_code=422, detail=f"APAAR Validation Error: {reason}")

    full_name = f"{payload.first_name.strip()} {payload.last_name.strip()}"
    new_student = Student(
        roll_number=payload.roll_number,
        first_name=payload.first_name,
        last_name=payload.last_name,
        full_name=full_name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        father_name=payload.father_name,
        email=payload.email,
        mobile=payload.mobile,
        department=payload.department,
        degree_program=payload.degree_program,
        academic_year=payload.academic_year,
        admission_year=payload.admission_year,
        apaar_id=payload.apaar_id,
        abc_id=payload.abc_id,
        aadhaar_vault_ref=f"hash_sim_{payload.roll_number[:4]}_vault",
        enrollment_status=payload.enrollment_status,
        verification_status="Unverified",
        quality_score=95.0
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Log to audit trail
    audit_entry = AuditLog(
        actor_name="Registrar Officer",
        actor_role="Admissions Desk",
        action="STUDENT_ENROLLED",
        module="Registry",
        entity_id=str(new_student.id),
        description=f"Enrolled {new_student.full_name} ({new_student.roll_number}) in {new_student.department}",
        severity="INFO"
    )
    db.add(audit_entry)
    db.commit()

    return new_student

@router.patch("/students/{student_id}", response_model=StudentResponse, tags=["Students"])
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    """Update institutional student record."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = payload.dict(exclude_unset=True)
    if "apaar_id" in update_data and update_data["apaar_id"]:
        valid, msg = validate_apaar_syntax(update_data["apaar_id"])
        if not valid:
            raise HTTPException(status_code=422, detail=f"APAAR Checksum Failure: {msg}")

    for field, val in update_data.items():
        setattr(student, field, val)

    if payload.first_name or payload.last_name:
        student.full_name = f"{student.first_name} {student.last_name}".strip()

    db.commit()
    db.refresh(student)

    audit = AuditLog(
        actor_name="Registrar Officer",
        action="STUDENT_UPDATED",
        module="Registry",
        entity_id=str(student.id),
        description=f"Updated details for roll number {student.roll_number}",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return student
