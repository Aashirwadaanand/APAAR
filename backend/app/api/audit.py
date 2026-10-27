from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.app.db.session import get_db
from backend.app.models.audit import AuditEvent
from backend.app.schemas.audit import AuditEventResponse

router = APIRouter()

@router.get("/audit", response_model=List[AuditEventResponse], tags=["Audit Trail"])
def list_audit_events(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve immutable audit ledger events with entity and action filtering."""
    query = db.query(AuditEvent)
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if action:
        query = query.filter(AuditEvent.action == action)
    return query.order_by(AuditEvent.created_at.desc()).limit(limit).all()

# Preserved backward-compatible endpoint for Prompt 1 frontend
@router.get("/audit/logs", response_model=List[AuditEventResponse], tags=["Audit Trail"])
def list_audit_logs_compat(
    module: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if module:
        query = query.filter(AuditEvent.entity_type == module)
    return query.order_by(AuditEvent.created_at.desc()).limit(limit).all()
