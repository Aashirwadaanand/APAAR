from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import json

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.sandbox import VerificationRun
from backend.app.models.audit import AuditEvent
from backend.app.schemas.verification import VerificationRunRequest, VerificationRunResponse
from backend.app.services.sandbox_adapters import verification_service, SCENARIOS

router = APIRouter()

@router.get("/verification/scenarios", tags=["Verification Sandbox"])
def list_verification_scenarios():
    """Return available synthetic sandbox verification scenarios and their specifications."""
    return SCENARIOS

@router.post("/verification/run", response_model=VerificationRunResponse, tags=["Verification Sandbox"])
def run_verification_scenario(payload: VerificationRunRequest, db: Session = Depends(get_db)):
    """
    Execute a controlled, deterministic verification run using sandbox service adapters.
    Simulates identity lookups, academic credit inquiries, or edge-case failure modes safely.
    """
    student_payload = {
        "apaar_id": payload.apaar_id or "",
        "full_name": payload.full_name or "",
        "date_of_birth": payload.date_of_birth or ""
    }

    # If student_id provided, populate details from DB
    if payload.student_id:
        student = db.query(Student).filter(Student.id == payload.student_id).first()
        if student:
            student_payload["apaar_id"] = student.apaar_id or ""
            student_payload["full_name"] = student.full_name
            student_payload["date_of_birth"] = str(student.date_of_birth) if student.date_of_birth else ""

    try:
        execution = verification_service.run_scenario(payload.scenario, student_payload, db=db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    matched_student_id = execution.get("response", {}).get("student_id") or payload.student_id

    # Persist VerificationRun in database
    run_record = VerificationRun(
        scenario=payload.scenario,
        service_name=execution["service_name"],
        request_json=json.dumps(student_payload),
        response_json=json.dumps(execution["response"]),
        outcome=execution["outcome"],
        simulated=True,
        duration_ms=execution["duration_ms"],
        student_id=matched_student_id
    )
    db.add(run_record)
    db.flush()

    audit = AuditEvent(
        actor_label="Sandbox Harness",
        action="VERIFICATION_RUN_EXECUTED",
        entity_type="VerificationRun",
        entity_id=str(run_record.id or 0),
        details_json=json.dumps({
            "scenario": payload.scenario,
            "outcome": execution["outcome"],
            "service": execution["service_name"],
            "apaar_id": student_payload.get("apaar_id"),
            "student_id": matched_student_id,
            "simulated": True
        })
    )
    db.add(audit)
    db.commit()
    db.refresh(run_record)

    return run_record

@router.get("/verification/runs", response_model=List[VerificationRunResponse], tags=["Verification Sandbox"])
def list_verification_runs(
    limit: int = Query(50, ge=1, le=200),
    scenario: str = None,
    db: Session = Depends(get_db)
):
    """Retrieve history of simulated verification runs."""
    query = db.query(VerificationRun)
    if scenario:
        query = query.filter(VerificationRun.scenario == scenario)
    return query.order_by(VerificationRun.created_at.desc()).limit(limit).all()
