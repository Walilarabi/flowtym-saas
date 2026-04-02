"""
Super Admin - Hotel Configuration & Subscription Management
Complete hotel management with rooms, types, equipment, services
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import os

from .routes import verify_superadmin, log_activity
from .catalog_models import DEFAULT_MODULES, ModuleConfig, FeatureToggle

hotel_config_router = APIRouter(prefix="/superadmin/hotels", tags=["Hotel Configuration"])
security = HTTPBearer()

# ===================== MODELS =====================

class RoomType(BaseModel):
    code: str
    name: str
    description: str = ""
    base_capacity: int = 2
    max_capacity: int = 4
    base_price: float = 100
    amenities: List[str] = []

class Room(BaseModel):
    number: str
    room_type_code: str
    floor: int = 0
    status: str = "available"  # available, occupied, maintenance, out_of_order
    notes: str = ""

class Equipment(BaseModel):
    code: str
    name: str
    category: str  # room, common_area, spa, restaurant, etc.
    quantity: int = 1

class Service(BaseModel):
    code: str
    name: str
    description: str = ""
    price: float = 0
    is_included: bool = False
    category: str = "general"  # general, spa, restaurant, activities, etc.

class HotelConfigUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    stars: Optional[int] = None
    description: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    vat_rate: Optional[float] = None

class SubscriptionAssignment(BaseModel):
    plan_id: str
    payment_frequency: str = "monthly"  # monthly, annual
    trial_days: int = 0
    custom_modules: Optional[List[ModuleConfig]] = None
    custom_max_users: Optional[int] = None
    custom_price: Optional[float] = None
    notes: str = ""

class SubscriptionModification(BaseModel):
    """Modify subscription: upgrade, downgrade, add/remove modules"""
    new_plan_id: Optional[str] = None
    add_modules: Optional[List[str]] = None  # Module codes to add
    remove_modules: Optional[List[str]] = None  # Module codes to remove
    module_features: Optional[Dict[str, List[str]]] = None  # Module code -> enabled features
    new_max_users: Optional[int] = None
    apply_immediately: bool = True

class TrialExtension(BaseModel):
    additional_days: int
    reason: str = ""

# ===================== HOTEL CONFIGURATION =====================

@hotel_config_router.get("/{hotel_id}/config")
async def get_hotel_config(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get complete hotel configuration"""
    verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Get room types
    room_types = await db.sa_hotel_room_types.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(100)
    
    # Get rooms
    rooms = await db.sa_hotel_rooms.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(500)
    
    # Get equipment
    equipment = await db.sa_hotel_equipment.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(200)
    
    # Get services
    services = await db.sa_hotel_services.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(100)
    
    # Get subscription details
    subscription = await db.sa_subscriptions.find_one(
        {"hotel_id": hotel_id}, {"_id": 0}
    )
    
    # If no new-format subscription, build from hotel data
    if not subscription and hotel.get("subscription_plan"):
        subscription = {
            "plan_code": hotel.get("subscription_plan"),
            "status": hotel.get("subscription_status", "active"),
            "max_users": hotel.get("max_users", 5),
            "end_date": hotel.get("subscription_end_date"),
            "modules": hotel.get("modules", [])
        }
    
    return {
        "hotel": hotel,
        "room_types": room_types,
        "rooms": rooms,
        "rooms_count": len(rooms),
        "equipment": equipment,
        "services": services,
        "subscription": subscription
    }

@hotel_config_router.put("/{hotel_id}/config")
async def update_hotel_config(
    hotel_id: str,
    config: HotelConfigUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update hotel general configuration"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    update_data = {k: v for k, v in config.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sa_hotels.update_one({"id": hotel_id}, {"$set": update_data})
    
    await log_activity(db, "update_hotel_config", "hotel", hotel_id, hotel.get("name", ""), user, update_data)
    
    return {"message": "Configuration mise à jour", "updated_fields": list(update_data.keys())}

# ===================== ROOM TYPES =====================

@hotel_config_router.get("/{hotel_id}/room-types")
async def list_room_types(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all room types for a hotel"""
    verify_superadmin(credentials)
    
    room_types = await db.sa_hotel_room_types.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(100)
    
    return room_types

@hotel_config_router.post("/{hotel_id}/room-types")
async def create_room_type(
    hotel_id: str,
    room_type: RoomType,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new room type"""
    user = verify_superadmin(credentials)
    
    # Check hotel exists
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Check code uniqueness
    existing = await db.sa_hotel_room_types.find_one({
        "hotel_id": hotel_id, "code": room_type.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Code de typologie déjà utilisé")
    
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **room_type.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotel_room_types.insert_one(doc)
    del doc["_id"]
    
    await log_activity(db, "create_room_type", "room_type", doc["id"], room_type.name, user)
    
    return doc

@hotel_config_router.put("/{hotel_id}/room-types/{type_id}")
async def update_room_type(
    hotel_id: str,
    type_id: str,
    room_type: RoomType,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a room type"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotel_room_types.find_one({"id": type_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Typologie non trouvée")
    
    update_data = room_type.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sa_hotel_room_types.update_one({"id": type_id}, {"$set": update_data})
    
    await log_activity(db, "update_room_type", "room_type", type_id, room_type.name, user)
    
    return {"message": "Typologie mise à jour"}

@hotel_config_router.delete("/{hotel_id}/room-types/{type_id}")
async def delete_room_type(
    hotel_id: str,
    type_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a room type"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotel_room_types.find_one({"id": type_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Typologie non trouvée")
    
    # Check if rooms use this type
    rooms_count = await db.sa_hotel_rooms.count_documents({
        "hotel_id": hotel_id, "room_type_code": existing.get("code")
    })
    if rooms_count > 0:
        raise HTTPException(status_code=400, detail=f"{rooms_count} chambre(s) utilisent cette typologie")
    
    await db.sa_hotel_room_types.delete_one({"id": type_id})
    
    await log_activity(db, "delete_room_type", "room_type", type_id, existing.get("name", ""), user)
    
    return {"message": "Typologie supprimée"}

# ===================== ROOMS =====================

@hotel_config_router.get("/{hotel_id}/rooms")
async def list_rooms(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all rooms for a hotel"""
    verify_superadmin(credentials)
    
    rooms = await db.sa_hotel_rooms.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).sort("number", 1).to_list(500)
    
    return rooms

@hotel_config_router.post("/{hotel_id}/rooms")
async def create_room(
    hotel_id: str,
    room: Room,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new room"""
    user = verify_superadmin(credentials)
    
    # Check hotel exists
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Check room type exists
    room_type = await db.sa_hotel_room_types.find_one({
        "hotel_id": hotel_id, "code": room.room_type_code
    })
    if not room_type:
        raise HTTPException(status_code=400, detail="Typologie de chambre invalide")
    
    # Check number uniqueness
    existing = await db.sa_hotel_rooms.find_one({
        "hotel_id": hotel_id, "number": room.number
    })
    if existing:
        raise HTTPException(status_code=400, detail="Numéro de chambre déjà utilisé")
    
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **room.model_dump(),
        "room_type_name": room_type.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotel_rooms.insert_one(doc)
    del doc["_id"]
    
    await log_activity(db, "create_room", "room", doc["id"], f"Chambre {room.number}", user)
    
    return doc

@hotel_config_router.post("/{hotel_id}/rooms/bulk")
async def create_rooms_bulk(
    hotel_id: str,
    rooms: List[Room],
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create multiple rooms at once"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    created = 0
    errors = []
    
    for room in rooms:
        try:
            # Check room type exists
            room_type = await db.sa_hotel_room_types.find_one({
                "hotel_id": hotel_id, "code": room.room_type_code
            })
            if not room_type:
                errors.append(f"Chambre {room.number}: typologie invalide")
                continue
            
            # Check number uniqueness
            existing = await db.sa_hotel_rooms.find_one({
                "hotel_id": hotel_id, "number": room.number
            })
            if existing:
                errors.append(f"Chambre {room.number}: numéro déjà utilisé")
                continue
            
            doc = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                **room.model_dump(),
                "room_type_name": room_type.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.sa_hotel_rooms.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append(f"Chambre {room.number}: {str(e)}")
    
    await log_activity(db, "create_rooms_bulk", "room", hotel_id, f"{created} chambres", user)
    
    return {"created": created, "errors": errors}

@hotel_config_router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_room(
    hotel_id: str,
    room_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a room"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotel_rooms.find_one({"id": room_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Chambre non trouvée")
    
    await db.sa_hotel_rooms.delete_one({"id": room_id})
    
    await log_activity(db, "delete_room", "room", room_id, f"Chambre {existing.get('number')}", user)
    
    return {"message": "Chambre supprimée"}

# ===================== EQUIPMENT =====================

@hotel_config_router.get("/{hotel_id}/equipment")
async def list_equipment(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all equipment for a hotel"""
    verify_superadmin(credentials)
    
    equipment = await db.sa_hotel_equipment.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(200)
    
    return equipment

@hotel_config_router.post("/{hotel_id}/equipment")
async def create_equipment(
    hotel_id: str,
    equipment: Equipment,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create equipment"""
    user = verify_superadmin(credentials)
    
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **equipment.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotel_equipment.insert_one(doc)
    del doc["_id"]
    
    await log_activity(db, "create_equipment", "equipment", doc["id"], equipment.name, user)
    
    return doc

@hotel_config_router.delete("/{hotel_id}/equipment/{equipment_id}")
async def delete_equipment(
    hotel_id: str,
    equipment_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete equipment"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotel_equipment.find_one({"id": equipment_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    await db.sa_hotel_equipment.delete_one({"id": equipment_id})
    
    await log_activity(db, "delete_equipment", "equipment", equipment_id, existing.get("name", ""), user)
    
    return {"message": "Équipement supprimé"}

# ===================== SERVICES =====================

@hotel_config_router.get("/{hotel_id}/services")
async def list_services(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all services for a hotel"""
    verify_superadmin(credentials)
    
    services = await db.sa_hotel_services.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(100)
    
    return services

@hotel_config_router.post("/{hotel_id}/services")
async def create_service(
    hotel_id: str,
    service: Service,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create service"""
    user = verify_superadmin(credentials)
    
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **service.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotel_services.insert_one(doc)
    del doc["_id"]
    
    await log_activity(db, "create_service", "service", doc["id"], service.name, user)
    
    return doc

@hotel_config_router.delete("/{hotel_id}/services/{service_id}")
async def delete_service(
    hotel_id: str,
    service_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete service"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotel_services.find_one({"id": service_id, "hotel_id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    
    await db.sa_hotel_services.delete_one({"id": service_id})
    
    await log_activity(db, "delete_service", "service", service_id, existing.get("name", ""), user)
    
    return {"message": "Service supprimé"}

# ===================== SUBSCRIPTION MANAGEMENT =====================

@hotel_config_router.post("/{hotel_id}/subscription/assign")
async def assign_subscription(
    hotel_id: str,
    assignment: SubscriptionAssignment,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Assign a subscription plan to a hotel"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Get plan from catalog
    plan = await db.sa_subscription_plans.find_one({"id": assignment.plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    now = datetime.now(timezone.utc)
    
    # Calculate dates
    trial_end = None
    initial_status = "active"
    if assignment.trial_days > 0:
        trial_end = (now + timedelta(days=assignment.trial_days)).isoformat()
        initial_status = "trial"
    
    # Calculate pricing
    if assignment.payment_frequency == "annual":
        base_price = plan.get("price_annual", plan["price_monthly"] * 12)
        discount = plan.get("annual_discount_percent", 0)
        price_effective = base_price * (1 - discount / 100) / 12
        end_date = now + timedelta(days=365)
    else:
        price_effective = plan.get("price_monthly")
        end_date = now + timedelta(days=30)
    
    if assignment.custom_price is not None:
        price_effective = assignment.custom_price
    
    # Use custom modules or plan defaults
    modules = assignment.custom_modules or plan.get("modules", [])
    if assignment.custom_modules:
        # Convert to full format
        modules_data = []
        for mod_config in assignment.custom_modules:
            mod_dict = mod_config.model_dump() if hasattr(mod_config, 'model_dump') else mod_config
            module_def = DEFAULT_MODULES.get(mod_dict["code"])
            if module_def:
                features_data = []
                if mod_dict.get("features"):
                    for feat in mod_dict["features"]:
                        feat_dict = feat.model_dump() if hasattr(feat, 'model_dump') else feat
                        feat_def = module_def["features"].get(feat_dict["code"])
                        if feat_def:
                            features_data.append({
                                "code": feat_dict["code"],
                                "name": feat_def["name"],
                                "enabled": feat_dict.get("enabled", True)
                            })
                else:
                    for feat_code, feat_def in module_def["features"].items():
                        features_data.append({
                            "code": feat_code,
                            "name": feat_def["name"],
                            "enabled": True
                        })
                
                modules_data.append({
                    "code": mod_dict["code"],
                    "name": module_def["name"],
                    "enabled": mod_dict.get("enabled", True),
                    "features": features_data
                })
        modules = modules_data
    
    # Create subscription document
    sub_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "plan_id": plan["id"],
        "plan": plan["code"],
        "plan_name": plan["name"],
        "status": initial_status,
        "payment_frequency": assignment.payment_frequency,
        "trial_days": assignment.trial_days,
        "trial_end_date": trial_end,
        "price_monthly": plan["price_monthly"],
        "price_effective": round(price_effective, 2),
        "modules": modules,
        "max_users": assignment.custom_max_users if assignment.custom_max_users else plan["max_users"],
        "start_date": now.isoformat(),
        "end_date": end_date.isoformat(),
        "next_billing_date": end_date.isoformat(),
        "notes": assignment.notes,
        "created_at": now.isoformat()
    }
    
    # Remove existing subscription if any
    await db.sa_subscriptions.delete_many({"hotel_id": hotel_id})
    
    # Insert new subscription
    await db.sa_subscriptions.insert_one(sub_doc)
    del sub_doc["_id"]
    
    # Update hotel with subscription info
    await db.sa_hotels.update_one({"id": hotel_id}, {"$set": {
        "subscription_plan": plan["code"],
        "subscription_status": initial_status,
        "subscription_end_date": end_date.isoformat(),
        "max_users": sub_doc["max_users"],
        "modules": modules
    }})
    
    await log_activity(db, "assign_subscription", "subscription", sub_doc["id"],
                      f"{hotel.get('name')} - {plan['name']}", user)
    
    return sub_doc

@hotel_config_router.post("/{hotel_id}/subscription/modify")
async def modify_subscription(
    hotel_id: str,
    modification: SubscriptionModification,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Modify hotel subscription:
    - Upgrade/Downgrade to a new plan
    - Add/Remove specific modules
    - Change feature toggles
    """
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Get current subscription
    sub = await db.sa_subscriptions.find_one({"hotel_id": hotel_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement actif")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"updated_at": now}
    changes = []
    
    # Handle plan change (upgrade/downgrade)
    if modification.new_plan_id:
        new_plan = await db.sa_subscription_plans.find_one({"id": modification.new_plan_id})
        if not new_plan:
            raise HTTPException(status_code=404, detail="Nouveau plan non trouvé")
        
        update_data["plan_id"] = new_plan["id"]
        update_data["plan"] = new_plan["code"]
        update_data["plan_name"] = new_plan["name"]
        update_data["modules"] = new_plan["modules"]
        
        if modification.apply_immediately:
            update_data["price_monthly"] = new_plan["price_monthly"]
            update_data["price_effective"] = new_plan["price_monthly"]
            update_data["max_users"] = modification.new_max_users or new_plan["max_users"]
        
        old_plan = sub.get("plan_name", sub.get("plan"))
        changes.append(f"Plan: {old_plan} → {new_plan['name']}")
    
    # Handle module additions
    current_modules = sub.get("modules", [])
    if isinstance(current_modules, list) and len(current_modules) > 0:
        if isinstance(current_modules[0], dict):
            current_module_codes = {m.get("code") for m in current_modules}
        else:
            current_module_codes = set(current_modules)
    else:
        current_module_codes = set()
    
    if modification.add_modules:
        for mod_code in modification.add_modules:
            if mod_code not in current_module_codes:
                module_def = DEFAULT_MODULES.get(mod_code)
                if module_def:
                    features_data = [
                        {"code": fc, "name": fd["name"], "enabled": True}
                        for fc, fd in module_def["features"].items()
                    ]
                    new_module = {
                        "code": mod_code,
                        "name": module_def["name"],
                        "enabled": True,
                        "features": features_data
                    }
                    current_modules.append(new_module)
                    changes.append(f"Module ajouté: {module_def['name']}")
    
    # Handle module removals
    if modification.remove_modules:
        for mod_code in modification.remove_modules:
            current_modules = [m for m in current_modules 
                             if (m.get("code") if isinstance(m, dict) else m) != mod_code]
            module_def = DEFAULT_MODULES.get(mod_code)
            if module_def:
                changes.append(f"Module retiré: {module_def['name']}")
    
    # Handle feature toggles
    if modification.module_features:
        for mod_code, enabled_features in modification.module_features.items():
            for mod in current_modules:
                if isinstance(mod, dict) and mod.get("code") == mod_code:
                    for feat in mod.get("features", []):
                        feat["enabled"] = feat["code"] in enabled_features
                    break
        changes.append("Fonctionnalités modifiées")
    
    if current_modules:
        update_data["modules"] = current_modules
    
    if modification.new_max_users:
        update_data["max_users"] = modification.new_max_users
        changes.append(f"Utilisateurs max: {modification.new_max_users}")
    
    # Apply updates
    await db.sa_subscriptions.update_one({"id": sub["id"]}, {"$set": update_data})
    
    # Update hotel as well
    hotel_update = {}
    if "plan" in update_data:
        hotel_update["subscription_plan"] = update_data["plan"]
    if "modules" in update_data:
        hotel_update["modules"] = update_data["modules"]
    if "max_users" in update_data:
        hotel_update["max_users"] = update_data["max_users"]
    
    if hotel_update:
        await db.sa_hotels.update_one({"id": hotel_id}, {"$set": hotel_update})
    
    await log_activity(db, "modify_subscription", "subscription", sub["id"],
                      hotel.get("name", ""), user, {"changes": changes})
    
    return {
        "message": "Abonnement modifié",
        "changes": changes,
        "applied_immediately": modification.apply_immediately
    }

@hotel_config_router.post("/{hotel_id}/subscription/extend-trial")
async def extend_trial(
    hotel_id: str,
    extension: TrialExtension,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Extend trial period for a hotel"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    sub = await db.sa_subscriptions.find_one({"hotel_id": hotel_id})
    
    now = datetime.now(timezone.utc)
    
    if sub:
        if sub.get("status") != "trial":
            raise HTTPException(status_code=400, detail="L'abonnement n'est pas en période d'essai")
        
        current_end = datetime.fromisoformat(sub.get("trial_end_date", now.isoformat()).replace('Z', '+00:00'))
        new_end = current_end + timedelta(days=extension.additional_days)
        
        await db.sa_subscriptions.update_one({"id": sub["id"]}, {"$set": {
            "trial_end_date": new_end.isoformat(),
            "end_date": new_end.isoformat(),
            "trial_days": sub.get("trial_days", 0) + extension.additional_days
        }})
        
        await db.sa_hotels.update_one({"id": hotel_id}, {"$set": {
            "subscription_end_date": new_end.isoformat()
        }})
    else:
        # Legacy format
        if hotel.get("subscription_status") != "trial":
            raise HTTPException(status_code=400, detail="L'abonnement n'est pas en période d'essai")
        
        current_end = datetime.fromisoformat(hotel.get("subscription_end_date", now.isoformat()).replace('Z', '+00:00'))
        new_end = current_end + timedelta(days=extension.additional_days)
        
        await db.sa_hotels.update_one({"id": hotel_id}, {"$set": {
            "subscription_end_date": new_end.isoformat()
        }})
    
    await log_activity(db, "extend_trial", "subscription", hotel_id,
                      f"{hotel.get('name')} +{extension.additional_days} jours", user, 
                      {"reason": extension.reason})
    
    return {
        "message": f"Période d'essai prolongée de {extension.additional_days} jours",
        "new_end_date": new_end.isoformat() if 'new_end' in dir() else None,
        "reason": extension.reason
    }

@hotel_config_router.get("/{hotel_id}/subscription/modules")
async def get_hotel_modules(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current modules and features for a hotel"""
    verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"hotel_id": hotel_id}, {"_id": 0, "modules": 1})
    
    if not sub:
        hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0, "modules": 1})
        if hotel and hotel.get("modules"):
            return {"modules": hotel["modules"]}
        return {"modules": []}
    
    return {"modules": sub.get("modules", [])}
