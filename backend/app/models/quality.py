from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from datetime import datetime
from backend.app.db.session import Base

class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    rule_code = Column(String, nullable=False, index=True)  # e.g., "ERR_APAAR_CHECKSUM", "WARN_AGE_DISCREPANCY"
    severity = Column(String, nullable=False)  # "Critical", "Warning", "Info"
    field_name = Column(String, nullable=False)  # "apaar_id", "date_of_birth", etc.
    description = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
