from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
import json
import time

from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.sandbox import VerificationSandboxLog
from backend.app.models.audit import AuditLog
from backend.app.services.apaar_validator import validate_apaar_syntax

router = APIRouter()

@router.get("/sandbox/logs", tags=["Verification Sandbox"])
def get_sandbox_logs(db: Session = Depends(get_db)):
    """Retrieve simulated sandbox execution history."""
    return db.query(VerificationSandboxLog).order_by(VerificationSandboxLog.timestamp.desc()).all()

@router.post("/sandbox/verify/{student_id}", tags=["Verification Sandbox"])
def trigger_sandbox_verification(
    student_id: int,
    options: dict = Body(default={}),
    db: Session = Depends(get_db)
):
    """
    Execute simulated verification for a student against mock external registries:
    - Simulated APAAR / Academic Bank of Credits Registry
    - Simulated UIDAI Demographic Authentication (Simulated Sandbox - No live UIDAI/CIDR)
    - Simulated AICTE Intake & Approval Portal
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in institutional registry")

    force_fail = options.get("force_fail", False)
    force_mismatch = options.get("force_mismatch", False)

    # 1. Format check
    if not student.apaar_id:
        status = "FAILED_NO_APAAR"
        log = VerificationSandboxLog(
            student_id=student.id,
            provider="SIM_APAAR_REGISTRY",
            endpoint_simulated="https://sandbox.sim.gov.in/apaar/v1/verify",
            status=status,
            match_score=0.0,
            request_summary=f"Lookup roll {student.roll_number} with empty APAAR",
            response_summary="Rejected: Student has no assigned APAAR ID.",
            simulated_latency_ms=120
        )
        db.add(log)
        db.commit()
        return {"status": status, "message": "Verification halted: APAAR ID is missing"}

    valid_syntax, reason = validate_apaar_syntax(student.apaar_id)
    if not valid_syntax:
        status = "INVALID_CHECKSUM"
        student.verification_status = "Flagged"
        log = VerificationSandboxLog(
            student_id=student.id,
            provider="SIM_APAAR_REGISTRY",
            endpoint_simulated="https://sandbox.sim.gov.in/apaar/v1/verify",
            status=status,
            match_score=0.0,
            request_summary=f"APAAR Checksum for {student.apaar_id}",
            response_summary=f"Checksum failure: {reason}",
            simulated_latency_ms=180
        )
        db.add(log)
        db.commit()
        return {"status": status, "message": reason}

    if force_fail:
        status = "SERVICE_TIMEOUT"
        sim_latency = 1250
        resp_summary = "Simulated 504 Gateway Timeout from central registry mock endpoint."
        log = VerificationSandboxLog(
            student_id=student.id,
            provider="SIM_APAAR_REGISTRY",
            endpoint_simulated="https://sandbox.sim.gov.in/apaar/v1/verify",
            status=status,
            match_score=0.0,
            request_summary=f"Simulated test call for APAAR {student.apaar_id}",
            response_summary=resp_summary,
            simulated_latency_ms=sim_latency
        )
        db.add(log)
        db.commit()
        return {
            "status": status,
            "simulated_latency_ms": sim_latency,
            "response": resp_summary,
            "disclaimer": "SIMULATED SANDBOX TEST RESPONSE"
        }

    if force_mismatch:
        status = "DEMOGRAPHIC_MISMATCH"
        student.verification_status = "Flagged"
        resp_summary = f"Mismatched date of birth: Registry reports 2003-04-12, Institute record has {student.date_of_birth}."
        log = VerificationSandboxLog(
            student_id=student.id,
            provider="SIM_UIDAI_AUTH",
            endpoint_simulated="https://sandbox.sim.gov.in/uidai/demographic-auth",
            status=status,
            match_score=0.62,
            request_summary=f"Demographic match for {student.full_name}, DOB: {student.date_of_birth}",
            response_summary=resp_summary,
            simulated_latency_ms=310
        )
        db.add(log)
        db.commit()
        return {
            "status": status,
            "match_score": 0.62,
            "response": resp_summary,
            "disclaimer": "SIMULATED SANDBOX TEST RESPONSE"
        }

    # Successful simulated verification
    status = "SUCCESS"
    student.verification_status = "Verified_Simulated"
    log = VerificationSandboxLog(
        student_id=student.id,
        provider="SIM_APAAR_REGISTRY",
        endpoint_simulated="https://sandbox.sim.gov.in/apaar/v1/verify",
        status=status,
        match_score=1.0,
        request_summary=f"Verify APAAR {student.apaar_id} for {student.full_name}",
        response_summary=f"Simulated match 100%: Name, DOB ({student.date_of_birth}), and Institute Affiliation confirmed.",
        simulated_latency_ms=280
    )
    db.add(log)

    audit = AuditLog(
        actor_name="Sandbox Daemon",
        actor_role="Verification Engine",
        action="SANDBOX_VERIFICATION_SUCCESS",
        module="Verification",
        entity_id=str(student.id),
        description=f"Simulated verification passed for {student.full_name} ({student.roll_number})",
        severity="INFO"
    )
    db.add(audit)
    db.commit()

    return {
        "status": status,
        "student_id": student.id,
        "roll_number": student.roll_number,
        "apaar_id": student.apaar_id,
        "match_score": 1.0,
        "verification_status": student.verification_status,
        "simulated_latency_ms": 280,
        "disclaimer": "SIMULATED SANDBOX VERIFICATION - NOT LIVE GOV API ACCESS"
    }
