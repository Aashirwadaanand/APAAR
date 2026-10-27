from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.api.v1 import (
    health as health_v1,
    dashboard as dashboard_v1,
    quality as quality_v1,
    duplicates as duplicates_v1,
    sandbox as sandbox_v1,
    cases as cases_v1,
    settings as app_settings_v1
)
from backend.app.api import (
    institutions,
    students,
    integrity,
    verification,
    audit,
    reports
)
from backend.seed import seed_database

from backend.app.models.institution import Institution
from backend.app.models.student import Student

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Safe database initialization (never drop tables on startup)
    print(f"[STARTUP] Initializing database at: {settings.DATABASE_URL}")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[STARTUP CRITICAL] Failed to create database schema: {exc}")
        raise exc

    # 2. Check existing records: Only seed initial demo data if database is brand new and completely empty
    db = SessionLocal()
    try:
        inst_count = db.query(Institution).count()
        student_count = db.query(Student).count()
        if inst_count == 0 and student_count == 0:
            print("[STARTUP] Brand-new database detected. Seeding canonical demonstration dataset...")
            seed_database(db=db, force=False)
            print("[STARTUP] Initial demo dataset populated successfully.")
        else:
            print(f"[STARTUP] Existing persistent database verified ({inst_count} institutions, {student_count} students). Skipping reseed.")
    except Exception as exc:
        print(f"[STARTUP WARNING] Error verifying existing database records: {exc}")
        raise exc
    finally:
        db.close()

    print(f"[STARTUP] Allowed CORS Origins: {settings.cors_origins_list}")
    yield
    # Shutdown logic

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="APAAR ID-based student data management and enrollment integrity platform for AICTE-approved institutions.",
    lifespan=lifespan
)

# CORS Middleware using configured allowed origins (no wildcard in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================================
# Prompt 2 Direct Routes: Mounted under /api/...
# =========================================================================
app.include_router(health_v1.router, prefix="/api")                     # GET /api/health
app.include_router(dashboard_v1.router, prefix="/api")                  # GET /api/dashboard/summary
app.include_router(institutions.router, prefix="/api")                  # GET, POST /api/institutions
app.include_router(students.router, prefix="/api")                      # GET, POST /api/students, /import-preview, /import
app.include_router(integrity.router, prefix="/api")                     # GET, POST /api/integrity/...
app.include_router(verification.router, prefix="/api")                  # GET, POST /api/verification/...
app.include_router(audit.router, prefix="/api")                         # GET /api/audit
app.include_router(reports.router, prefix="/api")                       # GET /api/reports/export.csv
app.include_router(app_settings_v1.router, prefix="/api")               # GET, PUT /api/settings

# =========================================================================
# Preserved Prompt 1 Routes: Mounted under /api/v1/... for UI Compatibility
# =========================================================================
api_v1_prefix = settings.API_V1_STR
app.include_router(health_v1.router, prefix=api_v1_prefix)
app.include_router(dashboard_v1.router, prefix=api_v1_prefix)
app.include_router(institutions.router, prefix=api_v1_prefix)
app.include_router(students.router, prefix=api_v1_prefix)
app.include_router(integrity.router, prefix=api_v1_prefix)
app.include_router(verification.router, prefix=api_v1_prefix)
app.include_router(quality_v1.router, prefix=api_v1_prefix)
app.include_router(duplicates_v1.router, prefix=api_v1_prefix)
app.include_router(sandbox_v1.router, prefix=api_v1_prefix)
app.include_router(cases_v1.router, prefix=api_v1_prefix)
app.include_router(audit.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(app_settings_v1.router, prefix=api_v1_prefix)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_docs": "/docs",
        "health_check": "/api/health"
    }
