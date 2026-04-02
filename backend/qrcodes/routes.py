# QR Codes Routes for Flowtym
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets
import os
import jwt

from .models import (
    QRZoneCreate, QRZoneResponse, QRZoneUpdate,
    QRCodeType, ZoneType,
    HKScanCreate, HKTrackingResponse, HKTrackingStatus,
    BatchQRCreate, BatchQRResponse
)

router = APIRouter(prefix="/qrcodes", tags=["QR Codes"])

# Database reference (set by init function)
db = None
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

def init_qrcodes_db(database):
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
# QR ZONES CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/zones", response_model=List[QRZoneResponse])
async def list_qr_zones(
    hotel_id: str,
    zone_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    current_user: dict = Depends(get_current_user)
):
    """Liste toutes les zones QR d'un hôtel"""
    query = {"hotel_id": hotel_id}
    if zone_type:
        query["zone_type"] = zone_type
    if is_active is not None:
        query["is_active"] = is_active
    
    zones = await db.qr_zones.find(query, {"_id": 0}).sort([("zone_type", 1), ("name", 1)]).to_list(500)
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    for zone in zones:
        zone["qr_url"] = f"{base_url}/scan/{zone['qr_token']}"
    
    return [QRZoneResponse(**z) for z in zones]

@router.post("/hotels/{hotel_id}/zones", response_model=QRZoneResponse)
async def create_qr_zone(
    hotel_id: str,
    zone: QRZoneCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer une nouvelle zone QR"""
    # Vérifier si zone existe déjà (pour les chambres)
    if zone.room_number:
        existing = await db.qr_zones.find_one({
            "hotel_id": hotel_id,
            "room_number": zone.room_number
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Un QR code existe déjà pour la chambre {zone.room_number}")
    
    zone_id = str(uuid.uuid4())
    qr_token = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc).isoformat()
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    
    zone_doc = {
        "id": zone_id,
        "hotel_id": hotel_id,
        "name": zone.name,
        "zone_type": zone.zone_type.value,
        "qr_types": [qt.value for qt in zone.qr_types],
        "room_number": zone.room_number,
        "floor": zone.floor,
        "description": zone.description,
        "qr_token": qr_token,
        "qr_url": f"{base_url}/scan/{qr_token}",
        "is_active": zone.is_active,
        "created_at": now,
        "updated_at": now
    }
    
    await db.qr_zones.insert_one(zone_doc)
    return QRZoneResponse(**zone_doc)

@router.put("/hotels/{hotel_id}/zones/{zone_id}", response_model=QRZoneResponse)
async def update_qr_zone(
    hotel_id: str,
    zone_id: str,
    update: QRZoneUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour une zone QR"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "qr_types" in update_data:
        update_data["qr_types"] = [qt.value if hasattr(qt, 'value') else qt for qt in update_data["qr_types"]]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.qr_zones.update_one(
        {"id": zone_id, "hotel_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    
    zone = await db.qr_zones.find_one({"id": zone_id}, {"_id": 0})
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    zone["qr_url"] = f"{base_url}/scan/{zone['qr_token']}"
    
    return QRZoneResponse(**zone)

@router.delete("/hotels/{hotel_id}/zones/{zone_id}")
async def delete_qr_zone(
    hotel_id: str,
    zone_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer une zone QR"""
    result = await db.qr_zones.delete_one({"id": zone_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    return {"success": True, "message": "Zone supprimée"}

@router.post("/hotels/{hotel_id}/zones/{zone_id}/regenerate-token", response_model=QRZoneResponse)
async def regenerate_qr_token(
    hotel_id: str,
    zone_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Régénérer le token QR d'une zone (invalidera l'ancien QR code)"""
    new_token = secrets.token_urlsafe(16)
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    
    result = await db.qr_zones.update_one(
        {"id": zone_id, "hotel_id": hotel_id},
        {"$set": {
            "qr_token": new_token,
            "qr_url": f"{base_url}/scan/{new_token}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    
    zone = await db.qr_zones.find_one({"id": zone_id}, {"_id": 0})
    return QRZoneResponse(**zone)

# ═══════════════════════════════════════════════════════════════════════════════
# BATCH QR GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/zones/batch", response_model=BatchQRResponse)
async def batch_create_qr_zones(
    hotel_id: str,
    batch: BatchQRCreate,
    current_user: dict = Depends(get_current_user)
):
    """Génération en masse de QR codes pour toutes les chambres"""
    # Récupérer les chambres de l'hôtel
    query = {"hotel_id": hotel_id}
    if batch.floor_filter is not None:
        query["floor"] = batch.floor_filter
    
    rooms = await db.rooms.find(query, {"_id": 0}).to_list(500)
    
    if not rooms:
        raise HTTPException(status_code=404, detail="Aucune chambre trouvée")
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    now = datetime.now(timezone.utc).isoformat()
    created_zones = []
    
    for room in rooms:
        # Vérifier si QR existe déjà
        existing = await db.qr_zones.find_one({
            "hotel_id": hotel_id,
            "room_number": room["number"]
        })
        
        if existing:
            continue
        
        zone_id = str(uuid.uuid4())
        qr_token = secrets.token_urlsafe(16)
        
        zone_doc = {
            "id": zone_id,
            "hotel_id": hotel_id,
            "name": f"Chambre {room['number']}",
            "zone_type": batch.zone_type.value,
            "qr_types": [qt.value for qt in batch.qr_types],
            "room_number": room["number"],
            "floor": room.get("floor", 1),
            "description": f"QR Code pour la chambre {room['number']}",
            "qr_token": qr_token,
            "qr_url": f"{base_url}/scan/{qr_token}",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        await db.qr_zones.insert_one(zone_doc)
        created_zones.append(QRZoneResponse(**zone_doc))
    
    return BatchQRResponse(created_count=len(created_zones), zones=created_zones)

# ═══════════════════════════════════════════════════════════════════════════════
# HOUSEKEEPING TRACKING (CHRONO)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/scan/{qr_token}")
async def get_zone_by_token(qr_token: str):
    """Récupérer les infos d'une zone par son token QR (endpoint public)"""
    zone = await db.qr_zones.find_one({"qr_token": qr_token}, {"_id": 0})
    
    if not zone:
        raise HTTPException(status_code=404, detail="QR Code invalide ou expiré")
    
    if not zone.get("is_active", True):
        raise HTTPException(status_code=400, detail="Ce QR Code est désactivé")
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    zone["qr_url"] = f"{base_url}/scan/{zone['qr_token']}"
    
    # Récupérer le tracking en cours si existe
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_tracking = await db.hk_tracking.find_one({
        "zone_id": zone["id"],
        "date": today,
        "status": {"$in": [HKTrackingStatus.IN_PROGRESS.value]}
    }, {"_id": 0})
    
    return {
        "zone": zone,
        "current_tracking": current_tracking,
        "qr_types": zone.get("qr_types", [])
    }

@router.post("/hotels/{hotel_id}/tracking/scan")
async def scan_housekeeping(
    hotel_id: str,
    zone_id: str,
    scan: HKScanCreate,
    current_user: dict = Depends(get_current_user)
):
    """Scanner pour démarrer/terminer le nettoyage d'une zone"""
    # Vérifier que la zone existe
    zone = await db.qr_zones.find_one({"id": zone_id, "hotel_id": hotel_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    
    # Vérifier que l'employé existe
    employee = await db.staff_employees.find_one({"id": scan.employee_id, "hotel_id": hotel_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    employee_name = f"{employee['first_name']} {employee['last_name']}"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    
    if scan.scan_type == "start":
        # Vérifier qu'il n'y a pas déjà un tracking en cours pour cette zone aujourd'hui
        existing = await db.hk_tracking.find_one({
            "zone_id": zone_id,
            "date": today,
            "status": HKTrackingStatus.IN_PROGRESS.value
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Un nettoyage est déjà en cours pour cette zone")
        
        # Créer le tracking
        tracking_id = str(uuid.uuid4())
        tracking_doc = {
            "id": tracking_id,
            "hotel_id": hotel_id,
            "zone_id": zone_id,
            "zone_name": zone["name"],
            "room_number": zone.get("room_number"),
            "employee_id": scan.employee_id,
            "employee_name": employee_name,
            "status": HKTrackingStatus.IN_PROGRESS.value,
            "scan_start": now,
            "scan_end": None,
            "duration_minutes": None,
            "notes": None,
            "date": today,
            "created_at": now,
            "updated_at": now
        }
        
        await db.hk_tracking.insert_one(tracking_doc)
        
        # Mettre à jour le statut de la chambre dans housekeeping si c'est une chambre
        if zone.get("room_number"):
            await db.hk_tasks.update_many(
                {
                    "hotel_id": hotel_id,
                    "room_number": zone["room_number"],
                    "date": today
                },
                {"$set": {"status": "in_progress", "assigned_to_name": employee_name, "updated_at": now}}
            )
            # Mettre à jour le statut de la room
            await db.rooms.update_one(
                {"hotel_id": hotel_id, "number": zone["room_number"]},
                {"$set": {"status": "cleaning"}}
            )
        
        return {
            "success": True,
            "message": "Nettoyage démarré",
            "tracking": HKTrackingResponse(**tracking_doc)
        }
    
    elif scan.scan_type == "end":
        # Trouver le tracking en cours
        tracking = await db.hk_tracking.find_one({
            "zone_id": zone_id,
            "date": today,
            "status": HKTrackingStatus.IN_PROGRESS.value
        }, {"_id": 0})
        
        if not tracking:
            raise HTTPException(status_code=400, detail="Aucun nettoyage en cours pour cette zone")
        
        # Calculer la durée
        start_time = datetime.fromisoformat(tracking["scan_start"].replace("Z", "+00:00"))
        end_time = datetime.now(timezone.utc)
        duration_minutes = int((end_time - start_time).total_seconds() / 60)
        
        # Mettre à jour le tracking
        await db.hk_tracking.update_one(
            {"id": tracking["id"]},
            {"$set": {
                "status": HKTrackingStatus.AWAITING_VALIDATION.value,
                "scan_end": now,
                "duration_minutes": duration_minutes,
                "updated_at": now
            }}
        )
        
        # Mettre à jour le statut de la chambre
        if zone.get("room_number"):
            await db.hk_tasks.update_many(
                {
                    "hotel_id": hotel_id,
                    "room_number": zone["room_number"],
                    "date": today
                },
                {"$set": {"status": "pending_validation", "updated_at": now}}
            )
        
        tracking["status"] = HKTrackingStatus.AWAITING_VALIDATION.value
        tracking["scan_end"] = now
        tracking["duration_minutes"] = duration_minutes
        
        return {
            "success": True,
            "message": f"Nettoyage terminé en {duration_minutes} minutes. En attente de validation.",
            "tracking": HKTrackingResponse(**tracking)
        }
    
    else:
        raise HTTPException(status_code=400, detail="Type de scan invalide. Utilisez 'start' ou 'end'")

@router.get("/hotels/{hotel_id}/tracking", response_model=List[HKTrackingResponse])
async def list_hk_tracking(
    hotel_id: str,
    date: Optional[str] = None,
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Liste des trackings housekeeping"""
    query = {"hotel_id": hotel_id}
    if date:
        query["date"] = date
    else:
        query["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if status:
        query["status"] = status
    if employee_id:
        query["employee_id"] = employee_id
    
    trackings = await db.hk_tracking.find(query, {"_id": 0}).sort("scan_start", -1).to_list(200)
    return [HKTrackingResponse(**t) for t in trackings]

@router.get("/hotels/{hotel_id}/tracking/stats")
async def get_hk_tracking_stats(
    hotel_id: str,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Statistiques de tracking housekeeping"""
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    pipeline = [
        {"$match": {"hotel_id": hotel_id, "date": target_date}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_duration": {"$sum": {"$ifNull": ["$duration_minutes", 0]}}
        }}
    ]
    
    results = await db.hk_tracking.aggregate(pipeline).to_list(10)
    
    stats = {
        "date": target_date,
        "in_progress": 0,
        "awaiting_validation": 0,
        "completed": 0,
        "total_duration_minutes": 0,
        "average_duration_minutes": 0
    }
    
    total_with_duration = 0
    for r in results:
        status = r["_id"]
        count = r["count"]
        duration = r["total_duration"]
        
        if status == HKTrackingStatus.IN_PROGRESS.value:
            stats["in_progress"] = count
        elif status == HKTrackingStatus.AWAITING_VALIDATION.value:
            stats["awaiting_validation"] = count
            stats["total_duration_minutes"] += duration
            total_with_duration += count
        elif status == HKTrackingStatus.COMPLETED.value:
            stats["completed"] = count
            stats["total_duration_minutes"] += duration
            total_with_duration += count
    
    if total_with_duration > 0:
        stats["average_duration_minutes"] = round(stats["total_duration_minutes"] / total_with_duration, 1)
    
    return stats
