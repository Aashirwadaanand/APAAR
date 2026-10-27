from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from backend.app.db.session import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=False)  # JSON or string representation
    category = Column(String, default="appearance")  # "appearance", "sandbox_config", "institution"
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
