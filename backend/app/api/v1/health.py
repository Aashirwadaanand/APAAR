from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.db.session import get_db
from backend.app.core.config import settings

router = APIRouter()

@router.get("/health", tags=["Health"])
def get_health(response: Response, db: Session = Depends(get_db)):
    """Health check endpoint validating application and SQLite database connectivity."""
    db_status = "connected"
    is_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        is_healthy = False
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if is_healthy else "degraded",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "institution_id": settings.INSTITUTION_ID,
        "database": db_status,
        "sandbox_mode": True,
        "simulated_environment": "AICTE-APAAR-SANDBOX-DEMO"
    }

