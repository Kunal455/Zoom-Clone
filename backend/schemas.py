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

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

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

class ContactAdd(BaseModel):
    contact_user_id: str

class ContactResponse(BaseModel):
    id: int
    user_id: str
    contact_user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
