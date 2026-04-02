# Satisfaction Survey Routes for Flowtym
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt

from .models import (
    SUPPORTED_LANGUAGES, DEFAULT_SURVEY_TRANSLATIONS,
    SurveyConfigCreate, SurveyConfigResponse,
    SurveyResponseCreate, SurveyResponseModel,
    SurveyAcknowledge, SurveyResolve,
    EscalationTicketResponse, EscalationPriority,
    SatisfactionStatsResponse
)

router = APIRouter(prefix="/satisfaction", tags=["Satisfaction"])

# Database reference (set by init function)
db = None
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

def init_satisfaction_db(database):
    global db
    db = database

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH HELPER
# ═══════════════════════════════════════════════════════════════════════════════

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ═══════════════════════════════════════════════════════════════════════════════
# SURVEY CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/config", response_model=SurveyConfigResponse)
async def get_survey_config(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer la configuration du formulaire de satisfaction"""
    config = await db.satisfaction_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    if not config:
        # Créer config par défaut
        config = await _create_default_config(hotel_id)
    
    return SurveyConfigResponse(**config)

@router.put("/hotels/{hotel_id}/config", response_model=SurveyConfigResponse)
async def update_survey_config(
    hotel_id: str,
    update: SurveyConfigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour la configuration du formulaire de satisfaction"""
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.satisfaction_config.find_one({"hotel_id": hotel_id})
    
    update_data = {
        "satisfaction_threshold": update.satisfaction_threshold,
        "criteria": [c.model_dump() for c in update.criteria],
        "google_review_url": update.google_review_url,
        "tripadvisor_url": update.tripadvisor_url,
        "booking_review_url": update.booking_review_url,
        "custom_review_urls": update.custom_review_urls,
        "auto_escalation_enabled": update.auto_escalation_enabled,
        "escalation_notification_emails": update.escalation_notification_emails,
        "custom_translations": update.custom_translations,
        "updated_at": now
    }
    
    if existing:
        await db.satisfaction_config.update_one(
            {"hotel_id": hotel_id},
            {"$set": update_data}
        )
    else:
        config_id = str(uuid.uuid4())
        update_data.update({
            "id": config_id,
            "hotel_id": hotel_id,
            "created_at": now
        })
        await db.satisfaction_config.insert_one(update_data)
    
    config = await db.satisfaction_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    return SurveyConfigResponse(**config)

async def _create_default_config(hotel_id: str) -> dict:
    """Créer une configuration par défaut"""
    now = datetime.now(timezone.utc).isoformat()
    config = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "satisfaction_threshold": 4.0,
        "criteria": [
            {"key": "cleanliness", "weight": 1.0, "is_active": True},
            {"key": "comfort", "weight": 1.0, "is_active": True},
            {"key": "equipment", "weight": 1.0, "is_active": True},
            {"key": "service", "weight": 1.0, "is_active": True}
        ],
        "google_review_url": None,
        "tripadvisor_url": None,
        "booking_review_url": None,
        "custom_review_urls": {},
        "auto_escalation_enabled": True,
        "escalation_notification_emails": [],
        "custom_translations": {},
        "created_at": now,
        "updated_at": now
    }
    await db.satisfaction_config.insert_one(config)
    return config

# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC SURVEY ENDPOINTS (No auth required)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/public/languages")
async def get_supported_languages():
    """Récupérer la liste des langues supportées"""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "default": "fr"
    }

@router.get("/public/survey/{qr_token}")
async def get_public_survey(qr_token: str, lang: str = "fr"):
    """Récupérer le formulaire de satisfaction (endpoint public)"""
    # Récupérer la zone par token
    zone = await db.qr_zones.find_one({"qr_token": qr_token}, {"_id": 0})
    
    if not zone:
        raise HTTPException(status_code=404, detail="QR Code invalide ou expiré")
    
    if not zone.get("is_active", True):
        raise HTTPException(status_code=400, detail="Ce QR Code est désactivé")
    
    # Vérifier que la zone supporte la satisfaction
    qr_types = zone.get("qr_types", [])
    if "satisfaction" not in qr_types and "room" not in qr_types:
        raise HTTPException(status_code=400, detail="Ce QR Code ne supporte pas les enquêtes de satisfaction")
    
    hotel_id = zone["hotel_id"]
    
    # Récupérer la config
    config = await db.satisfaction_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        config = await _create_default_config(hotel_id)
    
    # Récupérer l'hôtel
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0, "name": 1, "stars": 1})
    
    # Préparer les traductions
    if lang not in SUPPORTED_LANGUAGES:
        lang = "fr"
    
    translations = DEFAULT_SURVEY_TRANSLATIONS.get(lang, DEFAULT_SURVEY_TRANSLATIONS["fr"])
    
    # Merge avec traductions personnalisées
    if config.get("custom_translations", {}).get(lang):
        custom = config["custom_translations"][lang]
        for key, value in custom.items():
            if isinstance(value, dict) and key in translations and isinstance(translations[key], dict):
                translations[key].update(value)
            else:
                translations[key] = value
    
    # Filtrer les critères actifs
    active_criteria = [c for c in config.get("criteria", []) if c.get("is_active", True)]
    
    return {
        "zone": {
            "id": zone["id"],
            "name": zone["name"],
            "room_number": zone.get("room_number"),
            "zone_type": zone.get("zone_type")
        },
        "hotel": hotel,
        "language": lang,
        "languages": SUPPORTED_LANGUAGES,
        "translations": translations,
        "criteria": active_criteria,
        "threshold": config.get("satisfaction_threshold", 4.0)
    }

@router.post("/public/survey/{qr_token}")
async def submit_public_survey(qr_token: str, response: SurveyResponseCreate):
    """Soumettre une réponse au formulaire de satisfaction (endpoint public)"""
    # Récupérer la zone
    zone = await db.qr_zones.find_one({"qr_token": qr_token}, {"_id": 0})
    
    if not zone:
        raise HTTPException(status_code=404, detail="QR Code invalide")
    
    if zone["id"] != response.zone_id:
        raise HTTPException(status_code=400, detail="Zone ID ne correspond pas")
    
    hotel_id = zone["hotel_id"]
    
    # Récupérer la config
    config = await db.satisfaction_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    if not config:
        config = await _create_default_config(hotel_id)
    
    # Calculer la moyenne pondérée
    total_weight = 0
    weighted_sum = 0
    criteria_map = {c["key"]: c for c in config.get("criteria", [])}
    
    for key, rating in response.ratings.items():
        if key in criteria_map and criteria_map[key].get("is_active", True):
            weight = criteria_map[key].get("weight", 1.0)
            weighted_sum += rating * weight
            total_weight += weight
    
    average_rating = weighted_sum / total_weight if total_weight > 0 else 0
    average_rating = round(average_rating, 2)
    
    threshold = config.get("satisfaction_threshold", 4.0)
    is_satisfied = average_rating >= threshold
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Créer la réponse
    survey_id = str(uuid.uuid4())
    survey_doc = {
        "id": survey_id,
        "hotel_id": hotel_id,
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "room_number": zone.get("room_number"),
        "language": response.language,
        "ratings": response.ratings,
        "average_rating": average_rating,
        "improvement_text": response.improvement_text,
        "is_satisfied": is_satisfied,
        "status": "new",
        "escalation_ticket_id": None,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "resolved_by": None,
        "resolved_at": None,
        "resolution_notes": None,
        "created_at": now
    }
    
    await db.satisfaction_responses.insert_one(survey_doc)
    
    # Si non satisfait et escalade auto activée, créer un ticket
    escalation_ticket = None
    if not is_satisfied and config.get("auto_escalation_enabled", True):
        escalation_ticket = await _create_escalation_ticket(hotel_id, survey_doc, config)
        await db.satisfaction_responses.update_one(
            {"id": survey_id},
            {"$set": {"status": "escalated", "escalation_ticket_id": escalation_ticket["id"]}}
        )
        survey_doc["status"] = "escalated"
        survey_doc["escalation_ticket_id"] = escalation_ticket["id"]
    
    # Préparer la réponse
    translations = DEFAULT_SURVEY_TRANSLATIONS.get(response.language, DEFAULT_SURVEY_TRANSLATIONS["fr"])
    
    result = {
        "success": True,
        "survey_id": survey_id,
        "average_rating": average_rating,
        "is_satisfied": is_satisfied,
        "message": translations["thank_you_positive"] if is_satisfied else translations["thank_you_negative"]
    }
    
    # Si satisfait, ajouter les liens de review
    if is_satisfied:
        review_links = []
        if config.get("google_review_url"):
            review_links.append({"platform": "Google", "url": config["google_review_url"]})
        if config.get("tripadvisor_url"):
            review_links.append({"platform": "TripAdvisor", "url": config["tripadvisor_url"]})
        if config.get("booking_review_url"):
            review_links.append({"platform": "Booking.com", "url": config["booking_review_url"]})
        for name, url in config.get("custom_review_urls", {}).items():
            review_links.append({"platform": name, "url": url})
        
        result["review_links"] = review_links
        result["share_text"] = translations.get("share_review", "Leave a review")
    
    return result

async def _create_escalation_ticket(hotel_id: str, survey: dict, config: dict) -> dict:
    """Créer un ticket d'escalade"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Déterminer la priorité
    avg = survey["average_rating"]
    if avg <= 2:
        priority = EscalationPriority.CRITICAL.value
    elif avg <= 3:
        priority = EscalationPriority.HIGH.value
    else:
        priority = EscalationPriority.MEDIUM.value
    
    ticket_id = str(uuid.uuid4())
    ticket = {
        "id": ticket_id,
        "hotel_id": hotel_id,
        "survey_id": survey["id"],
        "room_number": survey.get("room_number"),
        "priority": priority,
        "average_rating": survey["average_rating"],
        "improvement_text": survey.get("improvement_text"),
        "status": "open",
        "assigned_to": None,
        "assigned_to_name": None,
        "resolution_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.escalation_tickets.insert_one(ticket)
    return ticket

# ═══════════════════════════════════════════════════════════════════════════════
# SURVEY RESPONSES (Authenticated)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/responses", response_model=List[SurveyResponseModel])
async def list_survey_responses(
    hotel_id: str,
    status: Optional[str] = None,
    is_satisfied: Optional[bool] = None,
    room_number: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Liste des réponses aux enquêtes de satisfaction"""
    query = {"hotel_id": hotel_id}
    
    if status:
        query["status"] = status
    if is_satisfied is not None:
        query["is_satisfied"] = is_satisfied
    if room_number:
        query["room_number"] = room_number
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = to_date + "T23:59:59"
        else:
            query["created_at"] = {"$lte": to_date + "T23:59:59"}
    
    responses = await db.satisfaction_responses.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [SurveyResponseModel(**r) for r in responses]

@router.get("/hotels/{hotel_id}/responses/{response_id}", response_model=SurveyResponseModel)
async def get_survey_response(
    hotel_id: str,
    response_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détail d'une réponse"""
    response = await db.satisfaction_responses.find_one(
        {"id": response_id, "hotel_id": hotel_id},
        {"_id": 0}
    )
    if not response:
        raise HTTPException(status_code=404, detail="Réponse non trouvée")
    return SurveyResponseModel(**response)

@router.post("/hotels/{hotel_id}/responses/{response_id}/acknowledge")
async def acknowledge_response(
    hotel_id: str,
    response_id: str,
    data: SurveyAcknowledge,
    current_user: dict = Depends(get_current_user)
):
    """Marquer une réponse comme prise en compte"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.satisfaction_responses.update_one(
        {"id": response_id, "hotel_id": hotel_id, "status": {"$in": ["new", "escalated"]}},
        {"$set": {
            "status": "acknowledged",
            "acknowledged_by": current_user["user_id"],
            "acknowledged_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réponse non trouvée ou déjà traitée")
    
    return {"success": True, "message": "Réponse marquée comme prise en compte"}

@router.post("/hotels/{hotel_id}/responses/{response_id}/resolve")
async def resolve_response(
    hotel_id: str,
    response_id: str,
    data: SurveyResolve,
    current_user: dict = Depends(get_current_user)
):
    """Marquer une réponse comme résolue"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Mettre à jour la réponse
    result = await db.satisfaction_responses.update_one(
        {"id": response_id, "hotel_id": hotel_id},
        {"$set": {
            "status": "resolved",
            "resolved_by": current_user["user_id"],
            "resolved_at": now,
            "resolution_notes": data.resolution_notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réponse non trouvée")
    
    # Mettre à jour le ticket d'escalade associé si existe
    response = await db.satisfaction_responses.find_one({"id": response_id}, {"_id": 0})
    if response and response.get("escalation_ticket_id"):
        await db.escalation_tickets.update_one(
            {"id": response["escalation_ticket_id"]},
            {"$set": {
                "status": "resolved",
                "resolution_notes": data.resolution_notes,
                "updated_at": now
            }}
        )
    
    return {"success": True, "message": "Réponse marquée comme résolue"}

# ═══════════════════════════════════════════════════════════════════════════════
# ESCALATION TICKETS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/escalations", response_model=List[EscalationTicketResponse])
async def list_escalation_tickets(
    hotel_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Liste des tickets d'escalade"""
    query = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    tickets = await db.escalation_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [EscalationTicketResponse(**t) for t in tickets]

@router.patch("/hotels/{hotel_id}/escalations/{ticket_id}/assign")
async def assign_escalation_ticket(
    hotel_id: str,
    ticket_id: str,
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Assigner un ticket à un employé"""
    # Vérifier que l'employé existe
    employee = await db.staff_employees.find_one({"id": employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee_name = f"{employee['first_name']} {employee['last_name']}"
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.escalation_tickets.update_one(
        {"id": ticket_id, "hotel_id": hotel_id},
        {"$set": {
            "status": "in_progress",
            "assigned_to": employee_id,
            "assigned_to_name": employee_name,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    return {"success": True, "message": f"Ticket assigné à {employee_name}"}

@router.patch("/hotels/{hotel_id}/escalations/{ticket_id}/resolve")
async def resolve_escalation_ticket(
    hotel_id: str,
    ticket_id: str,
    resolution_notes: str,
    current_user: dict = Depends(get_current_user)
):
    """Résoudre un ticket d'escalade"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.escalation_tickets.update_one(
        {"id": ticket_id, "hotel_id": hotel_id},
        {"$set": {
            "status": "resolved",
            "resolution_notes": resolution_notes,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    # Résoudre aussi la réponse associée
    ticket = await db.escalation_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if ticket and ticket.get("survey_id"):
        await db.satisfaction_responses.update_one(
            {"id": ticket["survey_id"]},
            {"$set": {
                "status": "resolved",
                "resolved_by": current_user["user_id"],
                "resolved_at": now,
                "resolution_notes": resolution_notes
            }}
        )
    
    return {"success": True, "message": "Ticket résolu"}

# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/stats", response_model=SatisfactionStatsResponse)
async def get_satisfaction_stats(
    hotel_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Statistiques de satisfaction"""
    # Dates par défaut: 30 derniers jours
    if not to_date:
        to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not from_date:
        from_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    query = {
        "hotel_id": hotel_id,
        "created_at": {"$gte": from_date, "$lte": to_date + "T23:59:59"}
    }
    
    responses = await db.satisfaction_responses.find(query, {"_id": 0}).to_list(1000)
    
    total = len(responses)
    satisfied = sum(1 for r in responses if r.get("is_satisfied", False))
    unsatisfied = total - satisfied
    
    # Moyenne globale
    avg_rating = sum(r.get("average_rating", 0) for r in responses) / total if total > 0 else 0
    
    # Moyenne par critère
    ratings_by_criterion = {}
    criterion_counts = {}
    for r in responses:
        for key, value in r.get("ratings", {}).items():
            if key not in ratings_by_criterion:
                ratings_by_criterion[key] = 0
                criterion_counts[key] = 0
            ratings_by_criterion[key] += value
            criterion_counts[key] += 1
    
    for key in ratings_by_criterion:
        if criterion_counts[key] > 0:
            ratings_by_criterion[key] = round(ratings_by_criterion[key] / criterion_counts[key], 2)
    
    # Tickets en attente
    pending_escalations = await db.escalation_tickets.count_documents({
        "hotel_id": hotel_id,
        "status": {"$in": ["open", "in_progress"]}
    })
    
    # Tendance quotidienne
    trend = {}
    for r in responses:
        date = r["created_at"][:10]
        if date not in trend:
            trend[date] = {"date": date, "count": 0, "avg_rating": 0, "ratings_sum": 0}
        trend[date]["count"] += 1
        trend[date]["ratings_sum"] += r.get("average_rating", 0)
    
    for date in trend:
        if trend[date]["count"] > 0:
            trend[date]["avg_rating"] = round(trend[date]["ratings_sum"] / trend[date]["count"], 2)
        del trend[date]["ratings_sum"]
    
    response_trend = sorted(trend.values(), key=lambda x: x["date"])
    
    return SatisfactionStatsResponse(
        hotel_id=hotel_id,
        period_start=from_date,
        period_end=to_date,
        total_responses=total,
        satisfied_count=satisfied,
        unsatisfied_count=unsatisfied,
        satisfaction_rate=round((satisfied / total * 100) if total > 0 else 0, 1),
        average_rating=round(avg_rating, 2),
        ratings_by_criterion=ratings_by_criterion,
        pending_escalations=pending_escalations,
        response_trend=response_trend
    )
