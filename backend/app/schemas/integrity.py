from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict, List
from datetime import datetime

class IntegrityCaseResponse(BaseModel):
    id: int
    case_type: str
    severity: str
    status: str
    institution_id: Optional[str] = None
    student_id: Optional[int] = None
    summary: str
    evidence_json: str
    recommended_action: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CaseResolveRequest(BaseModel):
    resolution_note: str
    status: str = "RESOLVED"  # RESOLVED or DISMISSED

class IntegrityScanRequest(BaseModel):
    institution_id: Optional[str] = None
    intake_policy: Optional[Dict[str, Any]] = None

class IntegrityScanResponse(BaseModel):
    scanned_students: int
    scanned_institutions: int
    findings_count: int
    new_cases_created: int
    existing_cases_updated: int
    message: str
