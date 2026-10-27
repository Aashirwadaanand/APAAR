from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import synonym
from datetime import datetime
from backend.app.db.session import Base

class VerificationRun(Base):
    __tablename__ = "verification_runs"

    id = Column(Integer, primary_key=True, index=True)
    scenario = Column(String, default="success", nullable=False, index=True)
    service_name = Column(String, default="MOCK_REGISTRY", nullable=False, index=True)
    request_json = Column(Text, nullable=False, default="{}")
    response_json = Column(Text, nullable=False, default="{}")
    outcome = Column(String, default="MATCHED", nullable=False, index=True)
    simulated = Column(Boolean, default=True, nullable=False)
    duration_ms = Column(Integer, default=150, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Extended columns for full backward compatibility
    student_id = Column(Integer, nullable=True, index=True)
    provider = Column(String, nullable=True)
    endpoint_simulated = Column(String, nullable=True)
    status = Column(String, nullable=True)
    match_score = Column(Float, default=1.0)
    request_summary = Column(Text, nullable=True)
    response_summary = Column(Text, nullable=True)
    simulated_latency_ms = Column(Integer, default=150)
    timestamp = synonym("created_at")

# Compatibility alias
VerificationSandboxLog = VerificationRun
