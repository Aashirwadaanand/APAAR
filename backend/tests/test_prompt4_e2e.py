import io
import json
import pytest

def test_health_and_system_info(client):
    """Test health endpoint status and simulated environment metadata."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["sandbox_mode"] is True
    assert "AICTE" in data["institution_id"]

def test_institution_intake_reconciliation(client):
    """Test institution intake comparison and capacity calculation."""
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["institutions_count"] >= 3
    assert len(data["institution_intake_comparison"]) >= 3

    # Kalinga Institute was seeded with approved intake 12 and enrolled 15
    kiis = next(i for i in data["institution_intake_comparison"] if i["institution_code"] == "KIIS-BHU")
    assert kiis["approved_intake"] == 12
    assert kiis["enrolled_count"] == 15
    assert kiis["status"] == "EXCEEDED"
    assert kiis["over_by"] == 3

def test_student_lifecycle_crud_and_uniqueness(client):
    """Test student registration, retrieval, updating, and roll ID uniqueness enforcement."""
    payload = {
        "institution_id": "AICTE-1-432890123",
        "institution_student_id": "QA-TEST-STU-001",
        "full_name": "Aditi Rajesh Rao",
        "programme": "B.Tech Computer Science",
        "academic_year": "2025-2026",
        "apaar_id": "910000000089",
        "date_of_birth": "2004-08-14",
        "enrollment_status": "Active",
        "email": "aditi.rao@apex.edu.in",
        "mobile": "9812345678"
    }

    # 1. Create
    res = client.post("/api/students", json=payload)
    assert res.status_code == 201
    created = res.json()
    student_id = created["id"]
    assert created["institution_student_id"] == "QA-TEST-STU-001"
    assert created["full_name"] == "Aditi Rajesh Rao"

    # 2. Duplicate Roll ID in same institution rejected
    dup_res = client.post("/api/students", json=payload)
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.json()["detail"]

    # 3. Retrieve by ID
    get_res = client.get(f"/api/students/{student_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == student_id

    # 4. Search
    search_res = client.get("/api/students?search=Aditi")
    assert search_res.status_code == 200
    assert any(s["id"] == student_id for s in search_res.json()["items"])

    # 5. Update
    update_res = client.patch(
        f"/api/students/{student_id}",
        json={"email": "aditi.updated@apex.edu.in", "enrollment_status": "Graduated"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["email"] == "aditi.updated@apex.edu.in"
    assert update_res.json()["enrollment_status"] == "Graduated"

def test_csv_validation_preview_and_commit(client):
    """Test two-phase CSV import with row-level validation errors and confirmed commit."""
    csv_data = """institution_student_id,full_name,programme,academic_year,apaar_id,date_of_birth
CSV-QA-001,Vikram Mehra,B.Tech Information Technology,2025-2026,910000000091,2004-10-05
CSV-QA-002,,B.Tech Mechanical Engineering,2025-2026,910000000070,2004-03-21
CSV-QA-003,Pooja Hegde,B.Tech Electrical Engineering,2025-2026,999999999999,2004-12-11
"""
    # Preview
    preview_res = client.post(
        "/api/students/import-preview",
        files={"file": ("qa_batch.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        data={"institution_id": "AICTE-1-432890123"}
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["total_rows_evaluated"] == 3
    assert preview["valid_rows_count"] == 1
    assert preview["invalid_rows_count"] == 2
    assert len(preview["errors"]) >= 2

    # Check error reasons
    error_fields = [e["field"] for e in preview["errors"]]
    assert "full_name" in error_fields
    assert "apaar_id" in error_fields

    # Commit only valid rows
    commit_res = client.post(
        "/api/students/import",
        json={"institution_id": "AICTE-1-432890123", "records": preview["all_valid_records"]}
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["imported_count"] == 1

def test_integrity_scan_and_case_deduplication(client):
    """Test deterministic anomaly scan, rule categorization, and resolution persistence."""
    # Scan
    scan_res = client.post("/api/integrity/scan", json={})
    assert scan_res.status_code == 200
    scan = scan_res.json()
    assert scan["findings_count"] >= 5

    # Retrieve open cases
    cases_res = client.get("/api/integrity/cases?status=OPEN")
    assert cases_res.status_code == 200
    open_cases = cases_res.json()
    assert len(open_cases) > 0

    # Pick first case and resolve
    target_case = open_cases[0]
    resolve_res = client.post(
        f"/api/integrity/cases/{target_case['id']}/resolve",
        json={"status": "RESOLVED", "resolution_note": "Identity authenticated against physical affidavit."}
    )
    assert resolve_res.status_code == 200
    resolved_case = resolve_res.json()
    assert resolved_case["status"] == "RESOLVED"
    assert "Identity authenticated" in resolved_case["resolution_note"]

    # Re-run scan: verify that resolved case does NOT re-appear as a new open case
    repeat_scan = client.post("/api/integrity/scan", json={}).json()
    assert repeat_scan["new_cases_created"] == 0

    rechecked_case = client.get(f"/api/integrity/cases/{target_case['id']}").json()
    assert rechecked_case["status"] == "RESOLVED"

def test_all_seven_sandbox_scenarios(client):
    """Test all 7 verification sandbox scenarios with realistic payloads and verify simulated responses."""
    scenarios_to_test = [
        ("success", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2004-03-15"}, "MATCHED", 200),
        ("unknown_identifier", {"apaar_id": "999900000016", "full_name": "Unregistered Student", "date_of_birth": "2004-01-01"}, "NOT_FOUND", 404),
        ("attribute_mismatch", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2001-01-01"}, "MISMATCH", 200),
        ("consent_denied", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2004-03-15"}, "CONSENT_DENIED", 403),
        ("timeout", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2004-03-15"}, "TIMEOUT", 504),
        ("rate_limited", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2004-03-15"}, "RATE_LIMITED", 429),
        ("unavailable", {"apaar_id": "900000000018", "full_name": "Aarav Sharma", "date_of_birth": "2004-03-15"}, "SERVICE_UNAVAILABLE", 503)
    ]

    for scenario, payload_fields, outcome, code in scenarios_to_test:
        payload = {"scenario": scenario, **payload_fields}
        res = client.post("/api/verification/run", json=payload)
        assert res.status_code == 200, f"Scenario {scenario} returned status {res.status_code}"
        data = res.json()
        assert data["outcome"] == outcome, f"Scenario {scenario} outcome mismatch: {data['outcome']} != {outcome}"
        assert data["simulated"] is True
        assert data["duration_ms"] > 0

        # Check response JSON contents
        resp_obj = json.loads(data["response_json"])
        assert resp_obj["status_code"] == code

def test_data_driven_verification_suite(client):
    """Test data-driven verification against stored synthetic records, field comparisons, and audit tracking."""
    # 1. Exact Match on Aarav Sharma
    res_match = client.post("/api/verification/run", json={
        "scenario": "normal",
        "apaar_id": "9000-0000-0018",
        "full_name": "  Aarav   Sharma  ",
        "date_of_birth": "2004-03-15"
    })
    assert res_match.status_code == 200
    d_match = res_match.json()
    assert d_match["outcome"] == "MATCHED"
    resp_match = json.loads(d_match["response_json"])
    assert resp_match["comparison"]["apaar_id_found"] is True
    assert resp_match["comparison"]["full_name_match"] is True
    assert resp_match["comparison"]["dob_match"] is True
    assert len(resp_match["comparison"]["discrepant_fields"]) == 0
    assert d_match["student_id"] is not None

    # 2. Name Mismatch
    res_name_diff = client.post("/api/verification/run", json={
        "scenario": "normal",
        "apaar_id": "900000000018",
        "full_name": "Aarav Verma",
        "date_of_birth": "2004-03-15"
    })
    assert res_name_diff.status_code == 200
    d_name_diff = res_name_diff.json()
    assert d_name_diff["outcome"] == "MISMATCH"
    resp_name_diff = json.loads(d_name_diff["response_json"])
    assert resp_name_diff["comparison"]["full_name_match"] is False
    assert resp_name_diff["comparison"]["dob_match"] is True
    assert "full_name" in resp_name_diff["comparison"]["discrepant_fields"]

    # 3. DOB Mismatch
    res_dob_diff = client.post("/api/verification/run", json={
        "scenario": "normal",
        "apaar_id": "900000000018",
        "full_name": "Aarav Sharma",
        "date_of_birth": "2002-11-20"
    })
    assert res_dob_diff.status_code == 200
    d_dob_diff = res_dob_diff.json()
    assert d_dob_diff["outcome"] == "MISMATCH"
    resp_dob_diff = json.loads(d_dob_diff["response_json"])
    assert resp_dob_diff["comparison"]["dob_match"] is False
    assert "date_of_birth" in resp_dob_diff["comparison"]["discrepant_fields"]

    # 4. Unknown Identifier
    res_unknown = client.post("/api/verification/run", json={
        "scenario": "normal",
        "apaar_id": "999900000016",
        "full_name": "Unregistered Student",
        "date_of_birth": "2004-01-01"
    })
    assert res_unknown.status_code == 200
    d_unknown = res_unknown.json()
    assert d_unknown["outcome"] == "NOT_FOUND"
    resp_unknown = json.loads(d_unknown["response_json"])
    assert resp_unknown["status_code"] == 404
    assert resp_unknown["comparison"]["apaar_id_found"] is False

    # 5. Optional Simulation Tools: Timeout & Rate Limiting (must not override normal verification)
    res_timeout = client.post("/api/verification/run", json={
        "scenario": "timeout",
        "apaar_id": "900000000018",
        "full_name": "Aarav Sharma",
        "date_of_birth": "2004-03-15"
    })
    assert res_timeout.status_code == 200
    d_timeout = res_timeout.json()
    assert d_timeout["outcome"] == "TIMEOUT"
    resp_timeout = json.loads(d_timeout["response_json"])
    assert resp_timeout["status_code"] == 504
    assert resp_timeout["simulated_timeout"] is True

    res_rate = client.post("/api/verification/run", json={
        "scenario": "rate_limited",
        "apaar_id": "900000000018",
        "full_name": "Aarav Sharma",
        "date_of_birth": "2004-03-15"
    })
    assert res_rate.status_code == 200
    d_rate = res_rate.json()
    assert d_rate["outcome"] == "RATE_LIMITED"
    resp_rate = json.loads(d_rate["response_json"])
    assert resp_rate["status_code"] == 429

    # 6. Verify Verification Run History includes created runs
    res_runs = client.get("/api/verification/runs?limit=10")
    assert res_runs.status_code == 200
    runs = res_runs.json()
    assert len(runs) >= 6
    assert runs[0]["scenario"] in ["rate_limited", "timeout", "normal"]
    assert "apaar_id" in runs[0]["request_json"]

    # 7. Verify Audit Log recorded the execution
    res_audit = client.get("/api/audit?limit=20")
    assert res_audit.status_code == 200
    audits = res_audit.json()
    verification_audits = [a for a in audits if a["action"] == "VERIFICATION_RUN_EXECUTED"]
    assert len(verification_audits) >= 6
    latest_audit = verification_audits[0]
    audit_details = json.loads(latest_audit["details_json"])
    assert "apaar_id" in audit_details
    assert "outcome" in audit_details
    assert audit_details["simulated"] is True

def test_audit_trail_immutable_ledger(client):
    """Test that platform actions generate immutable audit log events."""
    res = client.get("/api/audit?limit=20")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0

    actions = [e["action"] for e in events]
    # Verify core audited actions exist
    assert any("SEEDED" in a or "SCAN" in a or "RUN" in a or "RESOLVED" in a for a in actions)

def test_csv_export_format_and_headers(client):
    """Test compliance CSV streaming export."""
    res = client.get("/api/reports/export.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    content = res.text
    lines = content.strip().split("\r\n" if "\r\n" in content else "\n")
    assert len(lines) > 1

    headers = [h.strip() for h in lines[0].split(",")]
    assert "institution_id" in headers
    assert "institution_student_id" in headers
    assert "full_name" in headers
    assert "apaar_id" in headers
    assert "verification_status" in headers
