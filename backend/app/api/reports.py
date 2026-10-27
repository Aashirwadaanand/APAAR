from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import csv
import io

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.audit import AuditEvent

router = APIRouter()

def generate_csv_stream(institution_id: Optional[str], db: Session):
    query = db.query(Student)
    if institution_id:
        query = query.filter(Student.institution_id == institution_id)
    students = query.order_by(Student.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "institution_id",
        "institution_student_id",
        "full_name",
        "apaar_id",
        "programme",
        "academic_year",
        "enrollment_status",
        "date_of_birth",
        "email",
        "mobile",
        "verification_status",
        "quality_score"
    ])

    for s in students:
        writer.writerow([
            s.institution_id,
            s.institution_student_id,
            s.full_name,
            s.apaar_id or "",
            s.programme,
            s.academic_year,
            s.enrollment_status,
            s.date_of_birth.isoformat() if s.date_of_birth else "",
            s.email or "",
            s.mobile or "",
            s.verification_status,
            s.quality_score
        ])

    output.seek(0)
    return output.getvalue(), len(students)

@router.get("/reports/export.csv", tags=["Reports & Export"])
def export_students_csv(institution_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Export institutional student roster as standard compliance CSV."""
    csv_content, count = generate_csv_stream(institution_id, db)

    audit = AuditEvent(
        actor_label="Reporting System",
        action="EXPORT_CSV_DOWNLOADED",
        entity_type="Student",
        entity_id=institution_id or "ALL",
        details_json=f'{{"exported_count": {count}}}'
    )
    db.add(audit)
    db.commit()

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=institutional_students_export.csv"}
    )

# Backward compatibility route
@router.get("/reports/export/students-csv", tags=["Reports & Export"])
def export_students_csv_compat(institution_id: Optional[str] = None, db: Session = Depends(get_db)):
    return export_students_csv(institution_id=institution_id, db=db)
