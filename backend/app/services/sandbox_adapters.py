"""
Sandbox Service Adapters for APAAR Verification Simulation.

IMPORTANT ARCHITECTURAL DISCLAIMER:
These adapters are strictly local synthetic mock simulations for evaluation and testing.
They DO NOT connect to live government infrastructure, UIDAI, or production CIDR/ABC APIs.
All lookups query the local synthetic database or mock adapter endpoints.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import time
from backend.app.models.student import Student

SCENARIOS = {
    "normal": {
        "label": "Direct Registry Lookup (Data-Driven)",
        "description": "Compares submitted APAAR ID, full name, and birth date dynamically against synthetic student registry records.",
        "expected_outcome": "DATA_DRIVEN",
        "default_service": "MOCK_REGISTRY"
    },
    "success": {
        "label": "Valid Synthetic Registry Match",
        "description": "Synthetic registry confirms 100% demographic identity and academic affiliation.",
        "expected_outcome": "MATCHED",
        "default_service": "MOCK_REGISTRY"
    },
    "unknown_identifier": {
        "label": "Unknown / Unassigned Identifier",
        "description": "Valid format 12-digit APAAR ID was not located in the synthetic institutional registry.",
        "expected_outcome": "NOT_FOUND",
        "default_service": "MOCK_REGISTRY"
    },
    "attribute_mismatch": {
        "label": "Attribute Discrepancy (DOB / Name Mismatch)",
        "description": "Identifier exists in synthetic registry but provided name or birth date does not match stored record.",
        "expected_outcome": "MISMATCH",
        "default_service": "MOCK_REGISTRY"
    },
    "consent_denied": {
        "label": "Student Consent Denied / Revoked",
        "description": "Verification rejected due to absence of student demographic consent token.",
        "expected_outcome": "CONSENT_DENIED",
        "default_service": "MOCK_REGISTRY"
    },
    "timeout": {
        "label": "Simulated Central Gateway Timeout",
        "description": "Controlled deterministic simulated timeout (HTTP 504) for testing resilience and timeout handlers.",
        "expected_outcome": "TIMEOUT",
        "default_service": "FAILURE_SIMULATION"
    },
    "rate_limited": {
        "label": "Institutional Query Rate Limited (429)",
        "description": "Simulated institutional hourly sandbox quota exceeded.",
        "expected_outcome": "RATE_LIMITED",
        "default_service": "FAILURE_SIMULATION"
    },
    "unavailable": {
        "label": "Service Unavailable / Outage (503)",
        "description": "Central registry mock is currently undergoing scheduled simulated maintenance.",
        "expected_outcome": "SERVICE_UNAVAILABLE",
        "default_service": "FAILURE_SIMULATION"
    }
}

class BaseServiceAdapter(ABC):
    @abstractmethod
    def execute(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        pass

class MockRegistryAdapter(BaseServiceAdapter):
    """Simulates National APAAR / ABC Directory service using synthetic database records."""
    service_name = "MOCK_REGISTRY"

    def execute(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        if scenario == "consent_denied":
            return {
                "service": self.service_name,
                "status_code": 403,
                "outcome": "CONSENT_DENIED",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "error": {
                    "code": "CONSENT_NOT_GRANTED",
                    "message": "Student has not provided or has revoked consent for institutional demographic verification."
                }
            }

        raw_apaar = str(payload.get("apaar_id") or "").strip()
        submitted_name = str(payload.get("full_name") or "").strip()
        submitted_dob = str(payload.get("date_of_birth") or "").strip()
        clean_apaar = raw_apaar.replace("-", "").replace(" ", "")

        # If a database session is provided, execute data-driven verification against real records
        if db is not None:
            student = None
            if clean_apaar:
                student = db.query(Student).filter(
                    (Student.apaar_id == clean_apaar) | (Student.apaar_id == raw_apaar)
                ).first()
            elif payload.get("student_id"):
                student = db.query(Student).filter(Student.id == payload.get("student_id")).first()

            if not student:
                return {
                    "service": self.service_name,
                    "status_code": 404,
                    "outcome": "NOT_FOUND",
                    "simulated": True,
                    "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                    "error": {
                        "code": "IDENTIFIER_NOT_IN_REGISTRY",
                        "message": f"Identifier '{raw_apaar or 'EMPTY'}' was not located in the synthetic institutional student registry."
                    },
                    "comparison": {
                        "apaar_id_found": False,
                        "full_name_match": None,
                        "dob_match": None,
                        "details": f"Identifier '{raw_apaar}' does not exist in any registered institutional records."
                    }
                }

            # Student record found: perform field-by-field comparison
            stored_name = (student.full_name or "").strip()
            stored_dob = str(student.date_of_birth).strip() if student.date_of_birth else ""

            stored_norm_name = " ".join(stored_name.split()).lower()
            submitted_norm_name = " ".join(submitted_name.split()).lower()
            stored_norm_dob = stored_dob.replace("/", "-").strip()
            submitted_norm_dob = submitted_dob.replace("/", "-").strip()

            name_match = (stored_norm_name == submitted_norm_name) if submitted_norm_name else True
            dob_match = (stored_norm_dob == submitted_norm_dob) if submitted_norm_dob else True

            # If user provided neither name nor DOB, require at least matching what was provided
            if not submitted_norm_name and not submitted_norm_dob:
                name_match = True
                dob_match = True

            discrepant_fields = []
            if submitted_norm_name and not (stored_norm_name == submitted_norm_name):
                discrepant_fields.append("full_name")
            if submitted_norm_dob and not (stored_norm_dob == submitted_norm_dob):
                discrepant_fields.append("date_of_birth")

            if len(discrepant_fields) == 0:
                outcome = "MATCHED"
                match_score = 1.0
                status_code = 200
                explanation = "Full demographic and date of birth match confirmed against synthetic institutional registry record."
            else:
                outcome = "MISMATCH"
                match_score = 0.5 if (name_match != dob_match) else 0.0
                status_code = 200
                diff_label = " and ".join([f.replace("_", " ") for f in discrepant_fields])
                explanation = f"Demographic discrepancy: Submitted {diff_label} does not match the synthetic registry record."

            return {
                "service": self.service_name,
                "status_code": status_code,
                "outcome": outcome,
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "data": {
                    "apaar_id": student.apaar_id,
                    "institution_student_id": student.institution_student_id,
                    "registry_status": student.enrollment_status or "ACTIVE",
                    "match_score": match_score,
                    "full_name_match": name_match,
                    "dob_match": dob_match,
                    "simulated_token": f"sim_token_{student.apaar_id[-4:] if len(student.apaar_id)>=4 else '0000'}"
                },
                "comparison": {
                    "apaar_id_found": True,
                    "full_name_match": name_match,
                    "dob_match": dob_match,
                    "discrepant_fields": discrepant_fields,
                    "details": explanation
                },
                "student_id": student.id
            }

        # Fallback when db session is not injected (standalone unit test isolation)
        if scenario == "unknown_identifier":
            return {
                "service": self.service_name,
                "status_code": 404,
                "outcome": "NOT_FOUND",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "error": {
                    "code": "IDENTIFIER_NOT_IN_REGISTRY",
                    "message": f"Identifier {raw_apaar} has not been issued or mapped in the mock registry."
                },
                "comparison": {
                    "apaar_id_found": False,
                    "full_name_match": None,
                    "dob_match": None,
                    "details": "Mock identifier not found in registry."
                }
            }
        elif scenario == "attribute_mismatch":
            return {
                "service": self.service_name,
                "status_code": 200,
                "outcome": "MISMATCH",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "data": {
                    "apaar_id": raw_apaar,
                    "registry_status": "ACTIVE",
                    "match_score": 0.45,
                    "full_name_match": True,
                    "dob_match": False,
                    "simulated_token": f"sim_token_{raw_apaar[-4:] if len(raw_apaar)>=4 else '0000'}"
                },
                "comparison": {
                    "apaar_id_found": True,
                    "full_name_match": True,
                    "dob_match": False,
                    "discrepant_fields": ["date_of_birth"],
                    "details": "Submitted date of birth does not match mock registry record."
                }
            }
        else:
            return {
                "service": self.service_name,
                "status_code": 200,
                "outcome": "MATCHED",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "data": {
                    "apaar_id": raw_apaar,
                    "registry_status": "ACTIVE_VERIFIED",
                    "match_score": 1.0,
                    "full_name_match": True,
                    "dob_match": True,
                    "simulated_token": f"sim_token_{raw_apaar[-4:] if len(raw_apaar)>=4 else '0000'}"
                },
                "comparison": {
                    "apaar_id_found": True,
                    "full_name_match": True,
                    "dob_match": True,
                    "discrepant_fields": [],
                    "details": "Full demographic and date of birth match confirmed."
                }
            }

class MockAcademicRecordAdapter(BaseServiceAdapter):
    """Simulates Academic Bank of Credits (ABC) repository."""
    service_name = "MOCK_ACADEMIC_RECORD"

    def execute(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        apaar_id = payload.get("apaar_id", "")
        return {
            "service": self.service_name,
            "status_code": 200,
            "outcome": "MATCHED",
            "simulated": True,
            "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
            "data": {
                "abc_account_id": f"ABC-{apaar_id[:3]}-{apaar_id[3:6] if len(apaar_id)>=6 else '000'}",
                "total_credits_accumulated": 48,
                "verified_institutions_count": 1
            }
        }

class MockInstitutionalSubmissionAdapter(BaseServiceAdapter):
    """Simulates institutional batch packet submission to regulatory gateway."""
    service_name = "MOCK_INSTITUTIONAL_SUBMISSION"

    def execute(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        return {
            "service": self.service_name,
            "status_code": 202,
            "outcome": "ACCEPTED",
            "simulated": True,
            "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
            "submission_receipt_id": f"REC-SIM-{int(time.time())}"
        }

class FailureSimulationAdapter(BaseServiceAdapter):
    """Simulates deterministic controlled edge-case failures."""
    service_name = "FAILURE_SIMULATION"

    def execute(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        if scenario == "timeout":
            return {
                "service": self.service_name,
                "status_code": 504,
                "outcome": "TIMEOUT",
                "simulated": True,
                "simulated_timeout": True,
                "distinguishable_from_network_error": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "error": {
                    "code": "SIMULATED_GATEWAY_TIMEOUT",
                    "message": "Simulated external service timeout after 500ms threshold (Deterministic test scenario)."
                }
            }
        elif scenario == "rate_limited":
            return {
                "service": self.service_name,
                "status_code": 429,
                "outcome": "RATE_LIMITED",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retry_after_seconds": 30,
                    "message": "Mock verification rate limit exceeded (100 req/min)."
                }
            }
        elif scenario == "unavailable":
            return {
                "service": self.service_name,
                "status_code": 503,
                "outcome": "SERVICE_UNAVAILABLE",
                "simulated": True,
                "disclaimer": "SYNTHETIC_SANDBOX_DEMO: Zero connection to live government or UIDAI infrastructure.",
                "error": {
                    "code": "SERVICE_OFFLINE",
                    "message": "Simulated central service maintenance outage (HTTP 503)."
                }
            }
        raise ValueError(f"Scenario {scenario} not supported by FailureSimulationAdapter")

class VerificationService:
    def __init__(self):
        self.registry_adapter = MockRegistryAdapter()
        self.academic_adapter = MockAcademicRecordAdapter()
        self.submission_adapter = MockInstitutionalSubmissionAdapter()
        self.failure_adapter = FailureSimulationAdapter()

    def list_scenarios(self) -> Dict[str, Any]:
        return SCENARIOS

    def run_scenario(self, scenario: str, payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        if scenario not in SCENARIOS:
            if scenario in ["normal", "data_driven", "default"]:
                scenario = "normal"
            else:
                raise ValueError(f"Unknown scenario '{scenario}'. Available: {list(SCENARIOS.keys())}")

        start_time = time.time()
        
        # Route to appropriate adapter
        if scenario in ["timeout", "rate_limited", "unavailable"]:
            adapter = self.failure_adapter
            response = adapter.execute(scenario, payload, db=db)
        else:
            adapter = self.registry_adapter
            response = adapter.execute(scenario, payload, db=db)

        duration_ms = int((time.time() - start_time) * 1000)
        # Ensure minimum readable simulation duration
        if duration_ms < 50:
            duration_ms = 120

        return {
            "scenario": scenario,
            "service_name": adapter.service_name,
            "request_payload": payload,
            "response": response,
            "outcome": response.get("outcome", "UNKNOWN"),
            "simulated": True,
            "duration_ms": duration_ms
        }

verification_service = VerificationService()

