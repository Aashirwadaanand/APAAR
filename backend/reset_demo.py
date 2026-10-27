"""
SIH26263 Demonstration Dataset Reset Utility
Safely resets the local SQLite database to the canonical demonstration state.
Guards against accidental deletion of non-demo or external database instances.
"""
import sys
import os

# Ensure project root is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.config import settings
from backend.app.db.session import engine, SessionLocal, Base
from backend.app.models.institution import Institution
from backend.app.models.student import Student
from backend.app.models.case import IntegrityCase
from backend.seed import seed_database

def reset_demo_database():
    """
    Safely resets apaar_institute.db to the pristine 3-institution, 63-student demo state.
    Guards against accidental deletion of persistent production storage.
    """
    db_url = settings.DATABASE_URL
    print(f"[RESET DEMO] Checking database target: {db_url}")

    # Detect if running in production or against persistent storage (/var/data)
    is_production = bool(
        os.getenv("RENDER")
        or "/var/data" in db_url
        or settings.ENVIRONMENT.lower() == "production"
    )

    if is_production:
        has_prod_safeguard = (
            os.getenv("ALLOW_PRODUCTION_DEMO_RESET", "").lower() in ("true", "1", "yes")
            or "--confirm-production-reset" in sys.argv
        )
        if not has_prod_safeguard:
            print("=" * 70)
            print("[PRODUCTION SAFEGUARD BLOCKED] DEMO RESET REFUSED")
            print("=" * 70)
            print(f"Target Database URL: {db_url}")
            print("Resetting a production/persistent database is intentionally blocked to")
            print("prevent accidental data loss during live evaluations.")
            print("")
            print("To intentionally reset demo data on a persistent disk/production instance:")
            print("  Option 1: Set environment variable ALLOW_PRODUCTION_DEMO_RESET=true")
            print("  Option 2: Run with explicit flag: python -m backend.reset_demo --confirm-production-reset")
            print("=" * 70)
            sys.exit(1)
        else:
            print("[SAFETY OVERRIDE] Production reset safeguard confirmed by operator.")

    # Target safety check: must be SQLite apaar_institute.db
    if not ("sqlite" in db_url.lower() and "apaar_institute.db" in db_url.lower()):
        print("[SAFETY ERROR] Reset aborted: Target database is not an apaar_institute.db SQLite store.")
        print(f"DATABASE_URL is set to: {db_url}")
        sys.exit(1)

    print("[RESET DEMO] Target database confirmed as demonstration SQLite store.")
    print("[RESET DEMO] Dropping existing demo tables...")
    Base.metadata.drop_all(bind=engine)

    print("[RESET DEMO] Recreating schema...")
    Base.metadata.create_all(bind=engine)

    print("[RESET DEMO] Seeding canonical institutions and synthetic student records...")
    db = SessionLocal()
    try:
        seed_database(db=db, force=True)

        # Verification of reset state
        inst_count = db.query(Institution).count()
        student_count = db.query(Student).count()
        case_count = db.query(IntegrityCase).count()

        print("-" * 60)
        print("DEMONSTRATION DATASET RESTORED SUCCESSFULLY")
        print(f"Institutions Registered: {inst_count} (Apex, Sardar Patel, Kalinga)")
        print(f"Synthetic Students:      {student_count}")
        print(f"Active Integrity Cases:  {case_count}")
        print("-" * 60)
        print("The platform is in pristine state for judge demonstration.")
    finally:
        db.close()

if __name__ == "__main__":
    reset_demo_database()

