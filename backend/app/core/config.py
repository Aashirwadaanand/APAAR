import os
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "APAAR AICTE Institutional Verification Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Database Configuration: Supports both DATABASE_PATH (/var/data/apaar_institute.db)
    # and standard DATABASE_URL (sqlite:////var/data/apaar_institute.db)
    DATABASE_PATH: Optional[str] = os.getenv("DATABASE_PATH")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # CORS Origins: Accepts comma-separated string, JSON list, or list of origins.
    # Wildcard is avoided in production. Local development defaults are retained.
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    # Optional single frontend URL shortcut (e.g., set by user in Render)
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL")

    SIMULATION_LATENCY_MS: int = 400
    INSTITUTION_ID: str = "AICTE-1-432890123"
    INSTITUTION_NAME: str = "Apex Institute of Technology & Management (AICTE Approved)"

    model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")

    @property
    def sync_database_url(self) -> str:
        """
        Resolves the final SQLite database connection URL.
        1. If DATABASE_PATH is provided (e.g., /var/data/apaar_institute.db on Render persistent disk),
           normalizes it to a proper SQLite URI.
        2. If DATABASE_URL is explicitly set, uses it.
        3. Defaults to local SQLite file: sqlite:///./apaar_institute.db
        """
        # If DATABASE_PATH is set and DATABASE_URL is not explicitly overridden
        if self.DATABASE_PATH and not self.DATABASE_URL:
            path = self.DATABASE_PATH.strip()
            if path.startswith("sqlite"):
                return path
            # Absolute Unix path e.g. /var/data/apaar_institute.db -> sqlite:////var/data/apaar_institute.db
            if path.startswith("/"):
                return f"sqlite:////{path.lstrip('/')}"
            # Windows or relative path
            return f"sqlite:///{path}"

        url = self.DATABASE_URL.strip() if self.DATABASE_URL else ""
        if not url:
            return "sqlite:///./apaar_institute.db"

        # If DATABASE_URL was provided as a raw filesystem path without sqlite prefix
        if not url.startswith("sqlite") and not url.startswith("postgresql") and not url.startswith("mysql"):
            if url.startswith("/"):
                return f"sqlite:////{url.lstrip('/')}"
            return f"sqlite:///{url}"

        return url

    @property
    def cors_origins_list(self) -> List[str]:
        """
        Parses CORS_ORIGINS into a clean, deduplicated list of strings.
        Includes FRONTEND_URL if provided.
        """
        origins: List[str] = []
        raw = self.CORS_ORIGINS

        if isinstance(raw, list):
            origins.extend([o.strip() for o in raw if isinstance(o, str) and o.strip()])
        elif isinstance(raw, str):
            val = raw.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        origins.extend([str(item).strip() for item in parsed if str(item).strip()])
                except Exception:
                    origins.extend([x.strip() for x in val.strip("[]").split(",") if x.strip()])
            else:
                origins.extend([x.strip() for x in val.split(",") if x.strip()])

        # If FRONTEND_URL is set, ensure it is included
        if self.FRONTEND_URL:
            clean_fe = self.FRONTEND_URL.strip().rstrip("/")
            if clean_fe and clean_fe not in origins:
                origins.append(clean_fe)

        # In production, ensure wildcard '*' is excluded if specific origins exist
        is_prod = self.ENVIRONMENT.lower() == "production" or os.getenv("RENDER") is not None
        if is_prod and "*" in origins and len(origins) > 1:
            origins = [o for o in origins if o != "*"]

        return origins

settings = Settings()

