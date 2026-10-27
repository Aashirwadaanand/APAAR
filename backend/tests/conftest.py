import os
# Ensure test suite runs in isolated test SQLite database without mutating development database
os.environ["DATABASE_URL"] = "sqlite:///./test_apaar.db"

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import Base, engine, SessionLocal
from backend.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes a pristine test database for the automated test suite."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force=True)
    finally:
        db.close()
    yield
    try:
        db.close()
    except Exception:
        pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
