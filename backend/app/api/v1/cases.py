from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from backend.app.db.session import get_db
from backend.app.models.case import ReviewCase
from backend.app.models.audit import AuditLog

router = APIRouter()

@router.get("/cases", tags=["Review Queue"])
def list_cases(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve exception cases in the review queue."""
    query = db.query(ReviewCase)
    if status:
        query = query.filter(ReviewCase.status == status)
    return query.order_by(ReviewCase.created_at.desc()).all()

@router.patch("/cases/{case_id}", tags=["Review Queue"])
def resolve_case(case_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update case status, resolution findings, and log to compliance trail."""
    case = db.query(ReviewCase).filter(ReviewCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Review case not found")

    if "status" in payload:
        case.status = payload["status"]
    if "findings" in payload:
        case.findings = payload["findings"]
    if "action_taken" in payload:
        case.action_taken = payload["action_taken"]
    if "resolution_justification" in payload:
        case.resolution_justification = payload["resolution_justification"]

    if case.status.startswith("Resolved"):
        case.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(case)

    audit = AuditLog(
        actor_name="Compliance Officer",
        actor_role="Triage Cell",
        action="CASE_UPDATED",
        module="Review_Queue",
        entity_id=str(case.id),
        description=f"Case {case.case_number} status updated to {case.status}",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return case
