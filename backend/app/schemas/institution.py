from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class InstitutionBase(BaseModel):
    institution_code: str
    institution_name: str
    approved_intake: int = 60
    programme: str = "Engineering & Technology"
    academic_year: str = "2025-2026"

class InstitutionCreate(InstitutionBase):
    id: Optional[str] = None
    state: Optional[str] = "Maharashtra"
    district: Optional[str] = "Pune"

class InstitutionResponse(InstitutionBase):
    id: str
    state: Optional[str] = None
    district: Optional[str] = None
    status: Optional[str] = "Active"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
