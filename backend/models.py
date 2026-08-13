from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(String, unique=True, index=True) # E.g., 123456789
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    duration = Column(Integer) # In minutes
    is_instant = Column(Boolean, default=False)
    status = Column(String, default="upcoming") # upcoming, active, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
