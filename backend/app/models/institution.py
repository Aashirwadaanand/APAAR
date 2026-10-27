from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from backend.app.db.session import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, index=True)  # e.g., "AICTE-1-432890123"
    institution_code = Column(String, unique=True, index=True, nullable=False)
    institution_name = Column(String, nullable=False)
    approved_intake = Column(Integer, default=60, nullable=False)
    programme = Column(String, default="Engineering & Technology", nullable=False)
    academic_year = Column(String, default="2025-2026", nullable=False)
    
    # Preserved backward-compatible fields
    state = Column(String, default="Maharashtra", nullable=True)
    district = Column(String, default="Pune", nullable=True)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Property aliases for backward compatibility
    @property
    def aicte_code(self) -> str:
        return self.institution_code

    @property
    def name(self) -> str:
        return self.institution_name
