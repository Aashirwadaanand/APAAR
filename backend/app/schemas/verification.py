from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class VerificationRunRequest(BaseModel):
    scenario: str = "success"  # success, unknown_identifier, attribute_mismatch, consent_denied, timeout, rate_limited, unavailable
    student_id: Optional[int] = None
    apaar_id: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None

class VerificationRunResponse(BaseModel):
    id: int
    scenario: str
    service_name: str
    request_json: str
    response_json: str
    outcome: str
    simulated: bool
    duration_ms: int
    created_at: datetime
    student_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
