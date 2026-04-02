"""
Flowtym Operations Hub - Cahier de Consignes Intelligent
Backend API pour la gestion des consignes opérationnelles
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum
import os
import uuid

router = APIRouter(prefix="/consignes", tags=["Operations Hub"])

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

# ===== ENUMS =====

class ConsigneStatus(str, Enum):
    NOUVELLE = "nouvelle"
    A_FAIRE = "a_faire"
    EN_COURS = "en_cours"
    FAIT = "fait"
    FERMEE = "fermee"

class ConsignePriority(str, Enum):
    BASSE = "basse"
    NORMALE = "normale"
    HAUTE = "haute"
    URGENTE = "urgente"

class ConsigneService(str, Enum):
    RECEPTION = "reception"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    RESTAURATION = "restauration"
    DIRECTION = "direction"
    CONCIERGERIE = "conciergerie"
    SECURITE = "securite"
    AUTRE = "autre"

class RecurrenceType(str, Enum):
    NONE = "none"
    QUOTIDIENNE = "quotidienne"
    HEBDOMADAIRE = "hebdomadaire"
    MENSUELLE = "mensuelle"
    PERSONNALISEE = "personnalisee"

class TriggerSource(str, Enum):
    MANUAL = "manual"
    PMS_CHECKIN = "pms_checkin"
    PMS_CHECKOUT = "pms_checkout"
    PMS_VIP = "pms_vip"
    CRM_BIRTHDAY = "crm_birthday"
    CRM_PREFERENCE = "crm_preference"
    HOUSEKEEPING = "housekeeping"
    RESERVATION = "reservation"
    AI_SUGGESTION = "ai_suggestion"

# ===== MODELS =====

class ConsigneCreate(BaseModel):
    title: str
    description: str
    room_number: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    service: ConsigneService = ConsigneService.RECEPTION
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: ConsignePriority = ConsignePriority.NORMALE
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    recurrence_config: Optional[dict] = None
    requires_proof: bool = False
    attachments: List[str] = []
    tags: List[str] = []
    linked_reservation_id: Optional[str] = None

class ConsigneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    room_number: Optional[str] = None
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    service: Optional[ConsigneService] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: Optional[ConsignePriority] = None
    status: Optional[ConsigneStatus] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    proof_url: Optional[str] = None
    completion_notes: Optional[str] = None

class ConsigneFilter(BaseModel):
    status: Optional[str] = None
    service: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    room_number: Optional[str] = None
    search: Optional[str] = None

# ===== HELPER FUNCTIONS =====

def generate_consigne_id():
    """Generate unique consigne ID"""
    timestamp = datetime.now().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:6].upper()
    return f"CSG-{timestamp}-{unique}"

async def create_notification(hotel_id: str, user_id: str, title: str, message: str, consigne_id: str = None):
    """Create a notification for a user"""
    database = get_db()
    notification = {
        "hotel_id": hotel_id,
        "user_id": user_id,
        "type": "consigne",
        "title": title,
        "message": message,
        "consigne_id": consigne_id,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await database.notifications.insert_one(notification)

# ===== CRUD ENDPOINTS =====

@router.post("/hotels/{hotel_id}/consignes", response_model=dict)
async def create_consigne(hotel_id: str, data: ConsigneCreate, created_by: str = "system", created_by_name: str = "Système"):
    """Create a new consigne"""
    database = get_db()
    
    consigne_id = generate_consigne_id()
    
    consigne = {
        "consigne_id": consigne_id,
        "hotel_id": hotel_id,
        "title": data.title,
        "description": data.description,
        "room_number": data.room_number,
        "client_id": data.client_id,
        "client_name": data.client_name,
        "service": data.service.value,
        "assigned_to": data.assigned_to,
        "assigned_to_name": data.assigned_to_name,
        "priority": data.priority.value,
        "status": ConsigneStatus.NOUVELLE.value,
        "due_date": data.due_date,
        "due_time": data.due_time,
        "recurrence": data.recurrence.value,
        "recurrence_config": data.recurrence_config,
        "requires_proof": data.requires_proof,
        "proof_url": None,
        "attachments": data.attachments,
        "tags": data.tags,
        "linked_reservation_id": data.linked_reservation_id,
        "trigger_source": TriggerSource.MANUAL.value,
        "created_by": created_by,
        "created_by_name": created_by_name,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "started_at": None,
        "completed_at": None,
        "validated_at": None,
        "validated_by": None,
        "completion_notes": None,
        "history": [{
            "action": "created",
            "by": created_by_name,
            "at": datetime.now(timezone.utc).isoformat(),
            "details": "Consigne créée"
        }]
    }
    
    await database.consignes.insert_one(consigne)
    
    # Create notification for assigned user
    if data.assigned_to:
        await create_notification(
            hotel_id=hotel_id,
            user_id=data.assigned_to,
            title="📋 Nouvelle consigne assignée",
            message=f"{data.title} - {data.service.value}",
            consigne_id=consigne_id
        )
    
    # Remove _id for response
    consigne.pop("_id", None)
    
    return {"success": True, "consigne": consigne}

@router.get("/hotels/{hotel_id}/consignes", response_model=dict)
async def get_consignes(
    hotel_id: str,
    status: Optional[str] = None,
    service: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    room_number: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get consignes with filters"""
    database = get_db()
    
    query = {"hotel_id": hotel_id}
    
    if status:
        query["status"] = status
    if service:
        query["service"] = service
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    if room_number:
        query["room_number"] = room_number
    if date_from:
        query["due_date"] = {"$gte": date_from}
    if date_to:
        if "due_date" in query:
            query["due_date"]["$lte"] = date_to
        else:
            query["due_date"] = {"$lte": date_to}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"room_number": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = database.consignes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    consignes = await cursor.to_list(length=limit)
    
    # Convert datetime to string
    for c in consignes:
        for field in ["created_at", "updated_at", "started_at", "completed_at", "validated_at"]:
            if c.get(field) and hasattr(c[field], "isoformat"):
                c[field] = c[field].isoformat()
    
    total = await database.consignes.count_documents(query)
    
    return {"consignes": consignes, "total": total}

@router.get("/hotels/{hotel_id}/consignes/{consigne_id}", response_model=dict)
async def get_consigne(hotel_id: str, consigne_id: str):
    """Get a specific consigne"""
    database = get_db()
    
    consigne = await database.consignes.find_one(
        {"hotel_id": hotel_id, "consigne_id": consigne_id},
        {"_id": 0}
    )
    
    if not consigne:
        raise HTTPException(status_code=404, detail="Consigne non trouvée")
    
    # Convert datetime to string
    for field in ["created_at", "updated_at", "started_at", "completed_at", "validated_at"]:
        if consigne.get(field) and hasattr(consigne[field], "isoformat"):
            consigne[field] = consigne[field].isoformat()
    
    return consigne

@router.put("/hotels/{hotel_id}/consignes/{consigne_id}", response_model=dict)
async def update_consigne(hotel_id: str, consigne_id: str, data: ConsigneUpdate, updated_by: str = "system", updated_by_name: str = "Système"):
    """Update a consigne"""
    database = get_db()
    
    consigne = await database.consignes.find_one({"hotel_id": hotel_id, "consigne_id": consigne_id})
    if not consigne:
        raise HTTPException(status_code=404, detail="Consigne non trouvée")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    history_entry = {"by": updated_by_name, "at": datetime.now(timezone.utc).isoformat()}
    
    if data.title is not None:
        update_data["title"] = data.title
    if data.description is not None:
        update_data["description"] = data.description
    if data.room_number is not None:
        update_data["room_number"] = data.room_number
    if data.client_id is not None:
        update_data["client_id"] = data.client_id
    if data.client_name is not None:
        update_data["client_name"] = data.client_name
    if data.service is not None:
        update_data["service"] = data.service.value
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to
        update_data["assigned_to_name"] = data.assigned_to_name
        history_entry["action"] = "reassigned"
        history_entry["details"] = f"Réassigné à {data.assigned_to_name}"
    if data.priority is not None:
        update_data["priority"] = data.priority.value
    if data.due_date is not None:
        update_data["due_date"] = data.due_date
    if data.due_time is not None:
        update_data["due_time"] = data.due_time
    if data.proof_url is not None:
        update_data["proof_url"] = data.proof_url
    if data.completion_notes is not None:
        update_data["completion_notes"] = data.completion_notes
    
    # Handle status changes
    if data.status is not None:
        update_data["status"] = data.status.value
        history_entry["action"] = "status_changed"
        history_entry["details"] = f"Statut changé en {data.status.value}"
        
        if data.status == ConsigneStatus.EN_COURS and not consigne.get("started_at"):
            update_data["started_at"] = datetime.now(timezone.utc)
        elif data.status == ConsigneStatus.FAIT:
            update_data["completed_at"] = datetime.now(timezone.utc)
        elif data.status == ConsigneStatus.FERMEE:
            update_data["validated_at"] = datetime.now(timezone.utc)
            update_data["validated_by"] = updated_by
    
    await database.consignes.update_one(
        {"consigne_id": consigne_id},
        {
            "$set": update_data,
            "$push": {"history": history_entry}
        }
    )
    
    return {"success": True, "message": "Consigne mise à jour"}

@router.delete("/hotels/{hotel_id}/consignes/{consigne_id}", response_model=dict)
async def delete_consigne(hotel_id: str, consigne_id: str):
    """Delete a consigne"""
    database = get_db()
    
    result = await database.consignes.delete_one({"hotel_id": hotel_id, "consigne_id": consigne_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Consigne non trouvée")
    
    return {"success": True, "message": "Consigne supprimée"}

# ===== DASHBOARD & STATS =====

@router.get("/hotels/{hotel_id}/stats", response_model=dict)
async def get_consignes_stats(hotel_id: str):
    """Get dashboard statistics"""
    database = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count by status
    pipeline_status = [
        {"$match": {"hotel_id": hotel_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {}
    async for doc in database.consignes.aggregate(pipeline_status):
        status_counts[doc["_id"]] = doc["count"]
    
    # Count by service
    pipeline_service = [
        {"$match": {"hotel_id": hotel_id, "status": {"$nin": ["fermee"]}}},
        {"$group": {"_id": "$service", "count": {"$sum": 1}}}
    ]
    service_counts = {}
    async for doc in database.consignes.aggregate(pipeline_service):
        service_counts[doc["_id"]] = doc["count"]
    
    # Count by priority
    pipeline_priority = [
        {"$match": {"hotel_id": hotel_id, "status": {"$nin": ["fait", "fermee"]}}},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_counts = {}
    async for doc in database.consignes.aggregate(pipeline_priority):
        priority_counts[doc["_id"]] = doc["count"]
    
    # Today's consignes
    today_count = await database.consignes.count_documents({
        "hotel_id": hotel_id,
        "due_date": today
    })
    
    # Overdue consignes
    overdue_count = await database.consignes.count_documents({
        "hotel_id": hotel_id,
        "due_date": {"$lt": today},
        "status": {"$nin": ["fait", "fermee"]}
    })
    
    # Urgent consignes
    urgent_count = await database.consignes.count_documents({
        "hotel_id": hotel_id,
        "priority": "urgente",
        "status": {"$nin": ["fait", "fermee"]}
    })
    
    # Completion rate (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    total_recent = await database.consignes.count_documents({
        "hotel_id": hotel_id,
        "created_at": {"$gte": thirty_days_ago}
    })
    completed_recent = await database.consignes.count_documents({
        "hotel_id": hotel_id,
        "created_at": {"$gte": thirty_days_ago},
        "status": {"$in": ["fait", "fermee"]}
    })
    completion_rate = round((completed_recent / total_recent * 100) if total_recent > 0 else 0, 1)
    
    # Recent consignes
    cursor = database.consignes.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10)
    recent = await cursor.to_list(length=10)
    for c in recent:
        for field in ["created_at", "updated_at", "started_at", "completed_at", "validated_at"]:
            if c.get(field) and hasattr(c[field], "isoformat"):
                c[field] = c[field].isoformat()
    
    return {
        "total": sum(status_counts.values()),
        "by_status": status_counts,
        "by_service": service_counts,
        "by_priority": priority_counts,
        "today": today_count,
        "overdue": overdue_count,
        "urgent": urgent_count,
        "completion_rate": completion_rate,
        "recent": recent
    }

@router.get("/hotels/{hotel_id}/calendar", response_model=dict)
async def get_calendar_data(hotel_id: str, year: int, month: int):
    """Get consignes for calendar view"""
    database = get_db()
    
    # Build date range
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    cursor = database.consignes.find({
        "hotel_id": hotel_id,
        "due_date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0})
    
    consignes = await cursor.to_list(length=500)
    
    # Group by date
    calendar_data = {}
    for c in consignes:
        date = c.get("due_date")
        if date:
            if date not in calendar_data:
                calendar_data[date] = []
            # Convert datetime
            for field in ["created_at", "updated_at"]:
                if c.get(field) and hasattr(c[field], "isoformat"):
                    c[field] = c[field].isoformat()
            calendar_data[date].append(c)
    
    return {"calendar": calendar_data}

# ===== AI SUGGESTIONS =====

@router.post("/hotels/{hotel_id}/ai/analyze", response_model=dict)
async def ai_analyze_consignes(hotel_id: str):
    """AI analysis of consignes for suggestions"""
    database = get_db()
    
    # Get current state
    stats = await get_consignes_stats(hotel_id)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        prompt = f"""Tu es un assistant IA expert en opérations hôtelières.

Analyse ces statistiques du cahier de consignes :

- Total consignes actives : {stats['total']}
- Par statut : {stats['by_status']}
- Par service : {stats['by_service']}
- Par priorité : {stats['by_priority']}
- Aujourd'hui : {stats['today']}
- En retard : {stats['overdue']}
- Urgentes : {stats['urgent']}
- Taux de complétion (30j) : {stats['completion_rate']}%

Fournis une analyse en JSON :
{{
    "score_global": 0-100,
    "alertes": ["alerte 1", "alerte 2"],
    "recommandations": ["reco 1", "reco 2"],
    "services_a_surveiller": ["service"],
    "tendance": "positive|stable|negative"
}}
"""

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"consignes-analysis-{hotel_id}",
            system_message="Tu es un expert en opérations hôtelières. Réponds toujours en JSON valide."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        import json
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                analysis = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except:
            analysis = {
                "score_global": 75,
                "alertes": [f"{stats['overdue']} consignes en retard"] if stats['overdue'] > 0 else [],
                "recommandations": ["Prioriser les tâches urgentes", "Vérifier les consignes en retard"],
                "services_a_surveiller": list(stats['by_service'].keys())[:2],
                "tendance": "stable"
            }
        
        return {"success": True, "analysis": analysis}
        
    except Exception as e:
        # Fallback analysis
        alertes = []
        if stats['overdue'] > 0:
            alertes.append(f"⚠️ {stats['overdue']} consigne(s) en retard")
        if stats['urgent'] > 0:
            alertes.append(f"🔴 {stats['urgent']} consigne(s) urgente(s)")
        
        return {
            "success": True,
            "analysis": {
                "score_global": max(0, 100 - (stats['overdue'] * 5) - (stats['urgent'] * 10)),
                "alertes": alertes,
                "recommandations": [
                    "Prioriser les tâches en retard",
                    "Répartir la charge entre les services"
                ],
                "services_a_surveiller": [s for s, c in stats['by_service'].items() if c > 3],
                "tendance": "stable" if stats['completion_rate'] > 80 else "negative"
            }
        }

@router.post("/hotels/{hotel_id}/ai/suggest", response_model=dict)
async def ai_suggest_actions(hotel_id: str, context: dict):
    """AI suggestions based on context (VIP, special requests, etc.)"""
    database = get_db()
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        prompt = f"""Tu es un assistant concierge d'hôtel de luxe.

Contexte :
- Type d'événement : {context.get('event_type', 'inconnu')}
- Client : {context.get('client_name', 'N/A')}
- Chambre : {context.get('room_number', 'N/A')}
- Détails : {context.get('details', 'N/A')}
- Préférences client : {context.get('preferences', [])}

Suggère des consignes à créer pour ce cas. Réponds en JSON :
{{
    "suggestions": [
        {{
            "title": "titre court",
            "description": "description détaillée",
            "service": "reception|housekeeping|restauration|conciergerie",
            "priority": "basse|normale|haute|urgente"
        }}
    ]
}}
"""

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"consignes-suggest-{hotel_id}",
            system_message="Tu es un expert concierge. Réponds toujours en JSON valide."
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        import json
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                suggestions = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except:
            suggestions = {"suggestions": []}
        
        return {"success": True, **suggestions}
        
    except Exception as e:
        return {"success": False, "suggestions": [], "error": str(e)}

# ===== AUTO-TRIGGERS =====

@router.post("/hotels/{hotel_id}/triggers/checkin", response_model=dict)
async def trigger_checkin_consignes(hotel_id: str, reservation_data: dict):
    """Auto-create consignes on check-in"""
    database = get_db()
    
    consignes_created = []
    
    # Check if VIP
    if reservation_data.get("is_vip"):
        consigne = ConsigneCreate(
            title=f"Accueil VIP - Chambre {reservation_data.get('room_number')}",
            description=f"Client VIP : {reservation_data.get('guest_name')}. Préparer accueil personnalisé.",
            room_number=reservation_data.get("room_number"),
            client_name=reservation_data.get("guest_name"),
            service=ConsigneService.RECEPTION,
            priority=ConsignePriority.HAUTE,
            due_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            linked_reservation_id=reservation_data.get("reservation_id")
        )
        result = await create_consigne(hotel_id, consigne, "system", "Système automatique")
        result["consigne"]["trigger_source"] = TriggerSource.PMS_VIP.value
        consignes_created.append(result["consigne"])
    
    # Check for special requests
    if reservation_data.get("special_requests"):
        for request in reservation_data.get("special_requests", []):
            consigne = ConsigneCreate(
                title=f"Demande spéciale - Ch. {reservation_data.get('room_number')}",
                description=request,
                room_number=reservation_data.get("room_number"),
                client_name=reservation_data.get("guest_name"),
                service=ConsigneService.CONCIERGERIE,
                priority=ConsignePriority.NORMALE,
                due_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                linked_reservation_id=reservation_data.get("reservation_id")
            )
            result = await create_consigne(hotel_id, consigne, "system", "Système automatique")
            result["consigne"]["trigger_source"] = TriggerSource.PMS_CHECKIN.value
            consignes_created.append(result["consigne"])
    
    # Check for birthday
    if reservation_data.get("is_birthday"):
        consigne = ConsigneCreate(
            title=f"Anniversaire client - Ch. {reservation_data.get('room_number')}",
            description=f"Anniversaire de {reservation_data.get('guest_name')}. Prévoir attention particulière.",
            room_number=reservation_data.get("room_number"),
            client_name=reservation_data.get("guest_name"),
            service=ConsigneService.RESTAURATION,
            priority=ConsignePriority.HAUTE,
            due_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            linked_reservation_id=reservation_data.get("reservation_id")
        )
        result = await create_consigne(hotel_id, consigne, "system", "Système automatique")
        result["consigne"]["trigger_source"] = TriggerSource.CRM_BIRTHDAY.value
        consignes_created.append(result["consigne"])
    
    return {"success": True, "consignes_created": len(consignes_created), "consignes": consignes_created}

@router.post("/hotels/{hotel_id}/triggers/housekeeping", response_model=dict)
async def trigger_housekeeping_consignes(hotel_id: str, task_data: dict):
    """Auto-create consignes from housekeeping tasks"""
    database = get_db()
    
    consigne = ConsigneCreate(
        title=f"Ménage - Chambre {task_data.get('room_number')}",
        description=task_data.get("description", "Nettoyage standard"),
        room_number=task_data.get("room_number"),
        service=ConsigneService.HOUSEKEEPING,
        assigned_to=task_data.get("assigned_to"),
        assigned_to_name=task_data.get("assigned_to_name"),
        priority=ConsignePriority.NORMALE if task_data.get("task_type") == "routine" else ConsignePriority.HAUTE,
        due_date=task_data.get("due_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    )
    
    result = await create_consigne(hotel_id, consigne, "system", "Système Housekeeping")
    await database.consignes.update_one(
        {"consigne_id": result["consigne"]["consigne_id"]},
        {"$set": {"trigger_source": TriggerSource.HOUSEKEEPING.value}}
    )
    
    return {"success": True, "consigne": result["consigne"]}
