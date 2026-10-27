from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.duplicate import CrossInstitutionMatch
from backend.app.models.case import ReviewCase
from backend.app.models.audit import AuditLog
from backend.app.schemas.student import CrossInstitutionMatchResponse

router = APIRouter()

@router.get("/duplicates/matches", response_model=List[CrossInstitutionMatchResponse], tags=["Duplicate Detection"])
def get_duplicate_matches(db: Session = Depends(get_db)):
    """Retrieve cross-institution duplicate enrollment matches and conflict detections."""
    return db.query(CrossInstitutionMatch).order_by(CrossInstitutionMatch.created_at.desc()).all()

@router.post("/duplicates/scan", tags=["Duplicate Detection"])
def run_duplicate_scan(db: Session = Depends(get_db)):
    """
    Simulate cross-institution duplicate search against AICTE central registry.
    Identifies students enrolled simultaneously in two full-time regular degree programs without NOC.
    """
    students = db.query(Student).all()
    matches_found = 0

    # Look for known seeded collision or matching patterns
    for s in students:
        # If student has APAAR ID matching simulated collision dataset (e.g. 984210543219)
        if s.apaar_id and s.apaar_id.startswith("9842"):
            existing = db.query(CrossInstitutionMatch).filter(
                CrossInstitutionMatch.primary_student_id == s.id
            ).first()
            if not existing:
                match = CrossInstitutionMatch(
                    primary_student_id=s.id,
                    matched_institution_name="Sardar Patel College of Engineering, Mumbai",
                    matched_institution_code="AICTE-1-109283741",
                    matched_student_name=s.full_name,
                    matched_roll_number="SPCE-2024-MECH-102",
                    matched_program="B.Tech Mechanical Engineering",
                    matched_academic_year=s.academic_year,
                    matched_apaar_id=s.apaar_id,
                    match_type="EXACT_APAAR_COLLISION",
                    confidence_score=99,
                    severity="Critical",
                    status="Open",
                    conflict_summary=f"Concurrent full-time regular degree enrollment detected at SPCE Mumbai with identical APAAR ID {s.apaar_id} without AICTE Transfer/NOC."
                )
                db.add(match)
                matches_found += 1
                s.verification_status = "Flagged"

                # Also automatically create a ReviewCase for triage!
                case = ReviewCase(
                    case_number=f"CASE-2026-00{s.id}",
                    student_id=s.id,
                    case_type="DUAL_ENROLLMENT",
                    priority="Critical",
                    status="Open",
                    assigned_officer="Registrar Verification Cell",
                    summary=f"Critical inter-institutional dual enrollment flagged for {s.full_name} ({s.roll_number}) against SPCE Mumbai."
                )
                db.add(case)

    db.commit()

    audit = AuditLog(
        actor_name="Inter-Institutional Engine",
        actor_role="AICTE Duplicate Daemon",
        action="CROSS_INSTITUTION_SCAN",
        module="Duplicates",
        description=f"Scanned {len(students)} records. Flagged {matches_found} cross-institutional collisions.",
        severity="WARN" if matches_found > 0 else "INFO"
    )
    db.add(audit)
    db.commit()

    return {
        "scanned": len(students),
        "matches_found": matches_found,
        "message": "Duplicate scan complete."
    }
