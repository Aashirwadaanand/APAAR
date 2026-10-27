from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from backend.app.db.session import Base

class IntegrityCase(Base):
    __tablename__ = "integrity_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_type = Column(String, nullable=False, index=True)  # e.g., "DUPLICATE_APAAR_INTRA_INSTITUTION", "CROSS_INSTITUTION_COLLISION", "INTAKE_EXCEEDED"
    severity = Column(String, default="WARNING", nullable=False, index=True)  # "CRITICAL", "WARNING", "INFO"
    status = Column(String, default="OPEN", nullable=False, index=True)  # "OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"
    
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)  # Nullable when concerning multiple records
    
    summary = Column(Text, nullable=False)
    evidence_json = Column(Text, default="{}", nullable=False)  # Safe JSON string serialization
    recommended_action = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)

    # Backward compatibility properties for ReviewCase mapping
    @property
    def case_number(self) -> str:
        return f"CASE-2026-{self.id:04d}"

    @property
    def priority(self) -> str:
        return self.severity

    @property
    def assigned_officer(self) -> str:
        return "Verification Cell Officer"

# Compatibility alias
ReviewCase = IntegrityCase
