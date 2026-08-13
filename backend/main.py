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
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

import models
import schemas
from database import engine, get_db
import auth

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MeetFlow API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
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
def create_meeting(meeting: schemas.MeetingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
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
def get_meetings(skip: int = 0, limit: int = 100, status_param: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Meeting)
    if status_param:
        query = query.filter(models.Meeting.status == status_param)
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

@app.post("/api/auth/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    user_id = "".join(random.choices(string.ascii_letters + string.digits, k=10))
    
    db_user = models.User(
        user_id=user_id,
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token = auth.create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/api/users", response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

@app.post("/api/users/profile", response_model=schemas.UserResponse)
async def update_profile(
    name: str = Form(...),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user = current_user
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

# --- WEBRTC SIGNALING ---

class MeetingConnectionManager:
    def __init__(self):
        # meeting_id -> { user_id: websocket }
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str, user_id: str):
        await websocket.accept()
        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = {}
        self.rooms[meeting_id][user_id] = websocket

    def disconnect(self, meeting_id: str, user_id: str):
        if meeting_id in self.rooms:
            if user_id in self.rooms[meeting_id]:
                del self.rooms[meeting_id][user_id]
            if len(self.rooms[meeting_id]) == 0:
                del self.rooms[meeting_id]

    async def broadcast_to_room(self, meeting_id: str, message: dict, exclude: str = None):
        if meeting_id in self.rooms:
            for uid, connection in self.rooms[meeting_id].items():
                if uid != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def send_personal_message(self, meeting_id: str, user_id: str, message: dict):
        if meeting_id in self.rooms and user_id in self.rooms[meeting_id]:
            try:
                await self.rooms[meeting_id][user_id].send_json(message)
            except Exception:
                pass

meeting_manager = MeetingConnectionManager()

@app.websocket("/api/ws/meeting/{meeting_id}/{user_id}")
async def meeting_websocket(websocket: WebSocket, meeting_id: str, user_id: str):
    await meeting_manager.connect(websocket, meeting_id, user_id)
    
    # Notify others that this user joined
    await meeting_manager.broadcast_to_room(meeting_id, {
        "type": "user-joined",
        "userId": user_id
    }, exclude=user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            target = data.get("target")
            
            if msg_type in ["offer", "answer", "ice-candidate"]:
                await meeting_manager.send_personal_message(meeting_id, target, {
                    "type": msg_type,
                    "sender": user_id,
                    "data": data.get("data"),
                    "name": data.get("name")
                })
            elif msg_type == "chat-message":
                await meeting_manager.broadcast_to_room(meeting_id, {
                    "type": "chat-message",
                    "sender": user_id,
                    "text": data.get("text"),
                    "senderName": data.get("senderName"),
                    "timestamp": data.get("timestamp")
                })
            elif msg_type == "toggle-media":
                await meeting_manager.broadcast_to_room(meeting_id, {
                    "type": "toggle-media",
                    "sender": user_id,
                    "media": data.get("media"),
                    "state": data.get("state"),
                    "name": data.get("name")
                }, exclude=user_id)
                
    except WebSocketDisconnect:
        meeting_manager.disconnect(meeting_id, user_id)
        await meeting_manager.broadcast_to_room(meeting_id, {
            "type": "user-left",
            "userId": user_id
        })

