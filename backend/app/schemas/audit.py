from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AuditEventResponse(BaseModel):
    id: int
    actor_label: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details_json: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
