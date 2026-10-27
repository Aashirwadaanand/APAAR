from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.db.session import get_db
from backend.app.models.audit import AuditLog

router = APIRouter()

@router.get("/audit/logs", tags=["Audit Trail"])
def get_audit_logs(
    module: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve immutable audit trail log records."""
    query = db.query(AuditLog)
    if module:
        query = query.filter(AuditLog.module == module)
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
