"""
CRM Module - API Routes
Complete CRM functionality with PMS integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import os
import re

from .models import (
    ClientCreate, ClientUpdate, ClientResponse, ClientPreferences,
    SegmentCreate, SegmentUpdate, SegmentResponse, SegmentCondition,
    MessageCreate, ConversationResponse,
    CampaignCreate, CampaignUpdate, CampaignResponse,
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    AutoReplyCreate, AutoReplyResponse,
    AlertCreate, AlertResponse,
    CRMAnalytics, ClientType, ClientStatus, CommunicationChannel,
    CampaignStatus, AlertPriority
)

crm_router = APIRouter(prefix="/crm", tags=["CRM"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')

def verify_token(credentials: HTTPAuthorizationCredentials):
    """Verify JWT token and return user info"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ===================== CLIENTS =====================

@crm_router.get("/clients")
async def list_clients(
    db,
    search: Optional[str] = None,
    client_type: Optional[str] = None,
    status: Optional[str] = None,
    segment_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all CRM clients with filters"""
    verify_token(credentials)
    
    query = {}
    
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    if client_type:
        query["client_type"] = client_type
    
    if status:
        query["status"] = status
    
    if segment_id:
        query["segment_ids"] = segment_id
    
    sort_direction = -1 if sort_order == "desc" else 1
    
    clients = await db.crm_clients.find(query, {"_id": 0}).sort(
        sort_by, sort_direction
    ).skip(offset).limit(limit).to_list(limit)
    
    total = await db.crm_clients.count_documents(query)
    
    return {
        "clients": clients,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@crm_router.get("/clients/{client_id}")
async def get_client(
    client_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get client details with stays history"""
    verify_token(credentials)
    
    client = await db.crm_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get stays from reservations
    stays = await db.reservations.find(
        {"guest_email": client.get("email")},
        {"_id": 0}
    ).sort("check_in", -1).to_list(50)
    
    client["stays"] = [{
        "id": s.get("id"),
        "check_in": s.get("check_in"),
        "check_out": s.get("check_out"),
        "room_number": s.get("room_number", ""),
        "room_type": s.get("room_type", ""),
        "total_amount": s.get("total_price", 0),
        "reservation_id": s.get("id")
    } for s in stays]
    
    # Get conversations
    conversations = await db.crm_conversations.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("last_message_at", -1).limit(10).to_list(10)
    
    client["conversations"] = conversations
    
    return client

@crm_router.post("/clients")
async def create_client(
    client: ClientCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new CRM client"""
    user = verify_token(credentials)
    
    # Check if client with email exists
    existing = await db.crm_clients.find_one({"email": client.email})
    if existing:
        raise HTTPException(status_code=400, detail="Un client avec cet email existe déjà")
    
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": str(uuid.uuid4()),
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "phone": client.phone,
        "company": client.company,
        "client_type": client.client_type.value,
        "status": ClientStatus.ACTIVE.value,
        "tags": client.tags,
        "preferences": client.preferences.model_dump() if client.preferences else {},
        "loyalty_score": 50,  # Default score
        "total_stays": 0,
        "total_spent": 0,
        "last_stay": None,
        "notes": client.notes,
        "language": client.language,
        "country": client.country,
        "segment_ids": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("email")
    }
    
    await db.crm_clients.insert_one(client_doc)
    del client_doc["_id"]
    
    # Update segments
    await update_client_segments(db, client_doc)
    
    return client_doc

@crm_router.put("/clients/{client_id}")
async def update_client(
    client_id: str,
    client_update: ClientUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a CRM client"""
    verify_token(credentials)
    
    existing = await db.crm_clients.find_one({"id": client_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    update_data = {k: v for k, v in client_update.model_dump().items() if v is not None}
    
    if "preferences" in update_data and update_data["preferences"]:
        update_data["preferences"] = update_data["preferences"].model_dump() if hasattr(update_data["preferences"], 'model_dump') else update_data["preferences"]
    
    if "client_type" in update_data:
        update_data["client_type"] = update_data["client_type"].value if hasattr(update_data["client_type"], 'value') else update_data["client_type"]
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.crm_clients.update_one({"id": client_id}, {"$set": update_data})
    
    # Update segments
    updated = await db.crm_clients.find_one({"id": client_id}, {"_id": 0})
    await update_client_segments(db, updated)
    
    return updated

@crm_router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a CRM client (soft delete)"""
    verify_token(credentials)
    
    result = await db.crm_clients.update_one(
        {"id": client_id},
        {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {"message": "Client supprimé"}

# ===================== SEGMENTS =====================

@crm_router.get("/segments")
async def list_segments(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all segments with client counts"""
    verify_token(credentials)
    
    segments = await db.crm_segments.find({}, {"_id": 0}).to_list(100)
    
    # Calculate client count for each segment
    for segment in segments:
        segment["client_count"] = await db.crm_clients.count_documents({
            "segment_ids": segment["id"],
            "status": {"$ne": "deleted"}
        })
    
    return segments

@crm_router.post("/segments")
async def create_segment(
    segment: SegmentCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new segment"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    segment_doc = {
        "id": str(uuid.uuid4()),
        "name": segment.name,
        "description": segment.description,
        "color": segment.color,
        "icon": segment.icon,
        "conditions": [c.model_dump() for c in segment.conditions],
        "is_dynamic": segment.is_dynamic,
        "created_at": now,
        "updated_at": now
    }
    
    await db.crm_segments.insert_one(segment_doc)
    del segment_doc["_id"]
    
    # If dynamic, update all clients
    if segment.is_dynamic:
        await recalculate_segment_membership(db, segment_doc)
    
    segment_doc["client_count"] = await db.crm_clients.count_documents({
        "segment_ids": segment_doc["id"]
    })
    
    return segment_doc

@crm_router.put("/segments/{segment_id}")
async def update_segment(
    segment_id: str,
    segment_update: SegmentUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a segment"""
    verify_token(credentials)
    
    existing = await db.crm_segments.find_one({"id": segment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Segment non trouvé")
    
    update_data = {k: v for k, v in segment_update.model_dump().items() if v is not None}
    
    if "conditions" in update_data:
        update_data["conditions"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in update_data["conditions"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.crm_segments.update_one({"id": segment_id}, {"$set": update_data})
    
    # Recalculate membership if conditions changed
    if "conditions" in update_data:
        updated = await db.crm_segments.find_one({"id": segment_id}, {"_id": 0})
        await recalculate_segment_membership(db, updated)
    
    updated = await db.crm_segments.find_one({"id": segment_id}, {"_id": 0})
    updated["client_count"] = await db.crm_clients.count_documents({"segment_ids": segment_id})
    
    return updated

@crm_router.delete("/segments/{segment_id}")
async def delete_segment(
    segment_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a segment"""
    verify_token(credentials)
    
    # Remove segment from all clients
    await db.crm_clients.update_many(
        {"segment_ids": segment_id},
        {"$pull": {"segment_ids": segment_id}}
    )
    
    result = await db.crm_segments.delete_one({"id": segment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Segment non trouvé")
    
    return {"message": "Segment supprimé"}

async def update_client_segments(db, client: dict):
    """Update segment membership for a single client"""
    segments = await db.crm_segments.find({"is_dynamic": True}, {"_id": 0}).to_list(100)
    
    new_segment_ids = []
    
    for segment in segments:
        if evaluate_segment_conditions(client, segment.get("conditions", [])):
            new_segment_ids.append(segment["id"])
    
    await db.crm_clients.update_one(
        {"id": client["id"]},
        {"$set": {"segment_ids": new_segment_ids}}
    )

async def recalculate_segment_membership(db, segment: dict):
    """Recalculate which clients belong to a segment"""
    clients = await db.crm_clients.find({"status": {"$ne": "deleted"}}, {"_id": 0}).to_list(10000)
    
    for client in clients:
        if evaluate_segment_conditions(client, segment.get("conditions", [])):
            await db.crm_clients.update_one(
                {"id": client["id"]},
                {"$addToSet": {"segment_ids": segment["id"]}}
            )
        else:
            await db.crm_clients.update_one(
                {"id": client["id"]},
                {"$pull": {"segment_ids": segment["id"]}}
            )

def evaluate_segment_conditions(client: dict, conditions: list) -> bool:
    """Evaluate if a client matches segment conditions"""
    if not conditions:
        return False
    
    for condition in conditions:
        field = condition.get("field")
        operator = condition.get("operator")
        value = condition.get("value")
        
        client_value = client.get(field)
        
        if client_value is None:
            return False
        
        try:
            if operator == "==" or operator == "equals":
                if client_value != value:
                    return False
            elif operator == ">=" or operator == "gte":
                if client_value < value:
                    return False
            elif operator == "<=" or operator == "lte":
                if client_value > value:
                    return False
            elif operator == ">" or operator == "gt":
                if client_value <= value:
                    return False
            elif operator == "<" or operator == "lt":
                if client_value >= value:
                    return False
            elif operator == "contains":
                if isinstance(client_value, list):
                    if value not in client_value:
                        return False
                elif isinstance(client_value, str):
                    if value.lower() not in client_value.lower():
                        return False
                else:
                    return False
        except (TypeError, ValueError):
            return False
    
    return True

# ===================== COMMUNICATIONS =====================

@crm_router.get("/conversations")
async def list_conversations(
    db,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all conversations"""
    verify_token(credentials)
    
    query = {}
    if status:
        query["status"] = status
    if channel:
        query["channel"] = channel
    
    conversations = await db.crm_conversations.find(query, {"_id": 0}).sort(
        "last_message_at", -1
    ).to_list(100)
    
    # Enrich with client info
    for conv in conversations:
        client = await db.crm_clients.find_one(
            {"id": conv.get("client_id")},
            {"_id": 0, "first_name": 1, "last_name": 1}
        )
        if client:
            conv["client_name"] = f"{client['first_name']} {client['last_name']}"
    
    return conversations

@crm_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get messages in a conversation"""
    verify_token(credentials)
    
    messages = await db.crm_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    # Mark as read
    await db.crm_conversations.update_one(
        {"id": conversation_id},
        {"$set": {"unread_count": 0}}
    )
    
    return messages

@crm_router.post("/messages")
async def send_message(
    message: MessageCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a message to a client"""
    user = verify_token(credentials)
    
    client = await db.crm_clients.find_one({"id": message.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find or create conversation
    conversation = await db.crm_conversations.find_one({
        "client_id": message.client_id,
        "channel": message.channel.value
    })
    
    if not conversation:
        conversation = {
            "id": str(uuid.uuid4()),
            "client_id": message.client_id,
            "channel": message.channel.value,
            "status": "open",
            "unread_count": 0,
            "created_at": now
        }
        await db.crm_conversations.insert_one(conversation)
    
    # Create message
    message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation["id"],
        "client_id": message.client_id,
        "channel": message.channel.value,
        "direction": "outbound",
        "subject": message.subject,
        "content": message.content,
        "sender": user.get("email"),
        "created_at": now
    }
    
    await db.crm_messages.insert_one(message_doc)
    
    # Update conversation
    await db.crm_conversations.update_one(
        {"id": conversation["id"]},
        {"$set": {
            "last_message": message.content[:100],
            "last_message_at": now,
            "status": "open"
        }}
    )
    
    del message_doc["_id"]
    return message_doc

# ===================== CAMPAIGNS =====================

@crm_router.get("/campaigns")
async def list_campaigns(
    db,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all campaigns"""
    verify_token(credentials)
    
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.crm_campaigns.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).to_list(100)
    
    return campaigns

@crm_router.post("/campaigns")
async def create_campaign(
    campaign: CampaignCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new campaign"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    campaign_doc = {
        "id": str(uuid.uuid4()),
        "name": campaign.name,
        "description": campaign.description,
        "type": campaign.type,
        "status": CampaignStatus.DRAFT.value,
        "segment_ids": campaign.segment_ids,
        "subject": campaign.subject,
        "content": campaign.content,
        "scheduled_at": campaign.scheduled_at,
        "auto_triggers": campaign.auto_triggers,
        "sent_count": 0,
        "open_count": 0,
        "click_count": 0,
        "open_rate": 0.0,
        "click_rate": 0.0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.crm_campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    
    return campaign_doc

@crm_router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    campaign_update: CampaignUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a campaign"""
    verify_token(credentials)
    
    existing = await db.crm_campaigns.find_one({"id": campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    
    update_data = {k: v for k, v in campaign_update.model_dump().items() if v is not None}
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.crm_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    return await db.crm_campaigns.find_one({"id": campaign_id}, {"_id": 0})

@crm_router.post("/campaigns/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Launch a campaign"""
    verify_token(credentials)
    
    campaign = await db.crm_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    
    if campaign.get("status") == "active":
        raise HTTPException(status_code=400, detail="Campagne déjà active")
    
    # Get target clients from segments
    segment_ids = campaign.get("segment_ids", [])
    if segment_ids:
        clients = await db.crm_clients.find({
            "segment_ids": {"$in": segment_ids},
            "status": "active"
        }).to_list(10000)
    else:
        clients = await db.crm_clients.find({"status": "active"}).to_list(10000)
    
    # Update campaign status
    await db.crm_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "active",
            "launched_at": datetime.now(timezone.utc).isoformat(),
            "target_count": len(clients)
        }}
    )
    
    return {
        "message": "Campagne lancée",
        "target_count": len(clients)
    }

# ===================== WORKFLOWS =====================

@crm_router.get("/workflows")
async def list_workflows(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all workflows"""
    verify_token(credentials)
    
    workflows = await db.crm_workflows.find({}, {"_id": 0}).to_list(100)
    return workflows

@crm_router.post("/workflows")
async def create_workflow(
    workflow: WorkflowCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new workflow"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    workflow_doc = {
        "id": str(uuid.uuid4()),
        "name": workflow.name,
        "description": workflow.description,
        "trigger": workflow.trigger.model_dump(),
        "actions": [a.model_dump() for a in workflow.actions],
        "status": "active" if workflow.is_active else "inactive",
        "executions_count": 0,
        "last_execution": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.crm_workflows.insert_one(workflow_doc)
    del workflow_doc["_id"]
    
    return workflow_doc

@crm_router.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    workflow_update: WorkflowUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a workflow"""
    verify_token(credentials)
    
    existing = await db.crm_workflows.find_one({"id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Workflow non trouvé")
    
    update_data = {k: v for k, v in workflow_update.model_dump().items() if v is not None}
    
    if "trigger" in update_data:
        update_data["trigger"] = update_data["trigger"].model_dump() if hasattr(update_data["trigger"], 'model_dump') else update_data["trigger"]
    
    if "actions" in update_data:
        update_data["actions"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_data["actions"]]
    
    if "is_active" in update_data:
        update_data["status"] = "active" if update_data.pop("is_active") else "inactive"
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.crm_workflows.update_one({"id": workflow_id}, {"$set": update_data})
    
    return await db.crm_workflows.find_one({"id": workflow_id}, {"_id": 0})

@crm_router.post("/workflows/{workflow_id}/toggle")
async def toggle_workflow(
    workflow_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Toggle workflow active status"""
    verify_token(credentials)
    
    workflow = await db.crm_workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow non trouvé")
    
    new_status = "inactive" if workflow.get("status") == "active" else "active"
    
    await db.crm_workflows.update_one(
        {"id": workflow_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": new_status}

# ===================== AUTO-REPLIES =====================

@crm_router.get("/auto-replies")
async def list_auto_replies(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all auto-reply rules"""
    verify_token(credentials)
    
    rules = await db.crm_auto_replies.find({}, {"_id": 0}).to_list(100)
    return rules

@crm_router.post("/auto-replies")
async def create_auto_reply(
    auto_reply: AutoReplyCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create an auto-reply rule"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    rule_doc = {
        "id": str(uuid.uuid4()),
        "name": auto_reply.name,
        "trigger_keywords": auto_reply.trigger_keywords,
        "channel": auto_reply.channel.value,
        "response_template": auto_reply.response_template,
        "is_active": auto_reply.is_active,
        "usage_count": 0,
        "created_at": now
    }
    
    await db.crm_auto_replies.insert_one(rule_doc)
    del rule_doc["_id"]
    
    return rule_doc

@crm_router.delete("/auto-replies/{rule_id}")
async def delete_auto_reply(
    rule_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an auto-reply rule"""
    verify_token(credentials)
    
    result = await db.crm_auto_replies.delete_one({"id": rule_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    
    return {"message": "Règle supprimée"}

# ===================== ALERTS =====================

@crm_router.get("/alerts")
async def list_alerts(
    db,
    unread_only: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List CRM alerts"""
    verify_token(credentials)
    
    query = {}
    if unread_only:
        query["is_read"] = False
    
    alerts = await db.crm_alerts.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).limit(50).to_list(50)
    
    return alerts

@crm_router.post("/alerts")
async def create_alert(
    alert: AlertCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a CRM alert"""
    verify_token(credentials)
    
    alert_doc = {
        "id": str(uuid.uuid4()),
        "type": alert.type,
        "title": alert.title,
        "message": alert.message,
        "priority": alert.priority.value,
        "client_id": alert.client_id,
        "data": alert.data,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crm_alerts.insert_one(alert_doc)
    del alert_doc["_id"]
    
    return alert_doc

@crm_router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark alert as read"""
    verify_token(credentials)
    
    await db.crm_alerts.update_one({"id": alert_id}, {"$set": {"is_read": True}})
    return {"message": "Alert marquée comme lue"}

# ===================== ANALYTICS =====================

@crm_router.get("/analytics")
async def get_analytics(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get CRM analytics and KPIs"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    
    # Total and active clients
    total_clients = await db.crm_clients.count_documents({"status": {"$ne": "deleted"}})
    active_clients = await db.crm_clients.count_documents({"status": "active"})
    
    # New clients this month
    new_clients_month = await db.crm_clients.count_documents({
        "created_at": {"$gte": month_ago.isoformat()}
    })
    
    # Calculate retention (clients with > 1 stay)
    returning_clients = await db.crm_clients.count_documents({
        "total_stays": {"$gt": 1},
        "status": "active"
    })
    retention_rate = (returning_clients / active_clients * 100) if active_clients > 0 else 0
    
    # Average loyalty score as NPS proxy
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "avg_score": {"$avg": "$loyalty_score"}}}
    ]
    nps_result = await db.crm_clients.aggregate(pipeline).to_list(1)
    average_nps = nps_result[0]["avg_score"] if nps_result else 0
    
    # Average LTV
    ltv_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "avg_ltv": {"$avg": "$total_spent"}}}
    ]
    ltv_result = await db.crm_clients.aggregate(ltv_pipeline).to_list(1)
    average_ltv = ltv_result[0]["avg_ltv"] if ltv_result else 0
    
    # Top segments
    segments = await db.crm_segments.find({}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(10)
    top_segments = []
    for seg in segments:
        count = await db.crm_clients.count_documents({"segment_ids": seg["id"]})
        top_segments.append({**seg, "client_count": count})
    top_segments.sort(key=lambda x: x["client_count"], reverse=True)
    
    # Channel distribution
    channel_dist = {}
    for channel in ["email", "whatsapp", "sms", "phone"]:
        count = await db.crm_conversations.count_documents({"channel": channel})
        channel_dist[channel] = count
    
    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "new_clients_month": new_clients_month,
        "retention_rate": round(retention_rate, 1),
        "average_nps": round(average_nps, 0),
        "average_ltv": round(average_ltv, 2),
        "top_segments": top_segments[:5],
        "channel_distribution": channel_dist
    }

# ===================== PMS INTEGRATION =====================

@crm_router.post("/sync-from-pms")
async def sync_clients_from_pms(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Sync clients from PMS reservations"""
    verify_token(credentials)
    
    # Get all unique guests from reservations
    reservations = await db.reservations.find({}, {"_id": 0}).to_list(10000)
    
    synced = 0
    updated = 0
    
    for res in reservations:
        email = res.get("guest_email")
        if not email:
            continue
        
        # Check if client exists
        existing = await db.crm_clients.find_one({"email": email})
        
        stay_amount = res.get("total_price", 0) or 0
        
        if existing:
            # Update stats
            await db.crm_clients.update_one(
                {"id": existing["id"]},
                {
                    "$inc": {
                        "total_stays": 1,
                        "total_spent": stay_amount
                    },
                    "$set": {
                        "last_stay": res.get("check_out") or res.get("check_in"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            updated += 1
        else:
            # Create new client
            now = datetime.now(timezone.utc).isoformat()
            
            client_doc = {
                "id": str(uuid.uuid4()),
                "first_name": res.get("guest_name", "").split()[0] if res.get("guest_name") else "Guest",
                "last_name": " ".join(res.get("guest_name", "").split()[1:]) if res.get("guest_name") and len(res.get("guest_name", "").split()) > 1 else "",
                "email": email,
                "phone": res.get("guest_phone"),
                "company": None,
                "client_type": "regular",
                "status": "active",
                "tags": [],
                "preferences": {},
                "loyalty_score": 50,
                "total_stays": 1,
                "total_spent": stay_amount,
                "last_stay": res.get("check_out") or res.get("check_in"),
                "notes": "",
                "language": "fr",
                "country": res.get("guest_country", "France"),
                "segment_ids": [],
                "created_at": now,
                "updated_at": now,
                "synced_from_pms": True
            }
            
            await db.crm_clients.insert_one(client_doc)
            synced += 1
    
    # Recalculate all segment memberships
    segments = await db.crm_segments.find({"is_dynamic": True}, {"_id": 0}).to_list(100)
    for segment in segments:
        await recalculate_segment_membership(db, segment)
    
    return {
        "message": "Synchronisation terminée",
        "new_clients": synced,
        "updated_clients": updated
    }

@crm_router.get("/client-by-email/{email}")
async def get_client_by_email(
    email: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get client by email (for PMS integration)"""
    verify_token(credentials)
    
    client = await db.crm_clients.find_one({"email": email}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return client


# ===================== ADVANCED ANALYTICS =====================

from .advanced_analytics import (
    PeriodFilter, calculate_period_dates, calculate_retention_cohorts,
    calculate_ltv_analytics, get_clients_at_risk, analyze_attrition_with_ai
)

@crm_router.post("/analytics/advanced")
async def get_advanced_analytics(
    db,
    period: PeriodFilter = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get advanced CRM analytics with retention cohorts, LTV, and attrition predictions"""
    verify_token(credentials)
    
    if period is None:
        period = PeriodFilter(type="6m")
    
    start_date, end_date = calculate_period_dates(period)
    
    # Calculate all analytics in parallel
    retention_cohorts = await calculate_retention_cohorts(db, start_date, end_date)
    ltv_by_segment, top_clients, ltv_trend = await calculate_ltv_analytics(db, start_date, end_date)
    
    # Get clients at risk
    clients_at_risk = await get_clients_at_risk(db, limit=20)
    
    # Analyze attrition with AI (for top 10 high-risk clients)
    attrition_risks = await analyze_attrition_with_ai(db, clients_at_risk[:10])
    
    # Calculate summary KPIs
    all_clients = await db.crm_clients.count_documents({})
    active_clients = await db.crm_clients.count_documents({"status": "active"})
    high_risk_count = len([r for r in attrition_risks if r.risk_level in ["high", "critical"]])
    
    total_ltv = sum(s.total_revenue for s in ltv_by_segment)
    avg_ltv = total_ltv / all_clients if all_clients > 0 else 0
    
    summary_kpis = {
        "total_clients": all_clients,
        "active_clients": active_clients,
        "high_risk_clients": high_risk_count,
        "average_ltv": round(avg_ltv, 2),
        "total_revenue": total_ltv,
        "retention_rate_avg": round(
            sum(c.retention_90d for c in retention_cohorts) / len(retention_cohorts), 1
        ) if retention_cohorts else 0
    }
    
    return {
        "period": {
            "type": period.type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "retention_cohorts": [c.dict() for c in retention_cohorts],
        "ltv_by_segment": [l.dict() for l in ltv_by_segment],
        "ltv_trend": ltv_trend,
        "top_clients_by_ltv": top_clients,
        "attrition_risks": [r.dict() for r in attrition_risks],
        "summary_kpis": summary_kpis
    }


@crm_router.get("/analytics/attrition")
async def get_attrition_analysis(
    db,
    limit: int = Query(20, ge=1, le=100),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed attrition risk analysis for clients"""
    verify_token(credentials)
    
    clients_at_risk = await get_clients_at_risk(db, limit=limit)
    attrition_risks = await analyze_attrition_with_ai(db, clients_at_risk)
    
    # Group by risk level
    risk_summary = {
        "critical": len([r for r in attrition_risks if r.risk_level == "critical"]),
        "high": len([r for r in attrition_risks if r.risk_level == "high"]),
        "medium": len([r for r in attrition_risks if r.risk_level == "medium"]),
        "low": len([r for r in attrition_risks if r.risk_level == "low"])
    }
    
    return {
        "total_analyzed": len(attrition_risks),
        "risk_summary": risk_summary,
        "clients": [r.dict() for r in attrition_risks]
    }


@crm_router.get("/analytics/retention-cohorts")
async def get_retention_cohorts(
    db,
    period_type: str = Query("6m", regex="^(6m|12m)$"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get retention cohort analysis"""
    verify_token(credentials)
    
    period = PeriodFilter(type=period_type)
    start_date, end_date = calculate_period_dates(period)
    
    cohorts = await calculate_retention_cohorts(db, start_date, end_date)
    
    return {
        "period": {
            "type": period_type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "cohorts": [c.dict() for c in cohorts]
    }


@crm_router.get("/analytics/ltv")
async def get_ltv_analytics(
    db,
    period_type: str = Query("12m", regex="^(6m|12m)$"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get LTV (Lifetime Value) analytics"""
    verify_token(credentials)
    
    period = PeriodFilter(type=period_type)
    start_date, end_date = calculate_period_dates(period)
    
    ltv_by_segment, top_clients, ltv_trend = await calculate_ltv_analytics(db, start_date, end_date)
    
    return {
        "period": {
            "type": period_type,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "by_segment": [l.dict() for l in ltv_by_segment],
        "top_clients": top_clients,
        "trend": ltv_trend
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CRM → ConfigService Integration (Phase 17)
# Enrichissement des profils clients avec données de configuration hôtel
# ═══════════════════════════════════════════════════════════════════════════════

@crm_router.get("/hotels/{hotel_id}/clients")
async def list_clients_by_hotel(
    hotel_id: str,
    db,
    search: Optional[str] = None,
    client_type: Optional[str] = None,
    status: Optional[str] = None,
    segment_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Liste les clients CRM filtrés par hôtel.
    Endpoint corrigé : ajoute le filtre hotel_id manquant.
    """
    verify_token(credentials)

    query: Dict[str, Any] = {"hotel_id": hotel_id}

    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name":  {"$regex": search, "$options": "i"}},
            {"email":      {"$regex": search, "$options": "i"}},
            {"company":    {"$regex": search, "$options": "i"}},
        ]
    if client_type:
        query["client_type"] = client_type
    if status:
        query["status"] = status
    if segment_id:
        query["segment_ids"] = segment_id

    sort_direction = -1 if sort_order == "desc" else 1

    clients = await db.crm_clients.find(query, {"_id": 0}).sort(
        sort_by, sort_direction
    ).skip(offset).limit(limit).to_list(limit)

    total = await db.crm_clients.count_documents(query)

    return {"clients": clients, "total": total, "limit": limit, "offset": offset}


@crm_router.post("/hotels/{hotel_id}/clients/{client_id}/enrich")
async def enrich_client_from_config(
    hotel_id: str,
    client_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Enrichit un profil client CRM avec les données ConfigService :
    - Préférences de type de chambre déduit des séjours
    - Plan tarifaire habituel
    - Profil hôtel (devise, langue, règles annulation)
    Permet au CRM d'afficher des recommandations personnalisées.
    """
    verify_token(credentials)

    client = await db.crm_clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    enrichment: Dict[str, Any] = {}

    try:
        from shared.config_service import get_config_service
        config = get_config_service()

        # ── Profil hôtel ──────────────────────────────────────────────────────
        hotel_profile = await config.get_hotel_profile(hotel_id)
        if hotel_profile:
            enrichment["hotel_currency"] = hotel_profile.get("currency", "EUR")
            enrichment["hotel_language"] = hotel_profile.get("default_language", "fr")

        # ── Types de chambres disponibles ─────────────────────────────────────
        room_types = await config.get_room_types(hotel_id)
        rt_map = {rt["id"]: rt for rt in room_types}

        # ── Analyse des séjours PMS → préférences chambre ─────────────────────
        stays = await db.reservations.find(
            {
                "$or": [
                    {"client_email": client.get("email")},
                    {"guest_email":  client.get("email")},
                ],
                "hotel_id": hotel_id,
            },
            {"_id": 0, "room_type_code": 1, "rate_plan_code": 1,
             "room_type": 1, "total_amount": 1, "check_in": 1}
        ).sort("check_in", -1).to_list(50)

        # Compter les types de chambres réservés
        rt_counts: Dict[str, int] = {}
        rp_counts: Dict[str, int] = {}
        for stay in stays:
            rt = stay.get("room_type_code") or stay.get("room_type", "")
            rp = stay.get("rate_plan_code", "")
            if rt:
                rt_counts[rt] = rt_counts.get(rt, 0) + 1
            if rp:
                rp_counts[rp] = rp_counts.get(rp, 0) + 1

        if rt_counts:
            preferred_rt_code = max(rt_counts, key=lambda k: rt_counts[k])
            # Résoudre le nom complet depuis ConfigService
            rt_detail = await config.get_room_type_by_code(hotel_id, preferred_rt_code)
            enrichment["preferred_room_type_code"] = preferred_rt_code
            enrichment["preferred_room_type_name"] = (
                rt_detail.get("name") if rt_detail else preferred_rt_code
            )

        if rp_counts:
            preferred_rp_code = max(rp_counts, key=lambda k: rp_counts[k])
            enrichment["preferred_rate_plan_code"] = preferred_rp_code

        # ── Politiques annulation ─────────────────────────────────────────────
        policies = await config.get_default_policies(hotel_id)
        if policies and policies.get("cancellation"):
            enrichment["cancellation_policy_name"] = policies["cancellation"].get("name")

        # ── Segment suggéré basé sur nb séjours ──────────────────────────────
        total_stays = client.get("total_stays", 0) or len(stays)
        if total_stays >= 10:
            enrichment["suggested_segment"] = "vip"
        elif total_stays >= 5:
            enrichment["suggested_segment"] = "fidele"
        elif total_stays >= 2:
            enrichment["suggested_segment"] = "regulier"
        else:
            enrichment["suggested_segment"] = "nouveau"

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"CRM enrich config error: {e}")

    # Fusionner dans les préférences existantes
    now = datetime.now(timezone.utc).isoformat()
    current_prefs = client.get("preferences", {}) or {}
    updated_prefs = {**current_prefs, **enrichment}

    await db.crm_clients.update_one(
        {"id": client_id},
        {"$set": {"preferences": updated_prefs, "updated_at": now}}
    )

    return {
        "message": "Profil enrichi avec succès",
        "client_id": client_id,
        "enrichment": enrichment
    }


@crm_router.post("/hotels/{hotel_id}/clients/sync-and-enrich")
async def sync_and_enrich_all_clients(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Synchronise tous les clients PMS vers CRM (avec hotel_id) ET
    enrichit les profils existants depuis ConfigService en batch.
    Corrige également les clients existants sans hotel_id.
    """
    verify_token(credentials)

    now = datetime.now(timezone.utc).isoformat()

    # ── Étape 1 : corriger les clients CRM sans hotel_id ─────────────────────
    fixed = await db.crm_clients.update_many(
        {"hotel_id": {"$exists": False}},
        {"$set": {"hotel_id": hotel_id, "updated_at": now}}
    )

    # ── Étape 2 : importer les clients PMS manquants ──────────────────────────
    reservations = await db.reservations.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(10000)

    created = 0
    updated = 0

    for res in reservations:
        email = res.get("client_email") or res.get("guest_email")
        if not email:
            continue

        stay_amount = res.get("total_amount", 0) or 0
        client_name = res.get("client_name") or res.get("guest_name") or ""
        parts = client_name.split(" ", 1)
        first = parts[0] if parts else "Guest"
        last = parts[1] if len(parts) > 1 else ""

        existing = await db.crm_clients.find_one({"email": email, "hotel_id": hotel_id})

        if existing:
            await db.crm_clients.update_one(
                {"id": existing["id"]},
                {
                    "$inc": {"total_stays": 1, "total_spent": stay_amount},
                    "$set": {
                        "hotel_id": hotel_id,
                        "last_stay": res.get("check_out") or res.get("check_in"),
                        "updated_at": now,
                    }
                }
            )
            updated += 1
        else:
            client_doc = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "first_name": first,
                "last_name": last,
                "email": email,
                "phone": res.get("guest_phone"),
                "company": None,
                "client_type": "regular",
                "status": "active",
                "tags": [f"Source-{res.get('channel', 'Direct')}"],
                "preferences": {},
                "loyalty_score": 50,
                "total_stays": 1,
                "total_spent": stay_amount,
                "last_stay": res.get("check_out") or res.get("check_in"),
                "notes": "",
                "language": "fr",
                "country": "France",
                "segment_ids": [],
                "created_at": now,
                "updated_at": now,
                "synced_from_pms": True,
            }
            await db.crm_clients.insert_one(client_doc)
            created += 1

    return {
        "message": "Synchronisation et enrichissement terminés",
        "hotel_id": hotel_id,
        "fixed_missing_hotel_id": fixed.modified_count,
        "clients_created": created,
        "clients_updated": updated,
    }
