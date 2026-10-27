from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import io

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.audit import AuditLog

router = APIRouter()

@router.get("/reports/export/students-csv", tags=["Reports & Export"])
def export_students_csv(db: Session = Depends(get_db)):
    """Export complete institutional student dataset as standard AICTE compliance CSV format."""
    students = db.query(Student).order_by(Student.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Roll Number",
        "Full Name",
        "Department",
        "Degree Program",
        "Academic Year",
        "Admission Year",
        "APAAR ID",
        "ABC ID",
        "Date of Birth",
        "Gender",
        "Email",
        "Mobile",
        "Enrollment Status",
        "Verification Status",
        "Quality Score"
    ])

    for s in students:
        writer.writerow([
            s.roll_number,
            s.full_name,
            s.department,
            s.degree_program,
            s.academic_year,
            s.admission_year,
            s.apaar_id or "",
            s.abc_id or "",
            s.date_of_birth.isoformat() if s.date_of_birth else "",
            s.gender,
            s.email,
            s.mobile,
            s.enrollment_status,
            s.verification_status,
            s.quality_score
        ])

    output.seek(0)

    # Log export action
    audit = AuditLog(
        actor_name="Compliance Officer",
        actor_role="Accreditation Desk",
        action="DATASET_EXPORTED_CSV",
        module="Reports",
        description=f"Exported CSV roster containing {len(students)} student records.",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aicte_institutional_students_export.csv"}
    )
