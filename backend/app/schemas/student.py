from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import date, datetime

class StudentBase(BaseModel):
    institution_id: Optional[str] = "AICTE-1-432890123"
    institution_student_id: Optional[str] = None
    roll_number: Optional[str] = None  # Alias for institution_student_id
    full_name: str
    date_of_birth: Optional[date] = None
    programme: Optional[str] = "Engineering & Technology"
    academic_year: Optional[str] = "2025-2026"
    apaar_id: Optional[str] = None
    enrollment_status: Optional[str] = "Active"

    # Backward compatible optional fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = "Not Specified"
    father_name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    degree_program: Optional[str] = None
    admission_year: Optional[int] = None
    abc_id: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    institution_student_id: Optional[str] = None
    roll_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    programme: Optional[str] = None
    academic_year: Optional[str] = None
    apaar_id: Optional[str] = None
    enrollment_status: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    verification_status: Optional[str] = None

class DataQualityIssueResponse(BaseModel):
    id: int
    student_id: int
    rule_code: str
    severity: str
    field_name: str
    description: str
    suggested_action: Optional[str] = None
    is_resolved: bool
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CrossInstitutionMatchResponse(BaseModel):
    id: int
    primary_student_id: int
    matched_institution_name: str
    matched_institution_code: str
    matched_student_name: str
    matched_roll_number: str
    matched_program: str
    matched_academic_year: int
    matched_apaar_id: Optional[str] = None
    match_type: str
    confidence_score: int
    severity: str
    status: str
    conflict_summary: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudentResponse(BaseModel):
    id: int
    institution_id: str
    institution_student_id: str
    roll_number: Optional[str] = None
    full_name: str
    date_of_birth: Optional[date] = None
    programme: str
    academic_year: str
    apaar_id: Optional[str] = None
    enrollment_status: str
    verification_status: str
    quality_score: float
    created_at: datetime
    updated_at: datetime
    email: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    degree_program: Optional[str] = None
    abc_id: Optional[str] = None
    aadhaar_vault_ref: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class StudentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[StudentResponse]

class ImportConfirmRequest(BaseModel):
    institution_id: str
    records: List[dict]
