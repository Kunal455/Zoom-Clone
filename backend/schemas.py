from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration: int
    is_instant: bool = False

class MeetingCreate(MeetingBase):
    date: Optional[datetime] = None

class MeetingResponse(MeetingBase):
    id: int
    meeting_id: str
    date: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
