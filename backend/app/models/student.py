from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, UniqueConstraint
from datetime import datetime
from backend.app.db.session import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    institution_student_id = Column(String, nullable=False, index=True)  # Institutional Roll / Student ID
    
    # apaar_id is intentionally NOT globally unique, enabling detection of intra/inter-institution duplicates
    apaar_id = Column(String, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    programme = Column(String, default="Engineering & Technology", nullable=False)
    academic_year = Column(String, default="2025-2026", nullable=False)
    enrollment_status = Column(String, default="Active", nullable=False)  # Active, Suspended, Graduated, Transferred
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Preserved backward-compatible fields for UI & search
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    gender = Column(String, default="Not Specified", nullable=True)
    father_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    department = Column(String, default="Engineering", nullable=True)
    degree_program = Column(String, default="B.Tech", nullable=True)
    admission_year = Column(Integer, default=2024, nullable=True)
    abc_id = Column(String, nullable=True)
    aadhaar_vault_ref = Column(String, nullable=True)
    verification_status = Column(String, default="Unverified")
    quality_score = Column(Float, default=100.0)

    __table_args__ = (
        UniqueConstraint('institution_id', 'institution_student_id', name='uq_institution_student'),
    )

    # Property alias for roll_number
    @property
    def roll_number(self) -> str:
        return self.institution_student_id

    @roll_number.setter
    def roll_number(self, value: str):
        self.institution_student_id = value
