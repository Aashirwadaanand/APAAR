from pydantic import BaseModel
from typing import List, Dict, Any

class OverviewStats(BaseModel):
    total_students: int
    active_enrollments: int
    apaar_registered_count: int
    apaar_coverage_percentage: float
    verified_count: int
    verification_rate_percentage: float
    flagged_issues_count: int
    open_review_cases: int
    critical_dual_enrollments: int
    average_data_quality_score: float

class DepartmentMetric(BaseModel):
    department: str
    student_count: int
    apaar_coverage: float
    verified_count: int

class VerificationStatusBreakdown(BaseModel):
    unverified: int
    in_sandbox: int
    verified_simulated: int
    flagged: int
    rejected: int

class InstitutionIntakeComparison(BaseModel):
    institution_id: str
    institution_code: str
    institution_name: str
    approved_intake: int
    enrolled_count: int
    open_cases: int
    status: str
    over_by: int

class RecentIntegrityCase(BaseModel):
    id: int
    case_type: str
    severity: str
    status: str
    summary: str
    created_at: str
    institution_id: str | None = None

class DashboardSummaryResponse(BaseModel):
    stats: OverviewStats
    department_metrics: List[DepartmentMetric]
    verification_breakdown: VerificationStatusBreakdown
    recent_audit_events: List[Dict[str, Any]]
    institutions_count: int = 0
    open_integrity_cases: int = 0
    records_requiring_review: int = 0
    intake_exceptions: int = 0
    institution_intake_comparison: List[InstitutionIntakeComparison] = []
    cases_by_severity: Dict[str, int] = {}
    cases_by_type: Dict[str, int] = {}
    recent_cases: List[RecentIntegrityCase] = []

