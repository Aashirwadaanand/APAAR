import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import Base, engine, SessionLocal
from backend.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force=False)
    finally:
        db.close()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "AICTE" in data["institution_id"]

def test_dashboard_summary_endpoint(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert data["stats"]["total_students"] > 0
    assert "department_metrics" in data
    assert "verification_breakdown" in data

def test_students_listing_and_filtering(client):
    response = client.get("/api/students?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0

    # Test search query
    search_resp = client.get("/api/students?search=Sharma")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert any("Sharma" in s["full_name"] for s in search_data["items"])

def test_quality_issues_endpoint(client):
    response = client.get("/api/v1/quality/issues")
    assert response.status_code == 200
    issues = response.json()
    assert isinstance(issues, list)
    assert len(issues) > 0

def test_cross_institution_matches(client):
    response = client.get("/api/v1/duplicates/matches")
    assert response.status_code == 200
    matches = response.json()
    assert isinstance(matches, list)

def test_sandbox_verification_flow(client):
    # Student 1 with valid APAAR
    response = client.post("/api/v1/sandbox/verify/1", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "SIMULATED" in data["disclaimer"]

def test_sandbox_verification_simulated_failure(client):
    # Test failure mode toggle
    response = client.post("/api/v1/sandbox/verify/1", json={"force_fail": True})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SERVICE_TIMEOUT"

def test_reports_csv_export(client):
    response = client.get("/api/reports/export.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "full_name" in response.text
