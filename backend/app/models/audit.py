from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import synonym
from datetime import datetime
from backend.app.db.session import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor_label = Column(String, default="Institutional Admin", nullable=False)
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, default="System", nullable=False, index=True)
    entity_id = Column(String, nullable=True)
    details_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Columns / Synonyms for backward compatibility
    actor_name = Column(String, default="Institutional Admin", nullable=True)
    actor_role = Column(String, default="Compliance Officer", nullable=True)
    module = Column(String, default="Registry", nullable=True)
    description = Column(Text, default="", nullable=True)
    severity = Column(String, default="INFO", nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

# Compatibility alias
AuditLog = AuditEvent
