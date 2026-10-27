"""
Sandbox Service Adapters for APAAR Verification Simulation.

IMPORTANT ARCHITECTURAL DISCLAIMER:
These adapters are strictly local synthetic mock simulations for evaluation and testing.
They DO NOT connect to live government infrastructure, UIDAI, or production CIDR/ABC APIs.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import time

SCENARIOS = {
    "success": {
        "label": "Successful Demographic & Registry Match",
        "description": "Simulated external registry confirms 100% demographic identity and academic affiliation.",
        "expected_outcome": "MATCHED",
        "default_service": "MOCK_REGISTRY"
    },
    "unknown_identifier": {
        "label": "Unknown / Unassigned Identifier",
        "description": "Valid format 12-digit APAAR ID was not located in the simulated national registry.",
        "expected_outcome": "NOT_FOUND",
        "default_service": "MOCK_REGISTRY"
    },
    "attribute_mismatch": {
        "label": "Attribute Discrepancy (DOB / Name)",
        "description": "Identifier exists in mock registry but declared birth date or spelling does not match.",
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
        "description": "Controlled deterministic simulated timeout. Explicitly tagged to distinguish from true network loss.",
        "expected_outcome": "TIMEOUT",
        "default_service": "FAILURE_SIMULATION"
    },
    "rate_limited": {
        "label": "Institutional Query Rate Limited (429)",
        "description": "Institutional hourly sandbox quota exceeded.",
        "expected_outcome": "RATE_LIMITED",
        "default_service": "FAILURE_SIMULATION"
    },
    "unavailable": {
        "label": "Service Unavailable / Outage (503)",
        "description": "Central registry mock is currently undergoing scheduled maintenance.",
        "expected_outcome": "SERVICE_UNAVAILABLE",
        "default_service": "FAILURE_SIMULATION"
    }
}

class BaseServiceAdapter(ABC):
    @abstractmethod
    def execute(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        pass

class MockRegistryAdapter(BaseServiceAdapter):
    """Simulates National APAAR / ABC Directory service."""
    service_name = "MOCK_REGISTRY"

    def execute(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        apaar_id = payload.get("apaar_id", "")
        student_name = payload.get("full_name", "")
        dob = payload.get("date_of_birth", "")

        if scenario == "success":
            return {
                "service": self.service_name,
                "status_code": 200,
                "outcome": "MATCHED",
                "simulated": True,
                "data": {
                    "apaar_id": apaar_id,
                    "registry_status": "ACTIVE_VERIFIED",
                    "match_score": 1.0,
                    "full_name_match": True,
                    "dob_match": True,
                    "simulated_token": f"sim_token_{apaar_id[-4:] if len(apaar_id) >= 4 else '0000'}"
                }
            }
        elif scenario == "unknown_identifier":
            return {
                "service": self.service_name,
                "status_code": 404,
                "outcome": "NOT_FOUND",
                "simulated": True,
                "error": {
                    "code": "IDENTIFIER_NOT_IN_REGISTRY",
                    "message": f"Identifier {apaar_id} has not been issued or mapped in the mock registry."
                }
            }
        elif scenario == "attribute_mismatch":
            return {
                "service": self.service_name,
                "status_code": 200,
                "outcome": "MISMATCH",
                "simulated": True,
                "data": {
                    "apaar_id": apaar_id,
                    "registry_status": "ACTIVE",
                    "match_score": 0.45,
                    "full_name_match": True,
                    "dob_match": False,
                    "discrepancy_field": "date_of_birth",
                    "registry_recorded_dob": "2003-01-01",
                    "provided_dob": str(dob)
                }
            }
        elif scenario == "consent_denied":
            return {
                "service": self.service_name,
                "status_code": 403,
                "outcome": "CONSENT_DENIED",
                "simulated": True,
                "error": {
                    "code": "CONSENT_NOT_GRANTED",
                    "message": "Student has not provided or has revoked consent for institutional demographic verification."
                }
            }
        raise ValueError(f"Scenario {scenario} not handled by MockRegistryAdapter")

class MockAcademicRecordAdapter(BaseServiceAdapter):
    """Simulates Academic Bank of Credits (ABC) repository."""
    service_name = "MOCK_ACADEMIC_RECORD"

    def execute(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        apaar_id = payload.get("apaar_id", "")
        return {
            "service": self.service_name,
            "status_code": 200,
            "outcome": "MATCHED",
            "simulated": True,
            "data": {
                "abc_account_id": f"ABC-{apaar_id[:3]}-{apaar_id[3:6] if len(apaar_id)>=6 else '000'}",
                "total_credits_accumulated": 48,
                "verified_institutions_count": 1
            }
        }

class MockInstitutionalSubmissionAdapter(BaseServiceAdapter):
    """Simulates institutional batch packet submission to regulatory gateway."""
    service_name = "MOCK_INSTITUTIONAL_SUBMISSION"

    def execute(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "service": self.service_name,
            "status_code": 202,
            "outcome": "ACCEPTED",
            "simulated": True,
            "submission_receipt_id": f"REC-SIM-{int(time.time())}"
        }

class FailureSimulationAdapter(BaseServiceAdapter):
    """Simulates deterministic controlled edge-case failures."""
    service_name = "FAILURE_SIMULATION"

    def execute(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if scenario == "timeout":
            # Controlled deterministic simulation distinguishable from live network outage
            return {
                "service": self.service_name,
                "status_code": 504,
                "outcome": "TIMEOUT",
                "simulated": True,
                "simulated_timeout": True,
                "distinguishable_from_network_error": True,
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

    def run_scenario(self, scenario: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if scenario not in SCENARIOS:
            raise ValueError(f"Unknown scenario '{scenario}'. Available: {list(SCENARIOS.keys())}")

        start_time = time.time()
        
        # Route to appropriate adapter
        if scenario in ["timeout", "rate_limited", "unavailable"]:
            adapter = self.failure_adapter
        else:
            adapter = self.registry_adapter

        response = adapter.execute(scenario, payload)
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
