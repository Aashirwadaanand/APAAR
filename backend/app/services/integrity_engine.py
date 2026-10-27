"""
Deterministic Enrollment Integrity Engine.

Evaluates institutional student records against regulatory rules:
1. Missing required fields (ERR_REQUIRED_FIELD_MISSING)
2. Invalid APAAR identifier syntax/checksum (ERR_APAAR_FORMAT_INVALID)
3. Duplicate APAAR IDs within single institution (ERR_DUPLICATE_APAAR_INTRA_INSTITUTION)
4. Matching APAAR IDs across institutions (WARN_APAAR_CROSS_INSTITUTION_MATCH)
5. Conflicting names or dates of birth for same identifier (ERR_APAAR_DEMOGRAPHIC_CONFLICT)
6. Enrolment exceeding configured approved intake (WARN_INTAKE_CAPACITY_EXCEEDED)
7. Duplicate institutional student IDs (ERR_DUPLICATE_INSTITUTION_STUDENT_ID)

Key Principles:
- Format verification confirms syntax only, not authentic identity.
- Cross-institution collision indicates administrative review required, never fraud.
- Case deduplication: Repeated scans update existing open cases without creating duplicates.
"""
from typing import List, Dict, Any, Optional
import json
from collections import defaultdict
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.models.student import Student
from backend.app.models.institution import Institution
from backend.app.models.case import IntegrityCase
from backend.app.models.audit import AuditEvent
from backend.app.services.apaar_validator import validate_apaar_syntax

# Configurable intake counting policy
DEFAULT_INTAKE_POLICY = {
    "counted_statuses": ["Active"],
    "ignored_statuses": ["Suspended", "Graduated", "Transferred"],
    "buffer_percentage": 0.0  # 0% tolerance before warning
}

class IntegrityScanResult:
    def __init__(self):
        self.scanned_students: int = 0
        self.scanned_institutions: int = 0
        self.findings_count: int = 0
        self.new_cases_created: int = 0
        self.existing_cases_updated: int = 0
        self.findings: List[Dict[str, Any]] = []

def run_integrity_scan(
    db: Session,
    institution_id: Optional[str] = None,
    intake_policy: Optional[Dict[str, Any]] = None
) -> IntegrityScanResult:
    policy = intake_policy or DEFAULT_INTAKE_POLICY
    result = IntegrityScanResult()

    # Query institutions
    inst_query = db.query(Institution)
    if institution_id:
        inst_query = inst_query.filter(Institution.id == institution_id)
    institutions = inst_query.all()
    result.scanned_institutions = len(institutions)

    # Query all students
    student_query = db.query(Student)
    if institution_id:
        student_query = student_query.filter(Student.institution_id == institution_id)
    all_students = student_query.all()
    result.scanned_students = len(all_students)

    # 1. Rule: Missing Required Fields
    for s in all_students:
        missing = []
        if not s.institution_student_id or not str(s.institution_student_id).strip():
            missing.append("institution_student_id")
        if not s.full_name or not str(s.full_name).strip():
            missing.append("full_name")
        if not s.programme or not str(s.programme).strip():
            missing.append("programme")
        if not s.academic_year:
            missing.append("academic_year")

        if missing:
            result.findings.append({
                "rule_identifier": "ERR_REQUIRED_FIELD_MISSING",
                "severity": "CRITICAL",
                "institution_id": s.institution_id,
                "student_id": s.id,
                "summary": f"Student record {s.id} is missing mandatory institutional fields: {', '.join(missing)}.",
                "evidence": {
                    "student_id": s.id,
                    "institution_student_id": s.institution_student_id,
                    "missing_fields": missing
                },
                "recommended_action": "Complete missing mandatory attributes in the institutional admission dossier."
            })

    # 2. Rule: Invalid APAAR Identifier Format
    for s in all_students:
        if s.apaar_id:
            is_valid, reason = validate_apaar_syntax(s.apaar_id)
            if not is_valid:
                result.findings.append({
                    "rule_identifier": "ERR_APAAR_FORMAT_INVALID",
                    "severity": "CRITICAL",
                    "institution_id": s.institution_id,
                    "student_id": s.id,
                    "summary": f"Student {s.full_name} ({s.institution_student_id}) has malformed APAAR '{s.apaar_id}': {reason}.",
                    "evidence": {
                        "student_id": s.id,
                        "apaar_id": s.apaar_id,
                        "validation_reason": reason
                    },
                    "recommended_action": "Obtain authentic APAAR card copy from student or re-generate via Academic Bank of Credits."
                })

    # 3. Rule: Duplicate Institutional Student IDs within Same Institution
    inst_student_id_map = defaultdict(list)
    for s in all_students:
        if s.institution_student_id:
            key = (s.institution_id, s.institution_student_id.strip().upper())
            inst_student_id_map[key].append(s)

    for (inst_id, roll), group in inst_student_id_map.items():
        if len(group) > 1:
            record_refs = [{"id": s.id, "name": s.full_name} for s in group]
            result.findings.append({
                "rule_identifier": "ERR_DUPLICATE_INSTITUTION_STUDENT_ID",
                "severity": "CRITICAL",
                "institution_id": inst_id,
                "student_id": group[0].id,
                "summary": f"Duplicate institutional roll number '{roll}' assigned to {len(group)} student records.",
                "evidence": {
                    "roll_number": roll,
                    "duplicate_records": record_refs
                },
                "recommended_action": "Resolve institutional roll number collision and assign distinct registration numbers."
            })

    # 4 & 5. Rules: Intra-institution Duplicate APAAR & Cross-institution Matching APAAR & Demographic Conflict
    # Query all students across the whole database to check cross-institution matches
    all_db_students = db.query(Student).all()
    apaar_map = defaultdict(list)
    for s in all_db_students:
        if s.apaar_id and s.apaar_id.strip():
            apaar_map[s.apaar_id.strip()].append(s)

    for apaar, group in apaar_map.items():
        if len(group) > 1:
            # Group by institution
            by_inst = defaultdict(list)
            for s in group:
                by_inst[s.institution_id].append(s)

            # Check Intra-institution duplicate APAAR
            for inst_id, inst_group in by_inst.items():
                if len(inst_group) > 1:
                    refs = [{"id": s.id, "roll": s.institution_student_id, "name": s.full_name} for s in inst_group]
                    result.findings.append({
                        "rule_identifier": "ERR_DUPLICATE_APAAR_INTRA_INSTITUTION",
                        "severity": "CRITICAL",
                        "institution_id": inst_id,
                        "student_id": inst_group[0].id,
                        "summary": f"Multiple students ({len(inst_group)}) within the same institution share identical APAAR ID '{apaar}'.",
                        "evidence": {
                            "apaar_id": apaar,
                            "records": refs
                        },
                        "recommended_action": "Verify original APAAR/Aadhaar credentials for both students to rectify mistaken assignment."
                    })

            # Check Cross-institution duplicate APAAR (across 2 or more institutions)
            if len(by_inst) > 1:
                inst_list = list(by_inst.keys())
                cross_refs = [
                    {"id": s.id, "inst_id": s.institution_id, "roll": s.institution_student_id, "name": s.full_name, "dob": str(s.date_of_birth)}
                    for s in group
                ]
                result.findings.append({
                    "rule_identifier": "WARN_APAAR_CROSS_INSTITUTION_MATCH",
                    "severity": "WARNING",
                    "institution_id": group[0].institution_id,
                    "student_id": group[0].id,
                    "summary": f"Identical APAAR ID '{apaar}' detected across {len(by_inst)} peer institutions: {', '.join(inst_list)}.",
                    "evidence": {
                        "apaar_id": apaar,
                        "peer_institutions": inst_list,
                        "cross_records": cross_refs
                    },
                    "recommended_action": "Coordinate inter-institutional review to determine if student transferred or has dual regular degree."
                })

                # Check for Conflicting Names or Dates of Birth for the same identifier
                names = {s.full_name.strip().lower() for s in group if s.full_name}
                dobs = {str(s.date_of_birth) for s in group if s.date_of_birth}
                if len(names) > 1 or len(dobs) > 1:
                    result.findings.append({
                        "rule_identifier": "ERR_APAAR_DEMOGRAPHIC_CONFLICT",
                        "severity": "CRITICAL",
                        "institution_id": group[0].institution_id,
                        "student_id": group[0].id,
                        "summary": f"Demographic mismatch on shared APAAR '{apaar}': Conflicting names ({len(names)}) or DOBs ({len(dobs)}).",
                        "evidence": {
                            "apaar_id": apaar,
                            "conflicting_names": list(names),
                            "conflicting_dobs": list(dobs),
                            "records": cross_refs
                        },
                        "recommended_action": "Flag identity dossier for manual verification against original government document archives."
                    })

    # 6. Rule: Enrolment Exceeding Approved Intake (Configurable Policy)
    for inst in institutions:
        counted_statuses = policy.get("counted_statuses", ["Active"])
        active_count = db.query(Student).filter(
            Student.institution_id == inst.id,
            Student.enrollment_status.in_(counted_statuses)
        ).count()

        allowed_limit = inst.approved_intake
        if active_count > allowed_limit:
            excess = active_count - allowed_limit
            result.findings.append({
                "rule_identifier": "WARN_INTAKE_CAPACITY_EXCEEDED",
                "severity": "WARNING",
                "institution_id": inst.id,
                "student_id": None,
                "summary": f"Institution {inst.institution_name} active enrolment ({active_count}) exceeds approved intake capacity ({allowed_limit}) by {excess} seats.",
                "evidence": {
                    "institution_id": inst.id,
                    "approved_intake": allowed_limit,
                    "active_enrolled": active_count,
                    "excess_count": excess,
                    "policy_counted_statuses": counted_statuses
                },
                "recommended_action": "Review intake approval expansion orders, lateral entry quotas, or reconcile un-updated transfer records."
            })

    # Record / Deduplicate cases in DB
    result.findings_count = len(result.findings)
    for f in result.findings:
        evidence_str = json.dumps(f["evidence"], sort_keys=True)
        
        # Deduplication check: Match any existing case of same rule, institution, and student
        existing_case = db.query(IntegrityCase).filter(
            IntegrityCase.case_type == f["rule_identifier"],
            IntegrityCase.institution_id == f["institution_id"],
            IntegrityCase.student_id == f["student_id"]
        ).order_by(IntegrityCase.created_at.desc()).first()

        if existing_case:
            if existing_case.status in ["OPEN", "UNDER_REVIEW"]:
                # Update existing open case without creating duplicate
                existing_case.summary = f["summary"]
                existing_case.evidence_json = evidence_str
                existing_case.recommended_action = f["recommended_action"]
                existing_case.severity = f["severity"]
                existing_case.updated_at = datetime.utcnow()
            # If already RESOLVED or DISMISSED, respect documented audit resolution and do not reopen duplicate
            result.existing_cases_updated += 1
        else:
            # Create new case
            new_case = IntegrityCase(
                case_type=f["rule_identifier"],
                severity=f["severity"],
                status="OPEN",
                institution_id=f["institution_id"],
                student_id=f["student_id"],
                summary=f["summary"],
                evidence_json=evidence_str,
                recommended_action=f["recommended_action"]
            )
            db.add(new_case)
            result.new_cases_created += 1

    # Log audit event
    audit = AuditEvent(
        actor_label="Integrity Engine",
        action="INTEGRITY_SCAN_COMPLETED",
        entity_type="System",
        entity_id=institution_id or "ALL",
        details_json=json.dumps({
            "scanned_students": result.scanned_students,
            "findings_count": result.findings_count,
            "new_cases": result.new_cases_created,
            "updated_cases": result.existing_cases_updated
        })
    )
    db.add(audit)
    db.commit()

    return result
