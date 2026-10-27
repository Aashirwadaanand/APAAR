import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal, Base, engine
from backend.seed import seed_database
from backend.app.models.student import Student
from backend.app.models.institution import Institution
from backend.app.models.case import IntegrityCase

@pytest.fixture(scope="session", autouse=True)
def init_prompt2_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force=True)
    finally:
        db.close()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

# --------------------------------------------------------------------------
# 1. Health & Dashboard Endpoints
# --------------------------------------------------------------------------
def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_api_dashboard_summary(client):
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["stats"]["total_students"] >= 50
    assert len(data["department_metrics"]) > 0

# --------------------------------------------------------------------------
# 2. Institution Endpoints
# --------------------------------------------------------------------------
def test_list_and_create_institutions(client):
    # List institutions
    res = client.get("/api/institutions")
    assert res.status_code == 200
    institutions = res.json()
    assert len(institutions) >= 3
    codes = [i["institution_code"] for i in institutions]
    assert "AIT-PUN" in codes
    assert "SPCE-MUM" in codes
    assert "KIIS-BHU" in codes

    # Create new institution
    new_inst = {
        "institution_code": "IIT-BOM-MOCK",
        "institution_name": "Indian Institute of Technology Bombay (Mock Node)",
        "approved_intake": 120,
        "programme": "Engineering & Technology",
        "academic_year": "2025-2026",
        "state": "Maharashtra",
        "district": "Mumbai"
    }
    create_res = client.post("/api/institutions", json=new_inst)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["institution_code"] == "IIT-BOM-MOCK"

# --------------------------------------------------------------------------
# 3. Student Registry & CRUD Endpoints
# --------------------------------------------------------------------------
def test_student_endpoints(client):
    # List with pagination and filter
    res = client.get("/api/students?page=1&page_size=10&institution_id=AICTE-1-432890123")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert len(data["items"]) <= 10

    # Get single student
    first_id = data["items"][0]["id"]
    get_res = client.get(f"/api/students/{first_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == first_id

    # Create student
    new_student = {
        "institution_id": "AICTE-1-432890123",
        "institution_student_id": "AIT-2025-CSE-999",
        "full_name": "Test Integration Candidate",
        "programme": "B.Tech Computer Science",
        "academic_year": "2025-2026",
        "apaar_id": "900000000018",  # Valid Verhoeff checksum
        "enrollment_status": "Active"
    }
    post_res = client.post("/api/students", json=new_student)
    assert post_res.status_code == 201
    created_id = post_res.json()["id"]

    # Patch student
    patch_res = client.patch(f"/api/students/{created_id}", json={"full_name": "Updated Integration Candidate"})
    assert patch_res.status_code == 200
    assert patch_res.json()["full_name"] == "Updated Integration Candidate"

def test_intra_institution_unique_constraint(client):
    # Attempt to enroll with duplicate institutional roll number in same institution
    dup_student = {
        "institution_id": "AICTE-1-432890123",
        "institution_student_id": "AIT-2024-CSE-100",  # Seeded student
        "full_name": "Collision Student",
        "programme": "B.Tech Computer Science"
    }
    res = client.post("/api/students", json=dup_student)
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]

# --------------------------------------------------------------------------
# 4. CSV Import (Preview & Confirm)
# --------------------------------------------------------------------------
def test_csv_import_preview_and_commit(client):
    # 900000000018 has check digit 8, 900000000025 has check digit 5
    valid_csv_content = """institution_student_id,full_name,programme,academic_year,apaar_id,date_of_birth
CSV-IMPORT-001,Mehul Agarwal,B.Tech Information Technology,2025-2026,900000000018,2004-06-12
CSV-IMPORT-002,Shreya Sengupta,B.Tech Electrical Engineering,2025-2026,900000000025,2005-02-18
"""
    # Preview
    preview_res = client.post(
        "/api/students/import-preview",
        files={"file": ("batch_test.csv", io.BytesIO(valid_csv_content.encode("utf-8")), "text/csv")},
        data={"institution_id": "AICTE-1-432890123"}
    )
    assert preview_res.status_code == 200
    preview_json = preview_res.json()
    assert preview_json["valid_rows_count"] == 2
    assert preview_json["invalid_rows_count"] == 0
    assert preview_json["can_import"] is True

    # Commit
    confirm_payload = {
        "institution_id": "AICTE-1-432890123",
        "records": preview_json["all_valid_records"]
    }
    commit_res = client.post("/api/students/import", json=confirm_payload)
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["imported_count"] == 2

def test_csv_import_validation_errors(client):
    # Test invalid CSV: empty file
    res_empty = client.post(
        "/api/students/import-preview",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
        data={"institution_id": "AICTE-1-432890123"}
    )
    assert res_empty.status_code == 400

    # Test non-csv extension
    res_bad_ext = client.post(
        "/api/students/import-preview",
        files={"file": ("document.pdf", io.BytesIO(b"dummy pdf content"), "application/pdf")},
        data={"institution_id": "AICTE-1-432890123"}
    )
    assert res_bad_ext.status_code == 400

    # Test CSV with missing required headers
    bad_header_csv = "email,mobile\ntest@test.com,9800000000\n"
    res_bad_header = client.post(
        "/api/students/import-preview",
        files={"file": ("test.csv", io.BytesIO(bad_header_csv.encode("utf-8")), "text/csv")},
        data={"institution_id": "AICTE-1-432890123"}
    )
    assert res_bad_header.status_code == 422

# --------------------------------------------------------------------------
# 5. Integrity Engine & Case Management
# --------------------------------------------------------------------------
def test_integrity_scan_and_cases(client):
    # Trigger scan
    scan_res = client.post("/api/integrity/scan", json={})
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert scan_data["findings_count"] > 0

    # List cases
    cases_res = client.get("/api/integrity/cases")
    assert cases_res.status_code == 200
    cases = cases_res.json()
    assert len(cases) > 0

    # Verify case types exist
    case_types = [c["case_type"] for c in cases]
    assert any("APAAR" in ct for ct in case_types)

    # Get single case and resolve it
    target_case_id = cases[0]["id"]
    get_case_res = client.get(f"/api/integrity/cases/{target_case_id}")
    assert get_case_res.status_code == 200

    resolve_payload = {
        "status": "RESOLVED",
        "resolution_note": "Reconciled with original identity certificates during annual audit."
    }
    resolve_res = client.post(f"/api/integrity/cases/{target_case_id}/resolve", json=resolve_payload)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert "Reconciled" in resolve_res.json()["resolution_note"]

def test_case_deduplication_on_repeated_scans(client):
    """Verify that repeated scans update existing open cases without creating endless duplicate rows."""
    # First scan
    scan1 = client.post("/api/integrity/scan", json={}).json()
    cases_count_1 = len(client.get("/api/integrity/cases?status=OPEN").json())

    # Second scan immediately after
    scan2 = client.post("/api/integrity/scan", json={}).json()
    cases_count_2 = len(client.get("/api/integrity/cases?status=OPEN").json())

    assert scan2["new_cases_created"] == 0
    assert scan2["existing_cases_updated"] > 0
    assert cases_count_2 == cases_count_1

    # Resolve an open case
    open_cases = client.get("/api/integrity/cases?status=OPEN").json()
    assert len(open_cases) > 0
    c_to_resolve = open_cases[0]
    client.post(
        f"/api/integrity/cases/{c_to_resolve['id']}/resolve",
        json={"status": "RESOLVED", "resolution_note": "Verified by registrar during compliance audit."}
    )

    # Third scan after resolution
    scan3 = client.post("/api/integrity/scan", json={}).json()
    assert scan3["new_cases_created"] == 0

    # Confirm case remains resolved
    rechecked = client.get(f"/api/integrity/cases/{c_to_resolve['id']}").json()
    assert rechecked["status"] == "RESOLVED"
    assert "Verified by registrar" in rechecked["resolution_note"]

# --------------------------------------------------------------------------
# 6. Verification Sandbox Scenarios
# --------------------------------------------------------------------------
def test_verification_scenarios_listing(client):
    res = client.get("/api/verification/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    expected = ["success", "unknown_identifier", "attribute_mismatch", "consent_denied", "timeout", "rate_limited", "unavailable"]
    for sc in expected:
        assert sc in scenarios

def test_verification_scenario_executions(client):
    # Test success
    res_succ = client.post("/api/verification/run", json={"scenario": "success", "apaar_id": "900000000018", "full_name": "Aarav Sharma"})
    assert res_succ.status_code == 200
    assert res_succ.json()["outcome"] == "MATCHED"

    # Test unknown identifier
    res_unk = client.post("/api/verification/run", json={"scenario": "unknown_identifier", "apaar_id": "555500000019"})
    assert res_unk.status_code == 200
    assert res_unk.json()["outcome"] == "NOT_FOUND"

    # Test attribute mismatch
    res_mis = client.post("/api/verification/run", json={"scenario": "attribute_mismatch", "apaar_id": "900000000018", "date_of_birth": "2006-01-01"})
    assert res_mis.status_code == 200
    assert res_mis.json()["outcome"] == "MISMATCH"

    # Test consent denied
    res_con = client.post("/api/verification/run", json={"scenario": "consent_denied", "apaar_id": "900000000018"})
    assert res_con.status_code == 200
    assert res_con.json()["outcome"] == "CONSENT_DENIED"

    # Test timeout simulation (distinguishable from network error)
    res_to = client.post("/api/verification/run", json={"scenario": "timeout"})
    assert res_to.status_code == 200
    assert res_to.json()["outcome"] == "TIMEOUT"
    assert "simulated_timeout" in res_to.json()["response_json"]

    # Test rate limited
    res_rl = client.post("/api/verification/run", json={"scenario": "rate_limited"})
    assert res_rl.status_code == 200
    assert res_rl.json()["outcome"] == "RATE_LIMITED"

    # Test service unavailable
    res_un = client.post("/api/verification/run", json={"scenario": "unavailable"})
    assert res_un.status_code == 200
    assert res_un.json()["outcome"] == "SERVICE_UNAVAILABLE"

    # Verify runs list
    res_runs = client.get("/api/verification/runs")
    assert res_runs.status_code == 200
    assert len(res_runs.json()) >= 7

# --------------------------------------------------------------------------
# 7. Audit & Reports Endpoints
# --------------------------------------------------------------------------
def test_audit_endpoint(client):
    res = client.get("/api/audit")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0
    actions = [e["action"] for e in events]
    assert any("SEEDED" in a or "SCAN" in a or "RUN" in a for a in actions)

def test_reports_csv_export(client):
    res = client.get("/api/reports/export.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    text = res.text
    assert "institution_id,institution_student_id,full_name" in text
