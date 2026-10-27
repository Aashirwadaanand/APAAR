from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.db.session import get_db
from backend.app.models.institution import Institution
from backend.app.models.audit import AuditEvent
from backend.app.schemas.institution import InstitutionCreate, InstitutionResponse

router = APIRouter()

@router.get("/institutions", response_model=List[InstitutionResponse], tags=["Institutions"])
def list_institutions(db: Session = Depends(get_db)):
    """Retrieve all registered AICTE institutions."""
    return db.query(Institution).order_by(Institution.institution_name.asc()).all()

@router.post("/institutions", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED, tags=["Institutions"])
def create_institution(payload: InstitutionCreate, db: Session = Depends(get_db)):
    """Register a new institution node in the integrity platform."""
    # Check if institution code already exists
    existing = db.query(Institution).filter(Institution.institution_code == payload.institution_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Institution code '{payload.institution_code}' already exists.")

    inst_id = payload.id or f"AICTE-{payload.institution_code}"
    inst = Institution(
        id=inst_id,
        institution_code=payload.institution_code,
        institution_name=payload.institution_name,
        approved_intake=payload.approved_intake,
        programme=payload.programme,
        academic_year=payload.academic_year,
        state=payload.state or "Maharashtra",
        district=payload.district or "Pune",
        status="Active"
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)

    audit = AuditEvent(
        actor_label="Regulatory Administrator",
        action="INSTITUTION_REGISTERED",
        entity_type="Institution",
        entity_id=inst.id,
        details_json=f'{{"code": "{inst.institution_code}", "intake": {inst.approved_intake}}}'
    )
    db.add(audit)
    db.commit()

    return inst
