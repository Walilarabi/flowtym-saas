"""
Flowtym AI Support Center - Routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import os
import random
import string

from .models import (
    TicketCreateRequest, TicketUpdateRequest, TicketMessageRequest,
    AIDiagnosticRequest, TicketResponse, AIDiagnosticResponse,
    SupportStatsResponse, TicketStatus, TicketPriority, TicketModule
)

router = APIRouter(prefix="/support", tags=["Support"])

# Database reference (will be set by main server)
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

def generate_ticket_id():
    """Generate unique ticket ID: FLW-2026-XXXXXX"""
    year = datetime.now().year
    random_part = ''.join(random.choices(string.digits, k=6))
    return f"FLW-{year}-{random_part}"

# ===== TICKETS =====

@router.post("/hotels/{hotel_id}/tickets", response_model=dict)
async def create_ticket(hotel_id: str, request: TicketCreateRequest):
    """Create a new support ticket"""
    database = get_db()
    
    ticket_id = generate_ticket_id()
    
    # Get user info from context if provided
    user_info = request.context or {}
    
    ticket = {
        "ticket_id": ticket_id,
        "hotel_id": hotel_id,
        "user_id": user_info.get("user_id", "unknown"),
        "user_name": user_info.get("user_name", "Unknown User"),
        "user_email": user_info.get("user_email", ""),
        "module": request.module.value,
        "title": request.title,
        "description": request.description,
        "status": TicketStatus.OPEN.value,
        "priority": TicketPriority.MEDIUM.value,
        "screenshot_url": request.screenshot_url,
        "context": {
            "current_page": user_info.get("current_page", ""),
            "browser": user_info.get("browser", ""),
            "timestamp": user_info.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "action_in_progress": user_info.get("action_in_progress", ""),
            "error_logs": user_info.get("error_logs", [])
        },
        "ai_diagnosis": None,
        "resolution_notes": None,
        "assigned_to": None,
        "messages": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "resolved_at": None
    }
    
    result = await database.support_tickets.insert_one(ticket)
    ticket["id"] = str(result.inserted_id)
    if "_id" in ticket:
        del ticket["_id"]
    
    return {"success": True, "ticket": ticket}

@router.get("/hotels/{hotel_id}/tickets", response_model=dict)
async def get_hotel_tickets(
    hotel_id: str, 
    status: Optional[str] = None,
    module: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all tickets for a hotel"""
    database = get_db()
    
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if module:
        query["module"] = module
    
    cursor = database.support_tickets.find(query).sort("created_at", -1).skip(skip).limit(limit)
    tickets = []
    async for ticket in cursor:
        ticket["id"] = str(ticket.pop("_id"))
        tickets.append(ticket)
    
    total = await database.support_tickets.count_documents(query)
    
    return {"tickets": tickets, "total": total}

@router.get("/hotels/{hotel_id}/tickets/{ticket_id}", response_model=dict)
async def get_ticket(hotel_id: str, ticket_id: str):
    """Get a specific ticket"""
    database = get_db()
    
    ticket = await database.support_tickets.find_one({
        "hotel_id": hotel_id,
        "$or": [{"ticket_id": ticket_id}, {"_id": ObjectId(ticket_id) if ObjectId.is_valid(ticket_id) else None}]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket["id"] = str(ticket.pop("_id"))
    return {"ticket": ticket}

@router.put("/hotels/{hotel_id}/tickets/{ticket_id}", response_model=dict)
async def update_ticket(hotel_id: str, ticket_id: str, request: TicketUpdateRequest):
    """Update a ticket"""
    database = get_db()
    
    # Get current ticket to check status change
    current_ticket = await database.support_tickets.find_one({
        "hotel_id": hotel_id, 
        "ticket_id": ticket_id
    })
    old_status = current_ticket.get("status") if current_ticket else None
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if request.status:
        update_data["status"] = request.status.value
        if request.status == TicketStatus.RESOLVED:
            update_data["resolved_at"] = datetime.now(timezone.utc)
    if request.priority:
        update_data["priority"] = request.priority.value
    if request.assigned_to is not None:
        update_data["assigned_to"] = request.assigned_to
    if request.resolution_notes:
        update_data["resolution_notes"] = request.resolution_notes
    
    result = await database.support_tickets.update_one(
        {"hotel_id": hotel_id, "ticket_id": ticket_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Create notification for status change
    if request.status and old_status and request.status.value != old_status:
        status_labels = {
            "open": "Ouvert",
            "in_progress": "En cours",
            "ai_processing": "Analyse IA",
            "resolved": "Résolu",
            "closed": "Fermé"
        }
        status_emojis = {
            "open": "📬",
            "in_progress": "🔄",
            "ai_processing": "🤖",
            "resolved": "✅",
            "closed": "📁"
        }
        new_status_label = status_labels.get(request.status.value, request.status.value)
        emoji = status_emojis.get(request.status.value, "📋")
        
        await create_support_notification(
            hotel_id=hotel_id,
            ticket_id=ticket_id,
            title=f"{emoji} Statut mis à jour",
            message=f"Le ticket {ticket_id} est passé en statut: {new_status_label}",
            notification_type="status_change"
        )
    
    return {"success": True, "message": "Ticket updated"}

@router.post("/hotels/{hotel_id}/tickets/{ticket_id}/messages", response_model=dict)
async def add_ticket_message(hotel_id: str, ticket_id: str, request: TicketMessageRequest):
    """Add a message to a ticket"""
    database = get_db()
    
    message = {
        "id": str(ObjectId()),
        "content": request.content,
        "is_internal": request.is_internal,
        "is_ai": False,
        "attachments": request.attachments or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await database.support_tickets.update_one(
        {"hotel_id": hotel_id, "ticket_id": ticket_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True, "message": message}

# ===== AI DIAGNOSTIC =====

@router.post("/hotels/{hotel_id}/diagnose", response_model=dict)
async def ai_diagnose(hotel_id: str, request: AIDiagnosticRequest):
    """Run AI diagnostic on an issue before creating ticket"""
    database = get_db()
    
    # Check knowledge base for known issues (may fail if collection/index doesn't exist)
    known_issues = []
    try:
        known_issues = await database.support_knowledge.find({
            "module": request.module.value,
            "$text": {"$search": request.description}
        }).limit(3).to_list(length=3)
    except Exception as kb_error:
        # Knowledge base not available, continue without it
        print(f"Knowledge base query failed: {kb_error}")
    
    # Use Emergent LLM for diagnosis
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        prompt = f"""Tu es un assistant support technique pour Flowtym, un PMS hôtelier.
        
Analyse ce problème et fournis un diagnostic:

Module: {request.module.value}
Description: {request.description}
Contexte: {request.context}
Logs: {request.error_logs or 'Non disponible'}

Réponds en JSON avec:
{{
    "is_known_issue": true/false,
    "issue_type": "bug|configuration|user_error|sync_issue|other",
    "suggested_solution": "Solution détaillée si possible",
    "auto_fixable": true/false,
    "confidence": 0.0-1.0,
    "recommendation": "Conseil pour l'utilisateur"
}}"""

        # Initialize chat with Emergent LLM Key
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"diagnose-{hotel_id}",
            system_message="Tu es un expert support technique pour Flowtym PMS. Réponds toujours en JSON valide."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response_text = await chat.send_message(user_message)
        
        import json
        try:
            # Extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                diagnosis = json.loads(response_text[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except:
            diagnosis = {
                "is_known_issue": False,
                "issue_type": "other",
                "suggested_solution": None,
                "auto_fixable": False,
                "confidence": 0.5,
                "recommendation": "Un agent va analyser votre problème."
            }
        
        # Add related articles
        diagnosis["related_articles"] = [
            {"id": str(a.get("_id", "")), "title": a.get("title", "")}
            for a in known_issues
        ]
        
        return {"success": True, "diagnosis": diagnosis}
        
    except Exception as e:
        # Fallback if AI not available
        return {
            "success": True,
            "diagnosis": {
                "is_known_issue": len(known_issues) > 0,
                "issue_type": "unknown",
                "suggested_solution": known_issues[0].get("solution") if known_issues else None,
                "auto_fixable": False,
                "confidence": 0.3,
                "related_articles": [
                    {"id": str(a.get("_id", "")), "title": a.get("title", "")}
                    for a in known_issues
                ],
                "recommendation": "Un agent va analyser votre problème."
            }
        }

@router.post("/hotels/{hotel_id}/tickets/{ticket_id}/ai-analyze", response_model=dict)
async def ai_analyze_ticket(hotel_id: str, ticket_id: str):
    """Have AI analyze and potentially resolve a ticket"""
    database = get_db()
    
    ticket = await database.support_tickets.find_one({
        "hotel_id": hotel_id,
        "ticket_id": ticket_id
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update status to AI processing
    await database.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": TicketStatus.AI_PROCESSING.value, "updated_at": datetime.now(timezone.utc)}}
    )
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        prompt = f"""Tu es un agent support IA pour Flowtym (PMS hôtelier).

Analyse ce ticket et propose une solution:

Ticket ID: {ticket['ticket_id']}
Module: {ticket['module']}
Titre: {ticket['title']}
Description: {ticket['description']}
Contexte: {ticket.get('context', {})}

Fournis:
1. Diagnostic précis
2. Solution étape par étape
3. Si tu peux résoudre automatiquement, indique-le

Réponds en français de manière claire et professionnelle."""

        # Initialize chat with Emergent LLM Key
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"support-{ticket_id}",
            system_message="Tu es un agent support IA expert pour Flowtym, un PMS hôtelier SaaS."
        ).with_model("openai", "gpt-4o")
        
        # Send message and get response
        user_message = UserMessage(text=prompt)
        ai_response = await chat.send_message(user_message)
        
        # Add AI message to ticket
        ai_message = {
            "id": str(ObjectId()),
            "content": ai_response,
            "is_internal": False,
            "is_ai": True,
            "attachments": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update ticket with AI diagnosis
        await database.support_tickets.update_one(
            {"ticket_id": ticket_id},
            {
                "$set": {
                    "status": TicketStatus.IN_PROGRESS.value,
                    "ai_diagnosis": {
                        "analyzed_at": datetime.now(timezone.utc).isoformat(),
                        "response": ai_response
                    },
                    "updated_at": datetime.now(timezone.utc)
                },
                "$push": {"messages": ai_message}
            }
        )
        
        # Create notification for AI response
        await create_support_notification(
            hotel_id=hotel_id,
            ticket_id=ticket_id,
            title="🤖 Réponse IA disponible",
            message=f"L'IA a analysé votre ticket {ticket_id} et propose une solution.",
            notification_type="ai_response"
        )
        
        return {"success": True, "ai_response": ai_response, "message": ai_message}
        
    except Exception as e:
        # Revert status on error
        await database.support_tickets.update_one(
            {"ticket_id": ticket_id},
            {"$set": {"status": TicketStatus.OPEN.value, "updated_at": datetime.now(timezone.utc)}}
        )
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# ===== KNOWLEDGE BASE =====

@router.get("/knowledge", response_model=dict)
async def get_knowledge_articles(
    module: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20
):
    """Get knowledge base articles"""
    database = get_db()
    
    query = {}
    if module:
        query["module"] = module
    if search:
        query["$text"] = {"$search": search}
    
    cursor = database.support_knowledge.find(query).sort("helpful_votes", -1).limit(limit)
    articles = []
    async for article in cursor:
        article["id"] = str(article.pop("_id"))
        articles.append(article)
    
    return {"articles": articles}

@router.post("/knowledge", response_model=dict)
async def create_knowledge_article(article: dict):
    """Create a knowledge base article (admin only)"""
    database = get_db()
    
    article_data = {
        **article,
        "views": 0,
        "helpful_votes": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await database.support_knowledge.insert_one(article_data)
    article_data["id"] = str(result.inserted_id)
    
    return {"success": True, "article": article_data}

# ===== STATS & DASHBOARD =====

@router.get("/stats", response_model=dict)
async def get_support_stats():
    """Get global support statistics (admin only)"""
    database = get_db()
    
    # Get ticket counts by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in database.support_tickets.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    # Get ticket counts by module
    pipeline = [
        {"$group": {"_id": "$module", "count": {"$sum": 1}}}
    ]
    module_counts = {}
    async for doc in database.support_tickets.aggregate(pipeline):
        module_counts[doc["_id"]] = doc["count"]
    
    # Get ticket counts by priority
    pipeline = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_counts = {}
    async for doc in database.support_tickets.aggregate(pipeline):
        priority_counts[doc["_id"]] = doc["count"]
    
    # Calculate average resolution time
    pipeline = [
        {"$match": {"resolved_at": {"$ne": None}}},
        {"$project": {
            "resolution_time": {"$subtract": ["$resolved_at", "$created_at"]}
        }},
        {"$group": {"_id": None, "avg": {"$avg": "$resolution_time"}}}
    ]
    avg_resolution = 0
    async for doc in database.support_tickets.aggregate(pipeline):
        avg_resolution = doc.get("avg", 0) / (1000 * 60 * 60) if doc.get("avg") else 0  # Convert to hours
    
    # Get recent tickets
    recent = []
    async for ticket in database.support_tickets.find().sort("created_at", -1).limit(10):
        ticket["id"] = str(ticket.pop("_id"))
        recent.append({
            "id": ticket["id"],
            "ticket_id": ticket["ticket_id"],
            "hotel_id": ticket["hotel_id"],
            "title": ticket["title"],
            "status": ticket["status"],
            "module": ticket["module"],
            "created_at": ticket["created_at"].isoformat() if isinstance(ticket["created_at"], datetime) else ticket["created_at"]
        })
    
    # Calculate AI resolution rate
    total_resolved = status_counts.get("resolved", 0) + status_counts.get("closed", 0)
    ai_resolved = await database.support_tickets.count_documents({
        "status": {"$in": ["resolved", "closed"]},
        "ai_diagnosis": {"$ne": None}
    })
    ai_rate = (ai_resolved / total_resolved * 100) if total_resolved > 0 else 0
    
    total_tickets = sum(status_counts.values())
    
    return {
        "total_tickets": total_tickets,
        "open_tickets": status_counts.get("open", 0),
        "in_progress_tickets": status_counts.get("in_progress", 0) + status_counts.get("ai_processing", 0),
        "resolved_tickets": total_resolved,
        "avg_resolution_time_hours": round(avg_resolution, 1),
        "ai_resolution_rate": round(ai_rate, 1),
        "tickets_by_module": module_counts,
        "tickets_by_priority": priority_counts,
        "recent_tickets": recent
    }

@router.get("/hotels/{hotel_id}/stats", response_model=dict)
async def get_hotel_support_stats(hotel_id: str):
    """Get support statistics for a specific hotel"""
    database = get_db()
    
    # Get ticket counts by status for this hotel
    pipeline = [
        {"$match": {"hotel_id": hotel_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in database.support_tickets.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    total_tickets = sum(status_counts.values())
    
    return {
        "total_tickets": total_tickets,
        "open_tickets": status_counts.get("open", 0),
        "in_progress_tickets": status_counts.get("in_progress", 0) + status_counts.get("ai_processing", 0),
        "resolved_tickets": status_counts.get("resolved", 0) + status_counts.get("closed", 0)
    }

# ===== NOTIFICATIONS =====

@router.get("/hotels/{hotel_id}/notifications", response_model=dict)
async def get_support_notifications(hotel_id: str, unread_only: bool = False):
    """Get support notifications for a hotel"""
    database = get_db()
    
    query = {"hotel_id": hotel_id, "type": "support"}
    if unread_only:
        query["read"] = False
    
    cursor = database.notifications.find(query).sort("created_at", -1).limit(20)
    notifications = []
    async for notif in cursor:
        notif["id"] = str(notif.pop("_id"))
        notifications.append(notif)
    
    return {"notifications": notifications}

@router.post("/hotels/{hotel_id}/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_read(hotel_id: str, notification_id: str):
    """Mark a notification as read"""
    database = get_db()
    
    await database.notifications.update_one(
        {"_id": ObjectId(notification_id), "hotel_id": hotel_id},
        {"$set": {"read": True}}
    )
    
    return {"success": True}

# Helper function to create notification
async def create_support_notification(hotel_id: str, ticket_id: str, title: str, message: str, notification_type: str = "info"):
    """Create a support notification"""
    database = get_db()
    
    notification = {
        "hotel_id": hotel_id,
        "type": "support",
        "notification_type": notification_type,  # ai_response, status_change, new_message
        "ticket_id": ticket_id,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await database.notifications.insert_one(notification)
    notification["id"] = str(result.inserted_id)
    return notification

@router.post("/hotels/{hotel_id}/notifications/read-all", response_model=dict)
async def mark_all_notifications_read(hotel_id: str):
    """Mark all notifications as read for a hotel"""
    database = get_db()
    
    result = await database.notifications.update_many(
        {"hotel_id": hotel_id, "type": "support", "read": False},
        {"$set": {"read": True}}
    )
    
    return {"success": True, "updated_count": result.modified_count}

@router.get("/hotels/{hotel_id}/notifications/count", response_model=dict)
async def get_unread_notifications_count(hotel_id: str):
    """Get count of unread notifications"""
    database = get_db()
    
    count = await database.notifications.count_documents({
        "hotel_id": hotel_id,
        "type": "support",
        "read": False
    })
    
    return {"unread_count": count}
