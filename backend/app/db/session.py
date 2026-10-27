import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# Resolve target database URL
effective_db_url = settings.sync_database_url

# Synchronize settings.DATABASE_URL for backward-compatibility with tests & utilities
settings.DATABASE_URL = effective_db_url

# Ensure persistent disk parent directory exists for SQLite
if effective_db_url.startswith("sqlite"):
    prefix = "sqlite:///"
    if effective_db_url.startswith(prefix):
        raw_path = effective_db_url[len(prefix):]
        # In Linux/Render /var/data/apaar_institute.db -> dirname is /var/data
        db_dir = os.path.dirname(raw_path)
        if db_dir and not os.path.exists(db_dir):
            try:
                os.makedirs(db_dir, exist_ok=True)
                print(f"[DB INIT] Created persistent storage directory: {db_dir}")
            except Exception as e:
                print(f"[DB INIT WARNING] Could not create directory {db_dir}: {e}")

engine = create_engine(
    effective_db_url,
    connect_args={"check_same_thread": False} if "sqlite" in effective_db_url else {}
)

# Apply SQLite WAL pragma for high-concurrency read/write and foreign keys
if "sqlite" in effective_db_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

