from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.quality import DataQualityIssue
from backend.app.models.audit import AuditLog
from backend.app.schemas.student import DataQualityIssueResponse
from backend.app.services.apaar_validator import validate_apaar_syntax

router = APIRouter()

@router.get("/quality/issues", response_model=List[DataQualityIssueResponse], tags=["Quality Engine"])
def get_quality_issues(db: Session = Depends(get_db)):
    """Retrieve all data quality issues identified by the integrity engine."""
    return db.query(DataQualityIssue).order_by(DataQualityIssue.detected_at.desc()).all()

@router.post("/quality/scan", tags=["Quality Engine"])
def run_quality_scan(db: Session = Depends(get_db)):
    """
    Execute comprehensive integrity scan across institutional student database:
    - 12-digit APAAR Verhoeff Checksum validity
    - Age vs Degree Program sanity validation
    - Mandatory AICTE compliance fields
    """
    students = db.query(Student).all()
    issues_found = 0

    for s in students:
        deductions = 0
        
        # Rule 1: APAAR Checksum & Format Validation
        if s.apaar_id:
            valid, reason = validate_apaar_syntax(s.apaar_id)
            if not valid:
                deductions += 40
                existing = db.query(DataQualityIssue).filter(
                    DataQualityIssue.student_id == s.id,
                    DataQualityIssue.rule_code == "ERR_APAAR_CHECKSUM"
                ).first()
                if not existing:
                    issue = DataQualityIssue(
                        student_id=s.id,
                        rule_code="ERR_APAAR_CHECKSUM",
                        severity="Critical",
                        field_name="apaar_id",
                        description=f"Invalid APAAR syntax on roll {s.institution_student_id}: {reason}",
                        suggested_action="Obtain revised 12-digit APAAR account card or request re-enrollment from student."
                    )
                    db.add(issue)
                    issues_found += 1
        else:
            deductions += 15

        # Rule 2: Age vs Academic Year Sanity Check
        if s.date_of_birth:
            admission_yr = s.admission_year or 2024
            age_at_admission = admission_yr - s.date_of_birth.year
            if age_at_admission < 16 or age_at_admission > 50:
                deductions += 25
                existing = db.query(DataQualityIssue).filter(
                    DataQualityIssue.student_id == s.id,
                    DataQualityIssue.rule_code == "WARN_AGE_DISCREPANCY"
                ).first()
                if not existing:
                    issue = DataQualityIssue(
                        student_id=s.id,
                        rule_code="WARN_AGE_DISCREPANCY",
                        severity="Warning",
                        field_name="date_of_birth",
                        description=f"Unusual age at admission ({age_at_admission} yrs) for {s.degree_program or s.programme}",
                        suggested_action="Verify secondary school leaving certificate DOB against admission dossier."
                    )
                    db.add(issue)
                    issues_found += 1

        # Rule 3: Mobile & Contact Completeness
        if not s.mobile or len(s.mobile.strip()) < 10:
            deductions += 20
            existing = db.query(DataQualityIssue).filter(
                DataQualityIssue.student_id == s.id,
                DataQualityIssue.rule_code == "ERR_MISSING_MOBILE"
            ).first()
            if not existing:
                issue = DataQualityIssue(
                    student_id=s.id,
                    rule_code="ERR_MISSING_MOBILE",
                    severity="Warning",
                    field_name="mobile",
                    description=f"Invalid or incomplete 10-digit mobile number for {s.institution_student_id}",
                    suggested_action="Update student emergency and SMS notification contact."
                )
                db.add(issue)
                issues_found += 1

        new_score = max(0.0, float(100 - deductions))
        s.quality_score = new_score

    db.commit()

    # Log scan execution
    audit = AuditLog(
        actor_name="Integrity Engine",
        actor_role="Automated Daemon",
        action="QUALITY_SCAN_EXECUTED",
        module="Quality",
        description=f"Scanned {len(students)} student records. Discovered {issues_found} new issues.",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return {
        "scanned": len(students),
        "issues_found": issues_found,
        "message": "Quality scan completed successfully."
    }
