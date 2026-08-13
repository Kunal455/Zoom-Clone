from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile, Form
import json
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import random
import string
import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MeetFlow API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager for Notifications
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

def generate_meeting_id():
    # Generate a 9 digit meeting ID
    return "".join(random.choices(string.digits, k=9))

@app.post("/api/meetings", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(meeting: schemas.MeetingCreate, db: Session = Depends(get_db)):
    new_meeting_id = generate_meeting_id()
    # Check if exists
    while db.query(models.Meeting).filter(models.Meeting.meeting_id == new_meeting_id).first():
        new_meeting_id = generate_meeting_id()
    
    db_meeting = models.Meeting(
        meeting_id=new_meeting_id,
        title=meeting.title,
        description=meeting.description,
        date=meeting.date or datetime.now(timezone.utc),
        duration=meeting.duration,
        is_instant=meeting.is_instant,
        status="upcoming" if not meeting.is_instant else "active"
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

@app.get("/api/meetings/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.meeting_id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@app.get("/api/meetings", response_model=list[schemas.MeetingResponse])
def get_meetings(skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Meeting)
    if status:
        query = query.filter(models.Meeting.status == status)
    return query.order_by(models.Meeting.date.desc()).offset(skip).limit(limit).all()

# Simple endpoint to check health
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# WebSocket Endpoint for Real-Time Notifications
@app.websocket("/api/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't expect the client to send data, but we keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Test Endpoint to Trigger a Notification
from pydantic import BaseModel
class NotificationMessage(BaseModel):
    user_id: str
    message: str

@app.post("/api/notifications/test")
async def trigger_notification(payload: NotificationMessage):
    # Sends a notification to a specific user, or broadcast if user_id is "all"
    notification_data = json.dumps({"type": "notification", "message": payload.message, "timestamp": datetime.now(timezone.utc).isoformat()})
    
    if payload.user_id.lower() == "all":
        await manager.broadcast(notification_data)
        return {"status": "Broadcasted successfully"}
    else:
        await manager.send_personal_message(notification_data, payload.user_id)
        return {"status": f"Sent to {payload.user_id}"}

@app.get("/api/users/profile", response_model=schemas.UserResponse)
def get_profile(db: Session = Depends(get_db)):
    user_id = "kunal"
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        user = models.User(user_id=user_id, name="Kunal Kumar", email="kunal@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@app.post("/api/users/profile", response_model=schemas.UserResponse)
async def update_profile(
    name: str = Form(...),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    user_id = "kunal"
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        user = models.User(user_id=user_id, name=name, email="kunal@example.com")
        db.add(user)
    else:
        user.name = name

    if photo and photo.filename:
        if photo.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        content = await photo.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max size is 5MB.")
            
        try:
            result = cloudinary.uploader.upload(content)
            user.photo_url = result.get("secure_url")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")
            
    db.commit()
    db.refresh(user)
    return user
