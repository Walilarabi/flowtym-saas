"""
Flowtym Configuration Module - API Routes

Central configuration APIs for hotel management.
Prefix: /api/config
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from io import BytesIO
import uuid
import os
import logging

# Models
from .models import (
    # Hotel
    HotelProfile, HotelProfileCreate, HotelProfileUpdate,
    Currency, Timezone, Language,
    # Rooms
    RoomType, RoomTypeCreate, RoomTypeUpdate,
    Room, RoomCreate, RoomUpdate, RoomBulkImport,
    RoomStatus, RoomCategory, ViewType, BathroomType,
    # Rate Plans
    RatePlan, RatePlanCreate, RatePlanUpdate,
    RateType, MealPlan, DerivationRule, RateSimulation,
    # Policies
    CancellationPolicy, CancellationPolicyCreate, CancellationPolicyUpdate,
    PaymentPolicy, PaymentPolicyCreate, PaymentPolicyUpdate,
    # Users
    ConfigUser, ConfigUserCreate, ConfigUserUpdate,
    UserRole, DEFAULT_ROLES,
    # Settings
    AdvancedSettings, AdvancedSettingsUpdate,
    TaxRule, CustomerSegment
)

# Services
from .services.excel_import import ExcelImportService, ExcelImportError
from .services.validation import ValidationService

logger = logging.getLogger(__name__)

# Router
config_router = APIRouter(prefix="/config", tags=["Configuration"])

# Database connection (will be set by server.py)
db = None

def set_db(database):
    """Set the database connection"""
    global db
    db = database


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH HELPER (imported from server.py context)
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

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
# HOTEL PROFILE ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/profile")
async def get_hotel_profile(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Get the hotel configuration profile"""
    profile = await db.config_hotels.find_one({"tenant_id": hotel_id}, {"_id": 0})
    
    if not profile:
        # Return default profile structure if not created yet
        # Try to get basic info from main hotels collection
        hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
        if hotel:
            return {
                "id": str(uuid.uuid4()),
                "tenant_id": hotel_id,
                "name": hotel.get("name", ""),
                "stars": hotel.get("stars", 3),
                "currency": "EUR",
                "timezone": "Europe/Paris",
                "default_language": "fr",
                "is_configured": False
            }
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    profile["is_configured"] = True
    return profile


@config_router.post("/hotels/{hotel_id}/profile")
async def create_hotel_profile(
    hotel_id: str, 
    profile: HotelProfileCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Create or initialize the hotel configuration profile"""
    existing = await db.config_hotels.find_one({"tenant_id": hotel_id})
    if existing:
        raise HTTPException(status_code=400, detail="Le profil existe déjà. Utilisez PUT pour mettre à jour.")
    
    profile_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    profile_doc = {
        "id": profile_id,
        "tenant_id": hotel_id,
        **profile.model_dump(),
        "address": profile.address.model_dump() if profile.address else {},
        "contact": profile.contact.model_dump() if profile.contact else {},
        "amenities": [],
        "is_active": True,
        "is_open": True,
        "version": 1,
        "last_modified_by": current_user.get("user_id"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_hotels.insert_one(profile_doc)
    
    # Also update main hotels collection for consistency
    await db.hotels.update_one(
        {"id": hotel_id},
        {"$set": {
            "name": profile.name,
            "stars": profile.stars,
            "timezone": profile.timezone.value if hasattr(profile.timezone, 'value') else profile.timezone
        }}
    )
    
    return {**profile_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/profile")
async def update_hotel_profile(
    hotel_id: str, 
    update: HotelProfileUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update the hotel configuration profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle nested objects
    if "address" in update_data and update_data["address"]:
        update_data["address"] = update_data["address"].model_dump() if hasattr(update_data["address"], 'model_dump') else update_data["address"]
    if "contact" in update_data and update_data["contact"]:
        update_data["contact"] = update_data["contact"].model_dump() if hasattr(update_data["contact"], 'model_dump') else update_data["contact"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["last_modified_by"] = current_user.get("user_id")
    
    result = await db.config_hotels.update_one(
        {"tenant_id": hotel_id},
        {"$set": update_data, "$inc": {"version": 1}}
    )
    
    if result.matched_count == 0:
        # Create if doesn't exist
        profile_doc = {
            "id": str(uuid.uuid4()),
            "tenant_id": hotel_id,
            **update_data,
            "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.config_hotels.insert_one(profile_doc)
    
    updated = await db.config_hotels.find_one({"tenant_id": hotel_id}, {"_id": 0})
    return updated


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM TYPES ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/room-types")
async def get_room_types(
    hotel_id: str,
    active_only: bool = Query(True, description="Filtrer les types actifs uniquement"),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all room types for a hotel"""
    query = {"tenant_id": hotel_id}
    if active_only:
        query["is_active"] = True
    
    room_types = await db.config_room_types.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    
    # Add room count for each type
    for rt in room_types:
        count = await db.config_rooms.count_documents({
            "tenant_id": hotel_id,
            "room_type_id": rt["id"],
            "is_active": True
        })
        rt["room_count"] = count
    
    return room_types


@config_router.get("/hotels/{hotel_id}/room-types/{type_id}")
async def get_room_type(hotel_id: str, type_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific room type"""
    room_type = await db.config_room_types.find_one(
        {"id": type_id, "tenant_id": hotel_id}, {"_id": 0}
    )
    if not room_type:
        raise HTTPException(status_code=404, detail="Type de chambre non trouvé")
    return room_type


@config_router.post("/hotels/{hotel_id}/room-types")
async def create_room_type(
    hotel_id: str, 
    room_type: RoomTypeCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Create a new room type"""
    # Validate code uniqueness
    existing = await db.config_room_types.find_one({
        "tenant_id": hotel_id, 
        "code": room_type.code.upper()
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Le code '{room_type.code}' existe déjà")
    
    # Validate code format
    is_valid, error = ValidationService.validate_room_type_code(room_type.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    type_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Get max sort order
    max_sort = await db.config_room_types.find_one(
        {"tenant_id": hotel_id},
        sort=[("sort_order", -1)]
    )
    sort_order = (max_sort.get("sort_order", 0) + 1) if max_sort else 0
    
    type_doc = {
        "id": type_id,
        "tenant_id": hotel_id,
        "code": room_type.code.upper(),
        "name": room_type.name,
        "name_en": room_type.name_en,
        "category": room_type.category.value if hasattr(room_type.category, 'value') else room_type.category,
        "max_occupancy": room_type.max_occupancy,
        "max_adults": room_type.max_adults,
        "max_children": room_type.max_children,
        "standard_occupancy": room_type.max_occupancy,
        "beds": [b.model_dump() for b in room_type.beds] if room_type.beds else [],
        "size_sqm": room_type.size_sqm,
        "view": room_type.view.value if hasattr(room_type.view, 'value') else room_type.view,
        "bathroom": room_type.bathroom.value if hasattr(room_type.bathroom, 'value') else room_type.bathroom,
        "equipment": room_type.equipment,
        "base_price": room_type.base_price,
        "currency": "EUR",
        "total_rooms": 0,
        "images": [],
        "description": room_type.description,
        "ota_mappings": {},
        "is_active": True,
        "sort_order": sort_order,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_room_types.insert_one(type_doc)
    return {**type_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/room-types/{type_id}")
async def update_room_type(
    hotel_id: str,
    type_id: str,
    update: RoomTypeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a room type"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle enums
    for field in ["category", "view", "bathroom"]:
        if field in update_data and hasattr(update_data[field], 'value'):
            update_data[field] = update_data[field].value
    
    # Handle beds
    if "beds" in update_data and update_data["beds"]:
        update_data["beds"] = [b.model_dump() if hasattr(b, 'model_dump') else b for b in update_data["beds"]]
    
    # Validate code uniqueness if changing
    if "code" in update_data:
        existing = await db.config_room_types.find_one({
            "tenant_id": hotel_id,
            "code": update_data["code"].upper(),
            "id": {"$ne": type_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Le code '{update_data['code']}' existe déjà")
        update_data["code"] = update_data["code"].upper()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_room_types.update_one(
        {"id": type_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Type de chambre non trouvé")
    
    updated = await db.config_room_types.find_one({"id": type_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/room-types/{type_id}")
async def delete_room_type(hotel_id: str, type_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a room type (deactivate)"""
    # Check if rooms are using this type
    room_count = await db.config_rooms.count_documents({
        "tenant_id": hotel_id,
        "room_type_id": type_id,
        "is_active": True
    })
    
    if room_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossible de supprimer: {room_count} chambre(s) utilisent ce type"
        )
    
    result = await db.config_room_types.update_one(
        {"id": type_id, "tenant_id": hotel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Type de chambre non trouvé")
    
    return {"message": "Type de chambre désactivé", "id": type_id}


# ═══════════════════════════════════════════════════════════════════════════════
# ROOMS ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/rooms")
async def get_rooms(
    hotel_id: str,
    room_type_id: Optional[str] = None,
    floor: Optional[int] = None,
    status: Optional[str] = None,
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all rooms for a hotel with optional filters"""
    query = {"tenant_id": hotel_id}
    
    if room_type_id:
        query["room_type_id"] = room_type_id
    if floor is not None:
        query["floor"] = floor
    if status:
        query["status"] = status
    if active_only:
        query["is_active"] = True
    
    rooms = await db.config_rooms.find(query, {"_id": 0}).sort([
        ("floor", 1),
        ("room_number", 1)
    ]).to_list(500)
    
    return rooms


@config_router.get("/hotels/{hotel_id}/rooms/{room_id}")
async def get_room(hotel_id: str, room_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific room"""
    room = await db.config_rooms.find_one({"id": room_id, "tenant_id": hotel_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    return room


@config_router.post("/hotels/{hotel_id}/rooms")
async def create_room(hotel_id: str, room: RoomCreate, current_user: dict = Depends(get_current_user)):
    """Create a new room"""
    # Validate room number uniqueness
    existing = await db.config_rooms.find_one({
        "tenant_id": hotel_id,
        "room_number": room.room_number
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Le numéro '{room.room_number}' existe déjà")
    
    # Validate room number format
    is_valid, error = ValidationService.validate_room_number(room.room_number)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Validate room type exists
    room_type = await db.config_room_types.find_one({
        "id": room.room_type_id,
        "tenant_id": hotel_id,
        "is_active": True
    })
    if not room_type:
        raise HTTPException(status_code=400, detail="Type de chambre invalide ou inactif")
    
    room_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    room_doc = {
        "id": room_id,
        "tenant_id": hotel_id,
        "room_number": room.room_number,
        "room_name": room.room_name,
        "room_type_id": room.room_type_id,
        "room_type_code": room_type.get("code"),
        "room_type_name": room_type.get("name"),
        "floor": room.floor,
        "building": room.building,
        "wing": room.wing,
        "view": room.view.value if room.view and hasattr(room.view, 'value') else (room.view if room.view else None),
        "bathroom": room.bathroom.value if room.bathroom and hasattr(room.bathroom, 'value') else (room.bathroom if room.bathroom else None),
        "equipment": room.equipment or [],
        "is_accessible": room.is_accessible,
        "is_smoking": room.is_smoking,
        "has_balcony": room.has_balcony,
        "has_terrace": False,
        "is_connecting": False,
        "connecting_room_ids": [],
        "status": RoomStatus.AVAILABLE.value,
        "is_active": True,
        "notes": room.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_rooms.insert_one(room_doc)
    
    # Update room count in room type
    await db.config_room_types.update_one(
        {"id": room.room_type_id},
        {"$inc": {"total_rooms": 1}}
    )
    
    return {**room_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/rooms/{room_id}")
async def update_room(
    hotel_id: str,
    room_id: str,
    update: RoomUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a room"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Get current room for type change handling
    current_room = await db.config_rooms.find_one({"id": room_id, "tenant_id": hotel_id})
    if not current_room:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    # Handle room number uniqueness
    if "room_number" in update_data:
        existing = await db.config_rooms.find_one({
            "tenant_id": hotel_id,
            "room_number": update_data["room_number"],
            "id": {"$ne": room_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Le numéro '{update_data['room_number']}' existe déjà")
    
    # Handle room type change
    old_type_id = current_room.get("room_type_id")
    new_type_id = update_data.get("room_type_id")
    
    if new_type_id and new_type_id != old_type_id:
        # Validate new room type
        new_type = await db.config_room_types.find_one({
            "id": new_type_id,
            "tenant_id": hotel_id,
            "is_active": True
        })
        if not new_type:
            raise HTTPException(status_code=400, detail="Type de chambre invalide")
        
        update_data["room_type_code"] = new_type.get("code")
        update_data["room_type_name"] = new_type.get("name")
        
        # Update room counts
        await db.config_room_types.update_one({"id": old_type_id}, {"$inc": {"total_rooms": -1}})
        await db.config_room_types.update_one({"id": new_type_id}, {"$inc": {"total_rooms": 1}})
    
    # Handle enums
    for field in ["view", "bathroom", "status"]:
        if field in update_data and hasattr(update_data[field], 'value'):
            update_data[field] = update_data[field].value
    
    # Handle beds
    if "beds" in update_data and update_data["beds"]:
        update_data["beds"] = [b.model_dump() if hasattr(b, 'model_dump') else b for b in update_data["beds"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.config_rooms.update_one(
        {"id": room_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    updated = await db.config_rooms.find_one({"id": room_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/rooms/{room_id}")
async def delete_room(hotel_id: str, room_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a room (deactivate)"""
    room = await db.config_rooms.find_one({"id": room_id, "tenant_id": hotel_id})
    if not room:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    await db.config_rooms.update_one(
        {"id": room_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update room count
    await db.config_room_types.update_one(
        {"id": room.get("room_type_id")},
        {"$inc": {"total_rooms": -1}}
    )
    
    return {"message": "Chambre désactivée", "id": room_id}


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEL IMPORT ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/rooms/import/template")
async def download_room_import_template(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Download Excel template for room import"""
    template_bytes = ExcelImportService.generate_template()
    
    return StreamingResponse(
        BytesIO(template_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=template_chambres_flowtym.xlsx"
        }
    )


@config_router.post("/hotels/{hotel_id}/rooms/import/preview")
async def preview_room_import(
    hotel_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Preview room import from Excel file without saving"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format de fichier invalide. Utilisez .xlsx ou .xls")
    
    # Get existing room types
    room_types = await db.config_room_types.find(
        {"tenant_id": hotel_id, "is_active": True},
        {"_id": 0, "code": 1, "id": 1}
    ).to_list(100)
    
    if not room_types:
        raise HTTPException(
            status_code=400, 
            detail="Aucun type de chambre configuré. Créez d'abord les types de chambres."
        )
    
    room_type_mapping = {rt["code"]: rt["id"] for rt in room_types}
    
    # Get existing room numbers
    existing_rooms = await db.config_rooms.find(
        {"tenant_id": hotel_id},
        {"_id": 0, "room_number": 1}
    ).to_list(500)
    existing_room_numbers = [r["room_number"] for r in existing_rooms]
    
    try:
        file_content = await file.read()
        valid_rooms, errors = ExcelImportService.parse_rooms_excel(
            file_content,
            hotel_id,
            room_type_mapping
        )
        
        preview = ExcelImportService.validate_import_preview(
            valid_rooms,
            errors,
            existing_room_numbers
        )
        
        # Store preview data temporarily for confirmation
        preview["room_types_available"] = list(room_type_mapping.keys())
        
        return preview
        
    except ExcelImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Import preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


@config_router.post("/hotels/{hotel_id}/rooms/import/confirm")
async def confirm_room_import(
    hotel_id: str,
    file: UploadFile = File(...),
    update_existing: bool = Query(False, description="Mettre à jour les chambres existantes"),
    current_user: dict = Depends(get_current_user)
):
    """Confirm and execute room import from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format de fichier invalide")
    
    # Get room type mapping
    room_types = await db.config_room_types.find(
        {"tenant_id": hotel_id, "is_active": True},
        {"_id": 0, "code": 1, "id": 1, "name": 1}
    ).to_list(100)
    
    if not room_types:
        raise HTTPException(status_code=400, detail="Aucun type de chambre configuré")
    
    room_type_mapping = {rt["code"]: rt["id"] for rt in room_types}
    room_type_names = {rt["code"]: rt["name"] for rt in room_types}
    
    # Get existing rooms
    existing_rooms = await db.config_rooms.find(
        {"tenant_id": hotel_id},
        {"_id": 0, "room_number": 1, "id": 1}
    ).to_list(500)
    existing_room_map = {r["room_number"]: r["id"] for r in existing_rooms}
    
    try:
        file_content = await file.read()
        valid_rooms, errors = ExcelImportService.parse_rooms_excel(
            file_content,
            hotel_id,
            room_type_mapping
        )
        
        if not valid_rooms:
            raise HTTPException(status_code=400, detail="Aucune chambre valide à importer")
        
        now = datetime.now(timezone.utc)
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for room_data in valid_rooms:
            room_number = room_data["room_number"]
            
            if room_number in existing_room_map:
                if update_existing:
                    # Update existing room
                    await db.config_rooms.update_one(
                        {"id": existing_room_map[room_number]},
                        {"$set": {
                            "room_type_id": room_data["room_type_id"],
                            "room_type_code": room_data["room_type_code"],
                            "room_type_name": room_type_names.get(room_data["room_type_code"]),
                            "floor": room_data["floor"],
                            "view": room_data.get("view"),
                            "bathroom": room_data.get("bathroom"),
                            "equipment": room_data.get("equipment", []),
                            "is_accessible": room_data.get("is_accessible", False),
                            "notes": room_data.get("notes"),
                            "updated_at": now.isoformat()
                        }}
                    )
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                # Create new room
                room_doc = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": hotel_id,
                    "room_number": room_number,
                    "room_name": None,
                    "room_type_id": room_data["room_type_id"],
                    "room_type_code": room_data["room_type_code"],
                    "room_type_name": room_type_names.get(room_data["room_type_code"]),
                    "floor": room_data["floor"],
                    "building": None,
                    "wing": None,
                    "view": room_data.get("view"),
                    "bathroom": room_data.get("bathroom"),
                    "equipment": room_data.get("equipment", []),
                    "is_accessible": room_data.get("is_accessible", False),
                    "is_smoking": False,
                    "has_balcony": False,
                    "has_terrace": False,
                    "is_connecting": False,
                    "connecting_room_ids": [],
                    "status": RoomStatus.AVAILABLE.value,
                    "is_active": True,
                    "notes": room_data.get("notes"),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
                await db.config_rooms.insert_one(room_doc)
                created_count += 1
                
                # Update room count in room type
                await db.config_room_types.update_one(
                    {"id": room_data["room_type_id"]},
                    {"$inc": {"total_rooms": 1}}
                )
        
        return {
            "success": True,
            "message": f"Import terminé: {created_count} créée(s), {updated_count} mise(s) à jour, {skipped_count} ignorée(s)",
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": errors[:10] if errors else []
        }
        
    except ExcelImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# RATE PLANS ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/rate-plans")
async def get_rate_plans(
    hotel_id: str,
    active_only: bool = Query(True),
    rate_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all rate plans for a hotel"""
    query = {"tenant_id": hotel_id}
    if active_only:
        query["is_active"] = True
    if rate_type:
        query["rate_type"] = rate_type
    
    rate_plans = await db.config_rate_plans.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return rate_plans


@config_router.get("/hotels/{hotel_id}/rate-plans/{rate_id}")
async def get_rate_plan(hotel_id: str, rate_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific rate plan"""
    rate_plan = await db.config_rate_plans.find_one(
        {"id": rate_id, "tenant_id": hotel_id}, {"_id": 0}
    )
    if not rate_plan:
        raise HTTPException(status_code=404, detail="Plan tarifaire non trouvé")
    return rate_plan


@config_router.post("/hotels/{hotel_id}/rate-plans")
async def create_rate_plan(
    hotel_id: str,
    rate_plan: RatePlanCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new rate plan"""
    # Validate code uniqueness
    existing = await db.config_rate_plans.find_one({
        "tenant_id": hotel_id,
        "code": rate_plan.code.upper()
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Le code '{rate_plan.code}' existe déjà")
    
    # Validate code format
    is_valid, error = ValidationService.validate_rate_plan_code(rate_plan.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Validate parent rate if derived
    if rate_plan.is_derived and rate_plan.parent_rate_id:
        parent = await db.config_rate_plans.find_one({
            "id": rate_plan.parent_rate_id,
            "tenant_id": hotel_id,
            "is_active": True
        })
        if not parent:
            raise HTTPException(status_code=400, detail="Plan tarifaire parent invalide")
    
    rate_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Get max sort order
    max_sort = await db.config_rate_plans.find_one(
        {"tenant_id": hotel_id},
        sort=[("sort_order", -1)]
    )
    sort_order = (max_sort.get("sort_order", 0) + 1) if max_sort else 0
    
    rate_doc = {
        "id": rate_id,
        "tenant_id": hotel_id,
        "code": rate_plan.code.upper(),
        "name": rate_plan.name,
        "name_en": rate_plan.name_en,
        "rate_type": rate_plan.rate_type.value if hasattr(rate_plan.rate_type, 'value') else rate_plan.rate_type,
        "meal_plan": rate_plan.meal_plan.value if hasattr(rate_plan.meal_plan, 'value') else rate_plan.meal_plan,
        "is_derived": rate_plan.is_derived,
        "parent_rate_id": rate_plan.parent_rate_id,
        "derivation_rule": rate_plan.derivation_rule.model_dump() if rate_plan.derivation_rule else None,
        "room_prices": rate_plan.room_prices,
        "reference_room_type_id": rate_plan.reference_room_type_id,
        "reference_price": rate_plan.reference_price,
        "currency": "EUR",
        "includes_breakfast": rate_plan.includes_breakfast,
        "includes_parking": False,
        "includes_wifi": True,
        "extra_inclusions": [],
        "restrictions": rate_plan.restrictions.model_dump() if rate_plan.restrictions else {},
        "cancellation_policy_id": rate_plan.cancellation_policy_id,
        "payment_policy_id": rate_plan.payment_policy_id,
        "is_commissionable": True,
        "commission_rate": None,
        "channels": rate_plan.channels,
        "is_public": rate_plan.is_public,
        "valid_from": None,
        "valid_to": None,
        "is_active": True,
        "sort_order": sort_order,
        "description": rate_plan.description,
        "ota_mappings": {},
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_rate_plans.insert_one(rate_doc)
    return {**rate_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/rate-plans/{rate_id}")
async def update_rate_plan(
    hotel_id: str,
    rate_id: str,
    update: RatePlanUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a rate plan"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle enums
    for field in ["rate_type", "meal_plan"]:
        if field in update_data and hasattr(update_data[field], 'value'):
            update_data[field] = update_data[field].value
    
    # Handle nested objects
    if "derivation_rule" in update_data and update_data["derivation_rule"]:
        update_data["derivation_rule"] = update_data["derivation_rule"].model_dump() if hasattr(update_data["derivation_rule"], 'model_dump') else update_data["derivation_rule"]
    if "restrictions" in update_data and update_data["restrictions"]:
        update_data["restrictions"] = update_data["restrictions"].model_dump() if hasattr(update_data["restrictions"], 'model_dump') else update_data["restrictions"]
    
    # Handle dates
    for field in ["valid_from", "valid_to"]:
        if field in update_data and update_data[field]:
            update_data[field] = update_data[field].isoformat() if hasattr(update_data[field], 'isoformat') else update_data[field]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_rate_plans.update_one(
        {"id": rate_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan tarifaire non trouvé")
    
    updated = await db.config_rate_plans.find_one({"id": rate_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/rate-plans/{rate_id}")
async def delete_rate_plan(hotel_id: str, rate_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a rate plan"""
    # Check if derived rates depend on this
    dependent = await db.config_rate_plans.count_documents({
        "tenant_id": hotel_id,
        "parent_rate_id": rate_id,
        "is_active": True
    })
    
    if dependent > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de supprimer: {dependent} plan(s) dérivé(s) utilisent ce tarif"
        )
    
    result = await db.config_rate_plans.update_one(
        {"id": rate_id, "tenant_id": hotel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan tarifaire non trouvé")
    
    return {"message": "Plan tarifaire désactivé", "id": rate_id}


@config_router.post("/hotels/{hotel_id}/rate-plans/simulate")
async def simulate_rate_prices(
    hotel_id: str,
    base_rate_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[RateSimulation]:
    """Simulate derived rate prices based on a base rate"""
    # Get base rate
    base_rate = await db.config_rate_plans.find_one({
        "id": base_rate_id,
        "tenant_id": hotel_id
    })
    if not base_rate:
        raise HTTPException(status_code=404, detail="Plan tarifaire de base non trouvé")
    
    # Get derived rates
    derived_rates = await db.config_rate_plans.find({
        "tenant_id": hotel_id,
        "parent_rate_id": base_rate_id,
        "is_active": True
    }, {"_id": 0}).to_list(50)
    
    # Get room types
    room_types = await db.config_room_types.find({
        "tenant_id": hotel_id,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    simulations = []
    
    for room_type in room_types:
        base_price = base_rate.get("room_prices", {}).get(room_type["id"], room_type.get("base_price", 100))
        
        derived_prices = {}
        for derived in derived_rates:
            rule = derived.get("derivation_rule", {})
            if rule:
                method = rule.get("method", "percentage")
                value = rule.get("value", 0)
                
                if method == "percentage":
                    calculated = base_price * (1 + value / 100)
                else:  # fixed_amount
                    calculated = base_price + value
                
                # Apply rounding
                round_to = rule.get("round_to", 1)
                if round_to > 0:
                    calculated = round(calculated / round_to) * round_to
                
                # Apply min/max
                min_price = rule.get("min_price")
                max_price = rule.get("max_price")
                if min_price and calculated < min_price:
                    calculated = min_price
                if max_price and calculated > max_price:
                    calculated = max_price
                
                derived_prices[derived["id"]] = round(calculated, 2)
        
        simulations.append({
            "room_type_id": room_type["id"],
            "room_type_name": room_type["name"],
            "base_rate_price": base_price,
            "derived_prices": derived_prices,
            "currency": "EUR"
        })
    
    return simulations


# ═══════════════════════════════════════════════════════════════════════════════
# CANCELLATION POLICIES ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/cancellation-policies")
async def get_cancellation_policies(
    hotel_id: str,
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all cancellation policies"""
    query = {"tenant_id": hotel_id}
    if active_only:
        query["is_active"] = True
    
    policies = await db.config_cancellation_policies.find(query, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return policies


@config_router.post("/hotels/{hotel_id}/cancellation-policies")
async def create_cancellation_policy(
    hotel_id: str,
    policy: CancellationPolicyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a cancellation policy"""
    existing = await db.config_cancellation_policies.find_one({
        "tenant_id": hotel_id,
        "code": policy.code.upper()
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Le code '{policy.code}' existe déjà")
    
    policy_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    policy_doc = {
        "id": policy_id,
        "tenant_id": hotel_id,
        "code": policy.code.upper(),
        "name": policy.name,
        "name_en": policy.name_en,
        "policy_type": policy.policy_type.value if hasattr(policy.policy_type, 'value') else policy.policy_type,
        "rules": [r.model_dump() for r in policy.rules] if policy.rules else [],
        "no_show_penalty_type": policy.no_show_penalty_type.value if hasattr(policy.no_show_penalty_type, 'value') else policy.no_show_penalty_type,
        "no_show_penalty_value": 0,
        "allow_modifications": policy.allow_modifications,
        "modification_fee": 0,
        "modification_deadline_hours": 24,
        "description": policy.description,
        "terms_short": policy.terms_short,
        "is_active": True,
        "is_default": False,
        "sort_order": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_cancellation_policies.insert_one(policy_doc)
    return {**policy_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/cancellation-policies/{policy_id}")
async def update_cancellation_policy(
    hotel_id: str,
    policy_id: str,
    update: CancellationPolicyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a cancellation policy"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle enums
    for field in ["policy_type", "no_show_penalty_type"]:
        if field in update_data and hasattr(update_data[field], 'value'):
            update_data[field] = update_data[field].value
    
    # Handle rules
    if "rules" in update_data and update_data["rules"]:
        update_data["rules"] = [r.model_dump() if hasattr(r, 'model_dump') else r for r in update_data["rules"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_cancellation_policies.update_one(
        {"id": policy_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique d'annulation non trouvée")
    
    updated = await db.config_cancellation_policies.find_one({"id": policy_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/cancellation-policies/{policy_id}")
async def delete_cancellation_policy(hotel_id: str, policy_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a cancellation policy"""
    result = await db.config_cancellation_policies.update_one(
        {"id": policy_id, "tenant_id": hotel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique d'annulation non trouvée")
    
    return {"message": "Politique d'annulation désactivée", "id": policy_id}


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT POLICIES ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/payment-policies")
async def get_payment_policies(
    hotel_id: str,
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all payment policies"""
    query = {"tenant_id": hotel_id}
    if active_only:
        query["is_active"] = True
    
    policies = await db.config_payment_policies.find(query, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return policies


@config_router.post("/hotels/{hotel_id}/payment-policies")
async def create_payment_policy(
    hotel_id: str,
    policy: PaymentPolicyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a payment policy"""
    existing = await db.config_payment_policies.find_one({
        "tenant_id": hotel_id,
        "code": policy.code.upper()
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Le code '{policy.code}' existe déjà")
    
    policy_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    policy_doc = {
        "id": policy_id,
        "tenant_id": hotel_id,
        "code": policy.code.upper(),
        "name": policy.name,
        "name_en": policy.name_en,
        "timing": policy.timing.value if hasattr(policy.timing, 'value') else policy.timing,
        "deposit_percentage": policy.deposit_percentage,
        "deposit_fixed_amount": policy.deposit_fixed_amount,
        "deposit_due_days": 0,
        "balance_due_timing": policy.balance_due_timing.value if hasattr(policy.balance_due_timing, 'value') else policy.balance_due_timing,
        "balance_due_days_before": 0,
        "accepted_methods": [m.value if hasattr(m, 'value') else m for m in policy.accepted_methods],
        "requires_card_guarantee": policy.requires_card_guarantee,
        "card_pre_auth_amount": 0,
        "description": policy.description,
        "is_active": True,
        "is_default": False,
        "sort_order": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.config_payment_policies.insert_one(policy_doc)
    return {**policy_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/payment-policies/{policy_id}")
async def update_payment_policy(
    hotel_id: str,
    policy_id: str,
    update: PaymentPolicyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a payment policy"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle enums
    for field in ["timing", "balance_due_timing"]:
        if field in update_data and hasattr(update_data[field], 'value'):
            update_data[field] = update_data[field].value
    
    if "accepted_methods" in update_data:
        update_data["accepted_methods"] = [m.value if hasattr(m, 'value') else m for m in update_data["accepted_methods"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_payment_policies.update_one(
        {"id": policy_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique de paiement non trouvée")
    
    updated = await db.config_payment_policies.find_one({"id": policy_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/payment-policies/{policy_id}")
async def delete_payment_policy(hotel_id: str, policy_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a payment policy"""
    result = await db.config_payment_policies.update_one(
        {"id": policy_id, "tenant_id": hotel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique de paiement non trouvée")
    
    return {"message": "Politique de paiement désactivée", "id": policy_id}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG USERS ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/users")
async def get_config_users(
    hotel_id: str,
    role: Optional[str] = None,
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all config users for a hotel"""
    query = {"tenant_id": hotel_id}
    if role:
        query["role"] = role
    if active_only:
        query["is_active"] = True
    
    users = await db.config_users.find(query, {"_id": 0}).sort("last_name", 1).to_list(200)
    return users


@config_router.get("/hotels/{hotel_id}/users/{user_id}")
async def get_config_user(hotel_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific config user"""
    user = await db.config_users.find_one(
        {"id": user_id, "tenant_id": hotel_id}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user


@config_router.post("/hotels/{hotel_id}/users")
async def create_config_user(
    hotel_id: str,
    user: ConfigUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a config user"""
    # Validate email uniqueness
    existing = await db.config_users.find_one({
        "tenant_id": hotel_id,
        "email": user.email.lower()
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cet email existe déjà")
    
    # Validate email format
    is_valid, error = ValidationService.validate_email(user.email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "id": user_id,
        "tenant_id": hotel_id,
        "auth_user_id": None,
        "email": user.email.lower(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}",
        "phone": user.phone,
        "mobile": None,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "role_definition_id": None,
        "custom_permissions": [],
        "department": user.department,
        "job_title": user.job_title,
        "hotels": user.hotels or [hotel_id],
        "is_active": True,
        "is_locked": False,
        "locked_reason": None,
        "last_login": None,
        "login_count": 0,
        "language": user.language,
        "timezone": "Europe/Paris",
        "notifications_enabled": True,
        "avatar_url": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": current_user.get("user_id")
    }
    
    await db.config_users.insert_one(user_doc)
    return {**user_doc, "_id": None}


@config_router.put("/hotels/{hotel_id}/users/{user_id}")
async def update_config_user(
    hotel_id: str,
    user_id: str,
    update: ConfigUserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a config user"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle email change
    if "email" in update_data:
        existing = await db.config_users.find_one({
            "tenant_id": hotel_id,
            "email": update_data["email"].lower(),
            "id": {"$ne": user_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Cet email existe déjà")
        update_data["email"] = update_data["email"].lower()
    
    # Handle role
    if "role" in update_data and hasattr(update_data["role"], 'value'):
        update_data["role"] = update_data["role"].value
    
    # Update full name if names changed
    if "first_name" in update_data or "last_name" in update_data:
        current = await db.config_users.find_one({"id": user_id, "tenant_id": hotel_id})
        if current:
            first = update_data.get("first_name", current.get("first_name", ""))
            last = update_data.get("last_name", current.get("last_name", ""))
            update_data["full_name"] = f"{first} {last}"
    
    # Handle custom permissions
    if "custom_permissions" in update_data and update_data["custom_permissions"]:
        update_data["custom_permissions"] = [
            p.model_dump() if hasattr(p, 'model_dump') else p 
            for p in update_data["custom_permissions"]
        ]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_users.update_one(
        {"id": user_id, "tenant_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    updated = await db.config_users.find_one({"id": user_id}, {"_id": 0})
    return updated


@config_router.delete("/hotels/{hotel_id}/users/{user_id}")
async def delete_config_user(hotel_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete (deactivate) a config user"""
    result = await db.config_users.update_one(
        {"id": user_id, "tenant_id": hotel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur désactivé", "id": user_id}


@config_router.get("/roles")
async def get_available_roles(current_user: dict = Depends(get_current_user)):
    """Get all available roles with their permissions"""
    roles = []
    for role_enum, role_def in DEFAULT_ROLES.items():
        roles.append({
            "code": role_enum.value,
            "name": role_def.name,
            "description": role_def.description,
            "can_manage_users": role_def.can_manage_users,
            "can_manage_config": role_def.can_manage_config,
            "can_view_financials": role_def.can_view_financials,
            "is_system": role_def.is_system
        })
    return roles


# ═══════════════════════════════════════════════════════════════════════════════
# ADVANCED SETTINGS ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/settings")
async def get_advanced_settings(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Get advanced settings for a hotel"""
    settings = await db.config_settings.find_one({"tenant_id": hotel_id}, {"_id": 0})
    
    if not settings:
        # Return default settings
        return {
            "id": str(uuid.uuid4()),
            "tenant_id": hotel_id,
            "taxes": [],
            "segments": [],
            "business_rules": [],
            "min_booking_advance_hours": 0,
            "max_booking_advance_days": 365,
            "default_arrival_time": "15:00",
            "default_departure_time": "11:00",
            "allow_same_day_booking": True,
            "overbooking_allowed": False,
            "overbooking_percentage": 0,
            "round_prices_to": 1,
            "min_price_floor": 0,
            "auto_confirmation_email": True,
            "auto_reminder_email": True,
            "reminder_days_before": 3,
            "enable_audit_log": True,
            "is_configured": False
        }
    
    settings["is_configured"] = True
    return settings


@config_router.put("/hotels/{hotel_id}/settings")
async def update_advanced_settings(
    hotel_id: str,
    update: AdvancedSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update advanced settings"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Handle nested objects
    if "taxes" in update_data:
        update_data["taxes"] = [t.model_dump() if hasattr(t, 'model_dump') else t for t in update_data["taxes"]]
    if "segments" in update_data:
        update_data["segments"] = [s.model_dump() if hasattr(s, 'model_dump') else s for s in update_data["segments"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.config_settings.update_one(
        {"tenant_id": hotel_id},
        {"$set": update_data},
        upsert=True
    )
    
    if result.upserted_id:
        # New document was created
        await db.config_settings.update_one(
            {"tenant_id": hotel_id},
            {"$set": {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    updated = await db.config_settings.find_one({"tenant_id": hotel_id}, {"_id": 0})
    return updated


# ═══════════════════════════════════════════════════════════════════════════════
# TAX MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.post("/hotels/{hotel_id}/taxes")
async def add_tax_rule(
    hotel_id: str,
    tax: TaxRule,
    current_user: dict = Depends(get_current_user)
):
    """Add a tax rule to hotel settings"""
    settings = await db.config_settings.find_one({"tenant_id": hotel_id})
    
    if not settings:
        settings = {
            "id": str(uuid.uuid4()),
            "tenant_id": hotel_id,
            "taxes": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.config_settings.insert_one(settings)
    
    tax_doc = tax.model_dump()
    tax_doc["id"] = str(uuid.uuid4())
    
    await db.config_settings.update_one(
        {"tenant_id": hotel_id},
        {
            "$push": {"taxes": tax_doc},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return tax_doc


@config_router.delete("/hotels/{hotel_id}/taxes/{tax_id}")
async def remove_tax_rule(hotel_id: str, tax_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a tax rule"""
    result = await db.config_settings.update_one(
        {"tenant_id": hotel_id},
        {
            "$pull": {"taxes": {"id": tax_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Règle de taxe non trouvée")
    
    return {"message": "Règle de taxe supprimée", "id": tax_id}


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER SEGMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.post("/hotels/{hotel_id}/segments")
async def add_customer_segment(
    hotel_id: str,
    segment: CustomerSegment,
    current_user: dict = Depends(get_current_user)
):
    """Add a customer segment"""
    settings = await db.config_settings.find_one({"tenant_id": hotel_id})
    
    if not settings:
        settings = {
            "id": str(uuid.uuid4()),
            "tenant_id": hotel_id,
            "segments": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.config_settings.insert_one(settings)
    
    segment_doc = segment.model_dump()
    segment_doc["id"] = str(uuid.uuid4())
    segment_doc["tenant_id"] = hotel_id
    
    await db.config_settings.update_one(
        {"tenant_id": hotel_id},
        {
            "$push": {"segments": segment_doc},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return segment_doc


@config_router.delete("/hotels/{hotel_id}/segments/{segment_id}")
async def remove_customer_segment(hotel_id: str, segment_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a customer segment"""
    result = await db.config_settings.update_one(
        {"tenant_id": hotel_id},
        {
            "$pull": {"segments": {"id": segment_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Segment non trouvé")
    
    return {"message": "Segment supprimé", "id": segment_id}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

@config_router.get("/hotels/{hotel_id}/summary")
async def get_configuration_summary(hotel_id: str, current_user: dict = Depends(get_current_user)):
    """Get a summary of the hotel configuration status"""
    
    # Count various entities
    room_types_count = await db.config_room_types.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    rooms_count = await db.config_rooms.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    rate_plans_count = await db.config_rate_plans.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    cancel_policies_count = await db.config_cancellation_policies.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    payment_policies_count = await db.config_payment_policies.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    users_count = await db.config_users.count_documents({
        "tenant_id": hotel_id, "is_active": True
    })
    
    # Get hotel profile status
    profile = await db.config_hotels.find_one({"tenant_id": hotel_id})
    
    # Get settings status
    settings = await db.config_settings.find_one({"tenant_id": hotel_id})
    
    # Calculate completion percentage
    checks = [
        profile is not None,
        room_types_count > 0,
        rooms_count > 0,
        rate_plans_count > 0,
        cancel_policies_count > 0,
        payment_policies_count > 0,
        users_count > 0,
        settings is not None and len(settings.get("taxes", [])) > 0
    ]
    completion = int(sum(checks) / len(checks) * 100)
    
    return {
        "hotel_id": hotel_id,
        "profile_configured": profile is not None,
        "room_types": room_types_count,
        "rooms": rooms_count,
        "rate_plans": rate_plans_count,
        "cancellation_policies": cancel_policies_count,
        "payment_policies": payment_policies_count,
        "users": users_count,
        "taxes_configured": settings is not None and len(settings.get("taxes", [])) > 0,
        "segments_count": len(settings.get("segments", [])) if settings else 0,
        "completion_percentage": completion,
        "checklist": {
            "profile": profile is not None,
            "room_types": room_types_count > 0,
            "rooms": rooms_count > 0,
            "rate_plans": rate_plans_count > 0,
            "policies": cancel_policies_count > 0 and payment_policies_count > 0,
            "users": users_count > 0,
            "taxes": settings is not None and len(settings.get("taxes", [])) > 0
        }
    }
