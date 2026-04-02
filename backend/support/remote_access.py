"""
Flowtym Support - Remote Access & Session Replay Module
Gère l'accès à distance sécurisé et le replay des sessions utilisateur
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import uuid
import secrets

router = APIRouter(prefix="/support/remote", tags=["Support Remote Access"])

# Database reference
db = None

def get_db():
    global db
    if db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "flowtym")
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
    return db

# ===== MODELS =====

class RemoteAccessRequest(BaseModel):
    hotel_id: str
    module: str  # pms, channel_manager, housekeeping, etc.
    target_role: str  # reception, gouvernante, admin, etc.
    reason: str
    requested_duration_minutes: int = 15

class RemoteAccessResponse(BaseModel):
    request_id: str
    status: str  # pending, approved, rejected, expired, active
    hotel_name: str
    module: str
    expires_at: Optional[str] = None

class SessionAction(BaseModel):
    action_type: str  # click, scroll, navigate, input, etc.
    target: Optional[str] = None  # CSS selector or element description
    value: Optional[str] = None  # For input actions
    timestamp: str
    page_url: str
    screenshot_url: Optional[str] = None

class SessionRecording(BaseModel):
    hotel_id: str
    user_id: str
    session_id: str
    actions: List[SessionAction]

# ===== REMOTE ACCESS REQUESTS =====

@router.post("/request", response_model=dict)
async def create_remote_access_request(request: RemoteAccessRequest, support_user_id: str = "support"):
    """
    Support agent requests remote access to a hotel's interface
    Creates a pending request that the hotel must approve
    """
    database = get_db()
    
    # Verify hotel exists
    hotel = await database.hotels.find_one({"id": request.hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    request_id = str(uuid.uuid4())
    access_token = secrets.token_urlsafe(32)
    
    access_request = {
        "request_id": request_id,
        "hotel_id": request.hotel_id,
        "hotel_name": hotel.get("name", "Unknown"),
        "support_user_id": support_user_id,
        "module": request.module,
        "target_role": request.target_role,
        "reason": request.reason,
        "requested_duration_minutes": request.requested_duration_minutes,
        "status": "pending",
        "access_token": access_token,
        "created_at": datetime.now(timezone.utc),
        "expires_at": None,
        "approved_at": None,
        "approved_by": None,
        "session_started_at": None,
        "session_ended_at": None,
        "actions_log": []
    }
    
    await database.remote_access_requests.insert_one(access_request)
    
    # Create notification for the hotel
    notification = {
        "hotel_id": request.hotel_id,
        "type": "remote_access_request",
        "notification_type": "remote_access",
        "request_id": request_id,
        "title": "🔐 Demande d'accès à distance",
        "message": f"Le support Flowtym demande un accès temporaire ({request.requested_duration_minutes} min) pour vous aider. Module: {request.module}",
        "reason": request.reason,
        "read": False,
        "requires_action": True,
        "created_at": datetime.now(timezone.utc)
    }
    await database.notifications.insert_one(notification)
    
    return {
        "success": True,
        "request_id": request_id,
        "status": "pending",
        "message": "Demande envoyée à l'hôtel. En attente d'approbation."
    }

@router.get("/requests", response_model=dict)
async def get_all_access_requests(status: Optional[str] = None, support_user_id: str = "support"):
    """Get all remote access requests for support agent"""
    database = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    cursor = database.remote_access_requests.find(query).sort("created_at", -1).limit(50)
    requests = []
    async for req in cursor:
        req["id"] = str(req.pop("_id"))
        # Convert datetime to string
        for field in ["created_at", "expires_at", "approved_at", "session_started_at", "session_ended_at"]:
            if req.get(field) and hasattr(req[field], "isoformat"):
                req[field] = req[field].isoformat()
        requests.append(req)
    
    return {"requests": requests}

@router.get("/requests/{request_id}", response_model=dict)
async def get_access_request(request_id: str):
    """Get details of a specific remote access request"""
    database = get_db()
    
    req = await database.remote_access_requests.find_one({"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    req["id"] = str(req.pop("_id"))
    for field in ["created_at", "expires_at", "approved_at", "session_started_at", "session_ended_at"]:
        if req.get(field) and hasattr(req[field], "isoformat"):
            req[field] = req[field].isoformat()
    
    return req

# ===== HOTEL APPROVAL =====

@router.post("/requests/{request_id}/approve", response_model=dict)
async def approve_remote_access(request_id: str, user_id: str = "hotel_admin", duration_minutes: int = 15):
    """Hotel approves the remote access request"""
    database = get_db()
    
    req = await database.remote_access_requests.find_one({"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cette demande n'est plus en attente")
    
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
    
    await database.remote_access_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc),
                "approved_by": user_id,
                "expires_at": expires_at
            }
        }
    )
    
    # Notify support agent
    notification = {
        "type": "support_notification",
        "notification_type": "access_approved",
        "request_id": request_id,
        "title": "✅ Accès approuvé",
        "message": f"L'hôtel a approuvé votre demande d'accès ({duration_minutes} min)",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await database.support_notifications.insert_one(notification)
    
    return {
        "success": True,
        "status": "approved",
        "expires_at": expires_at.isoformat(),
        "access_token": req["access_token"]
    }

@router.post("/requests/{request_id}/reject", response_model=dict)
async def reject_remote_access(request_id: str, user_id: str = "hotel_admin", reason: str = ""):
    """Hotel rejects the remote access request"""
    database = get_db()
    
    req = await database.remote_access_requests.find_one({"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    await database.remote_access_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.now(timezone.utc),
                "rejected_by": user_id,
                "rejection_reason": reason
            }
        }
    )
    
    return {"success": True, "status": "rejected"}

# ===== SESSION MANAGEMENT =====

@router.post("/session/start/{request_id}", response_model=dict)
async def start_remote_session(request_id: str):
    """Support agent starts the remote viewing session"""
    database = get_db()
    
    req = await database.remote_access_requests.find_one({"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if req["status"] != "approved":
        raise HTTPException(status_code=400, detail="L'accès n'a pas été approuvé")
    
    if req.get("expires_at") and req["expires_at"] < datetime.now(timezone.utc):
        await database.remote_access_requests.update_one(
            {"request_id": request_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="La session a expiré")
    
    await database.remote_access_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "active",
                "session_started_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Create notification for hotel that session started
    notification = {
        "hotel_id": req["hotel_id"],
        "type": "remote_access_active",
        "notification_type": "session_started",
        "request_id": request_id,
        "title": "👁️ Session de support active",
        "message": "Le support Flowtym visualise actuellement votre interface",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await database.notifications.insert_one(notification)
    
    return {
        "success": True,
        "status": "active",
        "hotel_id": req["hotel_id"],
        "module": req["module"],
        "access_token": req["access_token"],
        "expires_at": req["expires_at"].isoformat() if req.get("expires_at") else None
    }

@router.post("/session/end/{request_id}", response_model=dict)
async def end_remote_session(request_id: str, notes: str = ""):
    """End the remote viewing session"""
    database = get_db()
    
    await database.remote_access_requests.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "completed",
                "session_ended_at": datetime.now(timezone.utc),
                "session_notes": notes
            }
        }
    )
    
    req = await database.remote_access_requests.find_one({"request_id": request_id})
    
    # Notify hotel that session ended
    notification = {
        "hotel_id": req["hotel_id"],
        "type": "remote_access_ended",
        "notification_type": "session_ended",
        "request_id": request_id,
        "title": "✅ Session de support terminée",
        "message": "Le support Flowtym a terminé la visualisation de votre interface",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await database.notifications.insert_one(notification)
    
    return {"success": True, "status": "completed"}

# ===== SCREENSHOT CAPTURE (for periodic screenshots) =====

@router.post("/session/{request_id}/screenshot", response_model=dict)
async def save_session_screenshot(request_id: str, screenshot_url: str, page_url: str):
    """Save a screenshot from the remote session"""
    database = get_db()
    
    screenshot = {
        "request_id": request_id,
        "screenshot_url": screenshot_url,
        "page_url": page_url,
        "captured_at": datetime.now(timezone.utc)
    }
    
    await database.remote_session_screenshots.insert_one(screenshot)
    
    # Also update the request with latest screenshot
    await database.remote_access_requests.update_one(
        {"request_id": request_id},
        {"$set": {"latest_screenshot": screenshot_url, "latest_screenshot_at": datetime.now(timezone.utc)}}
    )
    
    return {"success": True}

@router.get("/session/{request_id}/screenshots", response_model=dict)
async def get_session_screenshots(request_id: str):
    """Get all screenshots from a remote session"""
    database = get_db()
    
    cursor = database.remote_session_screenshots.find({"request_id": request_id}).sort("captured_at", 1)
    screenshots = []
    async for ss in cursor:
        ss["id"] = str(ss.pop("_id"))
        if ss.get("captured_at") and hasattr(ss["captured_at"], "isoformat"):
            ss["captured_at"] = ss["captured_at"].isoformat()
        screenshots.append(ss)
    
    return {"screenshots": screenshots}

# ===== SESSION REPLAY =====

@router.post("/replay/record", response_model=dict)
async def record_session_action(recording: SessionRecording):
    """Record user actions for session replay"""
    database = get_db()
    
    # Find or create session
    session = await database.session_recordings.find_one({
        "hotel_id": recording.hotel_id,
        "session_id": recording.session_id
    })
    
    if not session:
        session_doc = {
            "hotel_id": recording.hotel_id,
            "user_id": recording.user_id,
            "session_id": recording.session_id,
            "started_at": datetime.now(timezone.utc),
            "actions": [],
            "total_actions": 0
        }
        await database.session_recordings.insert_one(session_doc)
    
    # Add actions
    actions_to_add = [action.model_dump() for action in recording.actions]
    
    await database.session_recordings.update_one(
        {"session_id": recording.session_id},
        {
            "$push": {"actions": {"$each": actions_to_add}},
            "$inc": {"total_actions": len(actions_to_add)},
            "$set": {"last_action_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"success": True, "actions_recorded": len(actions_to_add)}

@router.get("/replay/sessions/{hotel_id}", response_model=dict)
async def get_hotel_sessions(hotel_id: str, limit: int = 20):
    """Get recorded sessions for a hotel"""
    database = get_db()
    
    cursor = database.session_recordings.find(
        {"hotel_id": hotel_id},
        {"actions": 0}  # Exclude actions for performance
    ).sort("started_at", -1).limit(limit)
    
    sessions = []
    async for session in cursor:
        session["id"] = str(session.pop("_id"))
        for field in ["started_at", "last_action_at"]:
            if session.get(field) and hasattr(session[field], "isoformat"):
                session[field] = session[field].isoformat()
        sessions.append(session)
    
    return {"sessions": sessions}

@router.get("/replay/session/{session_id}", response_model=dict)
async def get_session_replay(session_id: str):
    """Get full session recording for replay"""
    database = get_db()
    
    session = await database.session_recordings.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    session["id"] = str(session.pop("_id"))
    for field in ["started_at", "last_action_at"]:
        if session.get(field) and hasattr(session[field], "isoformat"):
            session[field] = session[field].isoformat()
    
    return session

# ===== SUPPORT AGENT STATS =====

@router.get("/stats", response_model=dict)
async def get_remote_access_stats():
    """Get statistics about remote access sessions"""
    database = get_db()
    
    # Count by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    status_counts = {}
    async for doc in database.remote_access_requests.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    # Recent sessions
    cursor = database.remote_access_requests.find().sort("created_at", -1).limit(10)
    recent = []
    async for req in cursor:
        req["id"] = str(req.pop("_id"))
        for field in ["created_at", "expires_at", "approved_at", "session_started_at", "session_ended_at"]:
            if req.get(field) and hasattr(req[field], "isoformat"):
                req[field] = req[field].isoformat()
        recent.append(req)
    
    return {
        "total_requests": sum(status_counts.values()),
        "pending": status_counts.get("pending", 0),
        "approved": status_counts.get("approved", 0),
        "active": status_counts.get("active", 0),
        "completed": status_counts.get("completed", 0),
        "rejected": status_counts.get("rejected", 0),
        "expired": status_counts.get("expired", 0),
        "recent_requests": recent
    }
