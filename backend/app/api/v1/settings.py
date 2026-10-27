from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from backend.app.db.session import get_db
from backend.app.models.setting import SystemSetting
from backend.app.models.audit import AuditLog

router = APIRouter()

@router.get("/settings", tags=["Settings"])
def get_settings(db: Session = Depends(get_db)):
    """Retrieve stored institutional and appearance settings."""
    settings_records = db.query(SystemSetting).all()
    result = {}
    for s in settings_records:
        try:
            result[s.key] = json.loads(s.value)
        except Exception:
            result[s.key] = s.value
    return result

@router.put("/settings", tags=["Settings"])
def update_settings(payload: dict, db: Session = Depends(get_db)):
    """Persist system preferences and appearance configurations."""
    for key, val in payload.items():
        record = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        serialized = json.dumps(val) if isinstance(val, (dict, list, bool, int, float)) else str(val)
        if record:
            record.value = serialized
        else:
            record = SystemSetting(key=key, value=serialized)
            db.add(record)

    db.commit()

    audit = AuditLog(
        actor_name="Institutional Admin",
        actor_role="System Administration",
        action="SETTINGS_UPDATED",
        module="Settings",
        description="Updated appearance and institutional sandbox preferences.",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return payload
