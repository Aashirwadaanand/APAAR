from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from backend.app.db.session import Base

class CrossInstitutionMatch(Base):
    __tablename__ = "cross_institution_matches"

    id = Column(Integer, primary_key=True, index=True)
    primary_student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    
    # Matched external institution student record reference
    matched_institution_name = Column(String, nullable=False)
    matched_institution_code = Column(String, nullable=False)
    matched_student_name = Column(String, nullable=False)
    matched_roll_number = Column(String, nullable=False)
    matched_program = Column(String, nullable=False)
    matched_academic_year = Column(Integer, nullable=False)
    matched_apaar_id = Column(String, nullable=True)
    
    match_type = Column(String, nullable=False)  # "EXACT_APAAR_COLLISION", "DEMOGRAPHIC_HIGH_CONFIDENCE", "NAME_DOB_PHONE"
    confidence_score = Column(Integer, default=95)  # 0 - 100%
    severity = Column(String, default="Critical")  # "Critical", "Warning", "Info"
    status = Column(String, default="Open")  # "Open", "Under_Review", "Confirmed_Duplicate", "Cleared"
    conflict_summary = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
