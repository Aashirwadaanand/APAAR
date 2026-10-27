from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.institution import Institution
from backend.app.models.case import IntegrityCase, ReviewCase
from backend.app.models.duplicate import CrossInstitutionMatch
from backend.app.models.quality import DataQualityIssue
from backend.app.models.audit import AuditLog
from backend.app.schemas.dashboard import (
    DashboardSummaryResponse,
    OverviewStats,
    DepartmentMetric,
    VerificationStatusBreakdown,
    InstitutionIntakeComparison,
    RecentIntegrityCase
)

router = APIRouter()

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse, tags=["Dashboard"])
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Return database-backed institutional summary metrics and coverage ratios."""
    total_students = db.query(Student).count()
    active_enrollments = db.query(Student).filter(Student.enrollment_status == "Active").count()
    
    apaar_registered = db.query(Student).filter(
        Student.apaar_id.isnot(None),
        Student.apaar_id != ""
    ).count()
    
    verified_count = db.query(Student).filter(
        Student.verification_status == "Verified_Simulated"
    ).count()
    
    flagged_issues = db.query(DataQualityIssue).filter(
        DataQualityIssue.is_resolved == False
    ).count()
    
    open_cases = db.query(ReviewCase).filter(
        ReviewCase.status.in_(["Open", "Under_Investigation", "Clarification_Requested"])
    ).count()
    
    critical_dupes = db.query(CrossInstitutionMatch).filter(
        CrossInstitutionMatch.severity == "Critical",
        CrossInstitutionMatch.status != "Cleared"
    ).count()
    
    avg_quality = db.query(func.avg(Student.quality_score)).scalar() or 0.0

    apaar_coverage = round((apaar_registered / total_students * 100), 1) if total_students > 0 else 0.0
    verification_rate = round((verified_count / total_students * 100), 1) if total_students > 0 else 0.0

    # Department breakdown
    dept_results = db.query(
        Student.department,
        func.count(Student.id).label("total"),
        func.count(func.nullif(Student.apaar_id, "")).label("with_apaar"),
        func.count(func.nullif(Student.verification_status != "Verified_Simulated", True)).label("verified")
    ).group_by(Student.department).all()

    department_metrics = []
    for dept, count, with_apaar, verified in dept_results:
        cov = round((with_apaar / count * 100), 1) if count > 0 else 0.0
        department_metrics.append(DepartmentMetric(
            department=dept,
            student_count=count,
            apaar_coverage=cov,
            verified_count=verified
        ))

    # Verification status breakdown
    unverified = db.query(Student).filter(Student.verification_status == "Unverified").count()
    in_sandbox = db.query(Student).filter(Student.verification_status == "In_Sandbox_Verification").count()
    verified_sim = db.query(Student).filter(Student.verification_status == "Verified_Simulated").count()
    flagged = db.query(Student).filter(Student.verification_status == "Flagged").count()
    rejected = db.query(Student).filter(Student.verification_status == "Rejected").count()

    recent_audits = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8).all()
    audit_events = [
        {
            "id": log.id,
            "action": log.action,
            "actor": log.actor_name or log.actor_label,
            "timestamp": (log.timestamp or log.created_at).isoformat(),
            "description": log.description or log.action,
            "module": log.module or log.entity_type
        }
        for log in recent_audits
    ]

    # Institutional metrics
    institutions = db.query(Institution).all()
    institutions_count = len(institutions)

    intake_comparison = []
    intake_exceptions = 0
    for inst in institutions:
        enrolled = db.query(Student).filter(Student.institution_id == inst.id).count()
        open_c = db.query(IntegrityCase).filter(
            IntegrityCase.institution_id == inst.id,
            IntegrityCase.status == "OPEN"
        ).count()
        is_exceeded = enrolled > inst.approved_intake
        if is_exceeded:
            intake_exceptions += 1
        intake_comparison.append(InstitutionIntakeComparison(
            institution_id=inst.id,
            institution_code=inst.institution_code,
            institution_name=inst.institution_name,
            approved_intake=inst.approved_intake,
            enrolled_count=enrolled,
            open_cases=open_c,
            status="EXCEEDED" if is_exceeded else "NORMAL",
            over_by=max(0, enrolled - inst.approved_intake)
        ))

    # Integrity cases breakdown
    open_cases_query = db.query(IntegrityCase).filter(IntegrityCase.status == "OPEN").all()
    open_integrity_cases = len(open_cases_query)

    cases_by_severity = {"CRITICAL": 0, "WARNING": 0, "INFO": 0}
    cases_by_type = {}
    for c in open_cases_query:
        sev = c.severity.upper() if c.severity else "INFO"
        cases_by_severity[sev] = cases_by_severity.get(sev, 0) + 1
        cases_by_type[c.case_type] = cases_by_type.get(c.case_type, 0) + 1

    # Records requiring review (Unverified or Flagged)
    records_requiring_review = db.query(Student).filter(
        Student.verification_status.in_(["Flagged", "Unverified"])
    ).count()

    # Recent cases
    recent_cases_db = db.query(IntegrityCase).order_by(IntegrityCase.created_at.desc()).limit(6).all()
    recent_cases = [
        RecentIntegrityCase(
            id=c.id,
            case_type=c.case_type,
            severity=c.severity,
            status=c.status,
            summary=c.summary,
            created_at=c.created_at.isoformat() if c.created_at else "",
            institution_id=c.institution_id
        )
        for c in recent_cases_db
    ]

    stats = OverviewStats(
        total_students=total_students,
        active_enrollments=active_enrollments,
        apaar_registered_count=apaar_registered,
        apaar_coverage_percentage=apaar_coverage,
        verified_count=verified_count,
        verification_rate_percentage=verification_rate,
        flagged_issues_count=flagged_issues,
        open_review_cases=open_cases,
        critical_dual_enrollments=critical_dupes,
        average_data_quality_score=round(avg_quality, 1)
    )

    return DashboardSummaryResponse(
        stats=stats,
        department_metrics=department_metrics,
        verification_breakdown=VerificationStatusBreakdown(
            unverified=unverified,
            in_sandbox=in_sandbox,
            verified_simulated=verified_sim,
            flagged=flagged,
            rejected=rejected
        ),
        recent_audit_events=audit_events,
        institutions_count=institutions_count,
        open_integrity_cases=open_integrity_cases,
        records_requiring_review=records_requiring_review,
        intake_exceptions=intake_exceptions,
        institution_intake_comparison=intake_comparison,
        cases_by_severity=cases_by_severity,
        cases_by_type=cases_by_type,
        recent_cases=recent_cases
    )
