"""
Super Admin - Subscription Catalog Routes
Dynamic subscription plans management and hotel subscription lifecycle
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import os

from .catalog_models import (
    DEFAULT_MODULES,
    SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionPlanResponse,
    ModuleDefinitionResponse, ModuleConfig, FeatureToggle,
    PauseSubscriptionRequest, ReactivateSubscriptionRequest,
    UpgradeSubscriptionRequest, DowngradeSubscriptionRequest,
    DowngradeCompatibilityCheck, DowngradeAction,
    HotelSubscriptionDetail, SubscriptionStatusV2
)
from .routes import verify_superadmin, log_activity

catalog_router = APIRouter(prefix="/superadmin/catalog", tags=["Subscription Catalog"])
lifecycle_router = APIRouter(prefix="/superadmin/subscriptions", tags=["Subscription Lifecycle"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')

# ===================== MODULE DEFINITIONS =====================

@catalog_router.get("/modules", response_model=List[ModuleDefinitionResponse])
async def get_available_modules(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all available modules and their features"""
    verify_superadmin(credentials)
    
    modules = []
    for code, data in DEFAULT_MODULES.items():
        modules.append(ModuleDefinitionResponse(
            code=code,
            name=data["name"],
            description=data["description"],
            icon=data["icon"],
            features=data["features"]
        ))
    
    return modules

# ===================== SUBSCRIPTION PLANS CATALOG =====================

@catalog_router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def list_subscription_plans(
    db,
    include_inactive: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all subscription plans in the catalog"""
    verify_superadmin(credentials)
    
    query = {} if include_inactive else {"is_active": True}
    plans = await db.sa_subscription_plans.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    
    # Enrich with subscriber count
    for plan in plans:
        plan["subscribers_count"] = await db.sa_subscriptions.count_documents({
            "plan_id": plan["id"],
            "status": {"$in": ["active", "trial"]}
        })
    
    return plans

@catalog_router.get("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific subscription plan"""
    verify_superadmin(credentials)
    
    plan = await db.sa_subscription_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    plan["subscribers_count"] = await db.sa_subscriptions.count_documents({
        "plan_id": plan_id,
        "status": {"$in": ["active", "trial"]}
    })
    
    return plan

@catalog_router.post("/plans", response_model=SubscriptionPlanResponse)
async def create_subscription_plan(
    plan: SubscriptionPlanCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new subscription plan"""
    user = verify_superadmin(credentials)
    
    # Check unique code
    existing = await db.sa_subscription_plans.find_one({"code": plan.code})
    if existing:
        raise HTTPException(status_code=400, detail="Un plan avec ce code existe déjà")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build modules with full feature data
    modules_data = []
    for mod_config in plan.modules:
        module_def = DEFAULT_MODULES.get(mod_config.code)
        if not module_def:
            continue
        
        # Build features list
        features_data = []
        if mod_config.features:
            for feat in mod_config.features:
                feat_def = module_def["features"].get(feat.code)
                if feat_def:
                    features_data.append({
                        "code": feat.code,
                        "name": feat_def["name"],
                        "enabled": feat.enabled
                    })
        else:
            # Enable all features by default
            for feat_code, feat_def in module_def["features"].items():
                features_data.append({
                    "code": feat_code,
                    "name": feat_def["name"],
                    "enabled": True
                })
        
        modules_data.append({
            "code": mod_config.code,
            "name": module_def["name"],
            "enabled": mod_config.enabled,
            "features": features_data
        })
    
    plan_doc = {
        "id": str(uuid.uuid4()),
        "name": plan.name,
        "code": plan.code,
        "description": plan.description,
        "price_monthly": plan.price_monthly,
        "price_annual": plan.price_annual,
        "annual_discount_percent": plan.annual_discount_percent,
        "max_users": plan.max_users,
        "trial_days": plan.trial_days,
        "commitment_months": plan.commitment_months,
        "modules": modules_data,
        "is_active": plan.is_active,
        "is_featured": plan.is_featured,
        "sort_order": plan.sort_order,
        "subscribers_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.sa_subscription_plans.insert_one(plan_doc)
    del plan_doc["_id"]
    
    await log_activity(db, "create_plan", "subscription_plan", plan_doc["id"], plan.name, user)
    
    return plan_doc

@catalog_router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: str,
    plan_update: SubscriptionPlanUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a subscription plan"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_subscription_plans.find_one({"id": plan_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    update_data = {k: v for k, v in plan_update.model_dump().items() if v is not None}
    
    # Handle modules update
    if "modules" in update_data and update_data["modules"]:
        modules_data = []
        for mod_config in update_data["modules"]:
            mod_dict = mod_config.model_dump() if hasattr(mod_config, 'model_dump') else mod_config
            module_def = DEFAULT_MODULES.get(mod_dict["code"])
            if not module_def:
                continue
            
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
        
        update_data["modules"] = modules_data
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sa_subscription_plans.update_one({"id": plan_id}, {"$set": update_data})
    
    await log_activity(db, "update_plan", "subscription_plan", plan_id, existing.get("name", ""), user, update_data)
    
    updated = await db.sa_subscription_plans.find_one({"id": plan_id}, {"_id": 0})
    updated["subscribers_count"] = await db.sa_subscriptions.count_documents({
        "plan_id": plan_id,
        "status": {"$in": ["active", "trial"]}
    })
    
    return updated

@catalog_router.delete("/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a subscription plan (soft delete - deactivate)"""
    user = verify_superadmin(credentials)
    
    plan = await db.sa_subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    # Check if any active subscriptions use this plan
    active_subs = await db.sa_subscriptions.count_documents({
        "plan_id": plan_id,
        "status": {"$in": ["active", "trial"]}
    })
    
    if active_subs > 0:
        # Soft delete - just deactivate
        await db.sa_subscription_plans.update_one(
            {"id": plan_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await log_activity(db, "deactivate_plan", "subscription_plan", plan_id, plan.get("name", ""), user)
        return {"message": f"Plan désactivé ({active_subs} abonnements actifs)", "deactivated": True}
    else:
        # Hard delete
        await db.sa_subscription_plans.delete_one({"id": plan_id})
        await log_activity(db, "delete_plan", "subscription_plan", plan_id, plan.get("name", ""), user)
        return {"message": "Plan supprimé", "deleted": True}

# ===================== SUBSCRIPTION LIFECYCLE =====================

@lifecycle_router.get("/list")
async def list_hotel_subscriptions(
    db,
    status: Optional[str] = None,
    plan_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all hotel subscriptions with details - supports both new and legacy data"""
    verify_superadmin(credentials)
    
    result = []
    
    # First, try to get from sa_subscriptions (new format)
    query = {}
    if status:
        query["status"] = status
    if plan_id:
        query["plan_id"] = plan_id
    
    subscriptions = await db.sa_subscriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    processed_hotel_ids = set()
    
    for sub in subscriptions:
        hotel = await db.sa_hotels.find_one({"id": sub.get("hotel_id")}, {"_id": 0, "name": 1})
        current_users = await db.sa_hotel_users.count_documents({"hotel_id": sub.get("hotel_id")})
        processed_hotel_ids.add(sub.get("hotel_id"))
        
        result.append({
            "id": sub.get("id"),
            "hotel_id": sub.get("hotel_id"),
            "hotel_name": hotel.get("name", "") if hotel else "",
            "plan_id": sub.get("plan_id", ""),
            "plan_name": sub.get("plan_name", sub.get("plan", "")),
            "plan_code": sub.get("plan", ""),
            "status": sub.get("status", "active"),
            "price_monthly": sub.get("price_monthly", 0),
            "price_effective": sub.get("price_effective", 0),
            "payment_frequency": sub.get("payment_frequency", "monthly"),
            "max_users": sub.get("max_users", 0),
            "current_users": current_users,
            "modules": sub.get("modules", []),
            "trial_end_date": sub.get("trial_end_date"),
            "paused_at": sub.get("paused_at"),
            "paused_reason": sub.get("paused_reason"),
            "start_date": sub.get("start_date", ""),
            "end_date": sub.get("end_date", ""),
            "next_billing_date": sub.get("next_billing_date"),
            "created_at": sub.get("created_at", "")
        })
    
    # Also get hotels with subscription_plan set (legacy format) that don't have sa_subscriptions entries
    hotels_query = {"subscription_plan": {"$exists": True, "$ne": None}}
    if status:
        hotels_query["subscription_status"] = status
    
    hotels = await db.sa_hotels.find(hotels_query, {"_id": 0}).to_list(500)
    
    for hotel in hotels:
        if hotel.get("id") in processed_hotel_ids:
            continue  # Already processed from sa_subscriptions
        
        # Apply plan filter if needed
        if plan_id:
            # Check if plan matches (by code since legacy doesn't have plan_id)
            plan = await db.sa_subscription_plans.find_one({"id": plan_id})
            if plan and plan.get("code") != hotel.get("subscription_plan"):
                continue
        
        current_users = await db.sa_hotel_users.count_documents({"hotel_id": hotel.get("id")})
        
        result.append({
            "id": hotel.get("id"),  # Use hotel_id as subscription id for legacy
            "hotel_id": hotel.get("id"),
            "hotel_name": hotel.get("name", ""),
            "plan_id": "",
            "plan_name": hotel.get("subscription_plan", "").upper(),
            "plan_code": hotel.get("subscription_plan", ""),
            "status": hotel.get("subscription_status", "active"),
            "price_monthly": 0,  # Not stored in legacy
            "price_effective": 0,
            "payment_frequency": "monthly",
            "max_users": hotel.get("max_users", 0),
            "current_users": current_users,
            "modules": [],
            "trial_end_date": None,
            "paused_at": None,
            "paused_reason": None,
            "start_date": hotel.get("created_at", ""),
            "end_date": hotel.get("subscription_end_date", ""),
            "next_billing_date": hotel.get("subscription_end_date"),
            "created_at": hotel.get("created_at", "")
        })
    
    return result

@lifecycle_router.get("/{subscription_id}/detail", response_model=HotelSubscriptionDetail)
async def get_subscription_detail(
    subscription_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed subscription info"""
    verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    hotel = await db.sa_hotels.find_one({"id": sub.get("hotel_id")}, {"_id": 0, "name": 1})
    current_users = await db.sa_hotel_users.count_documents({"hotel_id": sub.get("hotel_id")})
    
    return HotelSubscriptionDetail(
        id=sub.get("id"),
        hotel_id=sub.get("hotel_id"),
        hotel_name=hotel.get("name", "") if hotel else "",
        plan_id=sub.get("plan_id", ""),
        plan_name=sub.get("plan_name", ""),
        plan_code=sub.get("plan", ""),
        status=sub.get("status"),
        price_monthly=sub.get("price_monthly", 0),
        price_effective=sub.get("price_effective", 0),
        payment_frequency=sub.get("payment_frequency", "monthly"),
        max_users=sub.get("max_users", 0),
        current_users=current_users,
        modules=sub.get("modules", []),
        trial_end_date=sub.get("trial_end_date"),
        paused_at=sub.get("paused_at"),
        paused_reason=sub.get("paused_reason"),
        start_date=sub.get("start_date", ""),
        end_date=sub.get("end_date", ""),
        next_billing_date=sub.get("next_billing_date"),
        created_at=sub.get("created_at", "")
    )

@lifecycle_router.post("/{subscription_id}/pause")
async def pause_subscription(
    subscription_id: str,
    request: PauseSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Pause a subscription:
    - Suspends access to the application
    - Keeps all data
    - Suspends billing
    """
    user = verify_superadmin(credentials)
    
    # Try to find subscription in sa_subscriptions first
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    is_legacy = False
    hotel_id = None
    
    if not sub:
        # Check if subscription_id is actually a hotel_id (legacy format)
        hotel = await db.sa_hotels.find_one({"id": subscription_id, "subscription_plan": {"$exists": True}})
        if hotel:
            is_legacy = True
            hotel_id = subscription_id
            sub = {
                "id": subscription_id,
                "hotel_id": subscription_id,
                "status": hotel.get("subscription_status", "active"),
                "plan": hotel.get("subscription_plan")
            }
        else:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    else:
        hotel_id = sub.get("hotel_id")
    
    if sub.get("status") == "paused":
        raise HTTPException(status_code=400, detail="Abonnement déjà en pause")
    
    if sub.get("status") not in ["active", "trial"]:
        raise HTTPException(status_code=400, detail="Impossible de mettre en pause cet abonnement")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if is_legacy:
        # Update hotel directly for legacy format
        await db.sa_hotels.update_one(
            {"id": hotel_id},
            {"$set": {
                "subscription_status": "paused",
                "status": "suspended",
                "paused_at": now,
                "paused_reason": request.reason,
                "status_before_pause": sub.get("status")
            }}
        )
    else:
        # Update sa_subscriptions for new format
        await db.sa_subscriptions.update_one(
            {"id": subscription_id},
            {"$set": {
                "status": "paused",
                "paused_at": now,
                "paused_reason": request.reason,
                "status_before_pause": sub.get("status"),
                "billing_suspended": True
            }}
        )
        # Also suspend hotel access
        await db.sa_hotels.update_one(
            {"id": hotel_id},
            {"$set": {"status": "suspended"}}
        )
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    await log_activity(db, "pause_subscription", "subscription", subscription_id,
                      hotel.get("name", "") if hotel else "", user, {"reason": request.reason})
    
    return {
        "message": "Abonnement mis en pause",
        "subscription_id": subscription_id,
        "paused_at": now,
        "billing_suspended": True
    }

@lifecycle_router.post("/{subscription_id}/reactivate")
async def reactivate_subscription(
    subscription_id: str,
    request: ReactivateSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Reactivate a paused subscription:
    - Restores access
    - Resumes billing (optionally)
    """
    user = verify_superadmin(credentials)
    
    # Try to find subscription in sa_subscriptions first
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    is_legacy = False
    hotel_id = None
    
    if not sub:
        # Check if subscription_id is actually a hotel_id (legacy format)
        hotel = await db.sa_hotels.find_one({"id": subscription_id, "subscription_status": "paused"})
        if hotel:
            is_legacy = True
            hotel_id = subscription_id
            sub = {
                "id": subscription_id,
                "hotel_id": subscription_id,
                "status": "paused",
                "status_before_pause": hotel.get("status_before_pause", "active"),
                "paused_at": hotel.get("paused_at"),
                "end_date": hotel.get("subscription_end_date")
            }
        else:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    else:
        hotel_id = sub.get("hotel_id")
    
    if sub.get("status") != "paused":
        raise HTTPException(status_code=400, detail="Abonnement non en pause")
    
    now = datetime.now(timezone.utc)
    
    # Restore previous status or set to active
    new_status = sub.get("status_before_pause", "active")
    
    # Calculate new billing date if resuming billing
    new_billing_date = None
    if request.resume_billing and sub.get("paused_at") and sub.get("end_date"):
        try:
            pause_date = datetime.fromisoformat(sub.get("paused_at").replace('Z', '+00:00'))
            pause_duration = now - pause_date
            old_end = datetime.fromisoformat(sub.get("end_date").replace('Z', '+00:00'))
            new_end = old_end + pause_duration
            new_billing_date = new_end.isoformat()
        except (ValueError, TypeError, AttributeError):
            pass
    
    if is_legacy:
        # Update hotel directly for legacy format
        update_data = {
            "subscription_status": new_status,
            "status": "active",
            "paused_at": None,
            "paused_reason": None,
            "status_before_pause": None,
            "reactivated_at": now.isoformat()
        }
        if new_billing_date:
            update_data["subscription_end_date"] = new_billing_date
        
        await db.sa_hotels.update_one({"id": hotel_id}, {"$set": update_data})
    else:
        update_data = {
            "status": new_status,
            "paused_at": None,
            "paused_reason": None,
            "status_before_pause": None,
            "billing_suspended": False,
            "reactivated_at": now.isoformat()
        }
        
        if new_billing_date:
            update_data["end_date"] = new_billing_date
            update_data["next_billing_date"] = new_billing_date
        
        await db.sa_subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
        
        # Reactivate hotel
        await db.sa_hotels.update_one(
            {"id": hotel_id},
            {"$set": {"status": "active"}}
        )
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    await log_activity(db, "reactivate_subscription", "subscription", subscription_id,
                      hotel.get("name", "") if hotel else "", user, {"resume_billing": request.resume_billing})
    
    return {
        "message": "Abonnement réactivé",
        "subscription_id": subscription_id,
        "new_status": new_status,
        "billing_resumed": request.resume_billing
    }

@lifecycle_router.post("/{subscription_id}/upgrade/check")
async def check_upgrade_compatibility(
    subscription_id: str,
    request: UpgradeSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check upgrade compatibility and calculate prorated price"""
    verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    new_plan = await db.sa_subscription_plans.find_one({"id": request.new_plan_id})
    if not new_plan:
        raise HTTPException(status_code=404, detail="Nouveau plan non trouvé")
    
    current_price = sub.get("price_effective", 0)
    new_price = new_plan.get("price_monthly", 0)
    
    # Calculate prorate if applicable
    prorate_amount = 0
    if request.prorate and request.apply_immediately:
        now = datetime.now(timezone.utc)
        end_date = datetime.fromisoformat(sub.get("end_date", now.isoformat()).replace('Z', '+00:00'))
        days_remaining = (end_date - now).days
        if days_remaining > 0:
            daily_diff = (new_price - current_price) / 30
            prorate_amount = daily_diff * days_remaining
    
    # List new modules/features
    current_modules = {m.get("code") if isinstance(m, dict) else m for m in sub.get("modules", [])}
    new_modules = {m.get("code") for m in new_plan.get("modules", [])}
    added_modules = new_modules - current_modules
    
    return {
        "is_upgrade": new_price > current_price,
        "current_price": current_price,
        "new_price": new_price,
        "price_difference": new_price - current_price,
        "prorate_amount": round(prorate_amount, 2),
        "added_modules": list(added_modules),
        "current_max_users": sub.get("max_users", 0),
        "new_max_users": new_plan.get("max_users", 0)
    }

@lifecycle_router.post("/{subscription_id}/upgrade")
async def upgrade_subscription(
    subscription_id: str,
    request: UpgradeSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upgrade subscription:
    - Add modules/features
    - Increase users
    - Apply immediately or at next billing
    """
    user = verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    new_plan = await db.sa_subscription_plans.find_one({"id": request.new_plan_id})
    if not new_plan:
        raise HTTPException(status_code=404, detail="Nouveau plan non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "plan_id": new_plan["id"],
        "plan": new_plan["code"],
        "plan_name": new_plan["name"],
        "modules": new_plan["modules"],
        "max_users": request.new_max_users if request.new_max_users else new_plan["max_users"],
        "upgraded_at": now,
        "upgrade_applied": request.apply_immediately
    }
    
    if request.apply_immediately:
        update_data["price_monthly"] = new_plan["price_monthly"]
        update_data["price_effective"] = new_plan["price_monthly"]
    else:
        # Schedule upgrade for next billing
        update_data["pending_upgrade"] = {
            "plan_id": new_plan["id"],
            "price_monthly": new_plan["price_monthly"],
            "scheduled_at": sub.get("next_billing_date")
        }
    
    await db.sa_subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
    
    hotel = await db.sa_hotels.find_one({"id": sub.get("hotel_id")})
    await log_activity(db, "upgrade_subscription", "subscription", subscription_id,
                      hotel.get("name", "") if hotel else "", user, {
                          "from_plan": sub.get("plan"),
                          "to_plan": new_plan["code"],
                          "apply_immediately": request.apply_immediately
                      })
    
    return {
        "message": "Abonnement upgradé" if request.apply_immediately else "Upgrade programmé",
        "subscription_id": subscription_id,
        "new_plan": new_plan["name"],
        "applied_immediately": request.apply_immediately
    }

@lifecycle_router.post("/{subscription_id}/downgrade/check", response_model=DowngradeCompatibilityCheck)
async def check_downgrade_compatibility(
    subscription_id: str,
    request: DowngradeSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check if downgrade is compatible with current usage"""
    verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    new_plan = await db.sa_subscription_plans.find_one({"id": request.new_plan_id})
    if not new_plan:
        raise HTTPException(status_code=404, detail="Nouveau plan non trouvé")
    
    # Check user count
    current_users = await db.sa_hotel_users.count_documents({"hotel_id": sub.get("hotel_id")})
    new_max_users = new_plan.get("max_users", 0)
    excess_users = max(0, current_users - new_max_users) if new_max_users != -1 else 0
    
    # Get excess user emails if any
    excess_user_emails = []
    if excess_users > 0:
        users = await db.sa_hotel_users.find(
            {"hotel_id": sub.get("hotel_id")},
            {"email": 1}
        ).sort("created_at", -1).limit(excess_users).to_list(excess_users)
        excess_user_emails = [u["email"] for u in users]
    
    # Check removed modules
    current_modules = {m.get("code") if isinstance(m, dict) else m for m in sub.get("modules", [])}
    new_modules = {m.get("code") for m in new_plan.get("modules", [])}
    removed_modules = list(current_modules - new_modules)
    
    # Determine compatibility
    is_compatible = True
    message = "Downgrade possible"
    
    if excess_users > 0:
        if request.action_on_excess_users == DowngradeAction.BLOCK:
            is_compatible = False
            message = f"Impossible: {excess_users} utilisateur(s) en excès. Réduisez le nombre d'utilisateurs avant le downgrade."
        else:
            message = f"{excess_users} utilisateur(s) seront désactivés automatiquement."
    
    return DowngradeCompatibilityCheck(
        is_compatible=is_compatible,
        current_users=current_users,
        new_max_users=new_max_users,
        excess_users=excess_users,
        excess_user_emails=excess_user_emails,
        removed_modules=removed_modules,
        removed_features={},
        message=message
    )

@lifecycle_router.post("/{subscription_id}/downgrade")
async def downgrade_subscription(
    subscription_id: str,
    request: DowngradeSubscriptionRequest,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Downgrade subscription:
    - Reduce modules/features
    - Reduce users (with compatibility check)
    - Apply at next billing by default
    """
    user = verify_superadmin(credentials)
    
    # First check compatibility
    check = await check_downgrade_compatibility(subscription_id, request, db, credentials)
    
    if not check.is_compatible:
        raise HTTPException(status_code=400, detail=check.message)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    new_plan = await db.sa_subscription_plans.find_one({"id": request.new_plan_id})
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Disable excess users if needed
    if check.excess_users > 0 and request.action_on_excess_users == DowngradeAction.DISABLE_EXCESS:
        users_to_disable = await db.sa_hotel_users.find(
            {"hotel_id": sub.get("hotel_id"), "status": "active"},
            {"id": 1}
        ).sort("created_at", -1).limit(check.excess_users).to_list(check.excess_users)
        
        for u in users_to_disable:
            await db.sa_hotel_users.update_one(
                {"id": u["id"]},
                {"$set": {"status": "disabled", "disabled_at": now, "disabled_reason": "downgrade"}}
            )
    
    update_data = {
        "downgraded_at": now,
        "downgrade_applied": request.apply_immediately
    }
    
    if request.apply_immediately:
        update_data.update({
            "plan_id": new_plan["id"],
            "plan": new_plan["code"],
            "plan_name": new_plan["name"],
            "modules": new_plan["modules"],
            "max_users": new_plan["max_users"],
            "price_monthly": new_plan["price_monthly"],
            "price_effective": new_plan["price_monthly"]
        })
    else:
        # Schedule downgrade for next billing
        update_data["pending_downgrade"] = {
            "plan_id": new_plan["id"],
            "plan_code": new_plan["code"],
            "price_monthly": new_plan["price_monthly"],
            "scheduled_at": sub.get("next_billing_date")
        }
    
    await db.sa_subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
    
    hotel = await db.sa_hotels.find_one({"id": sub.get("hotel_id")})
    await log_activity(db, "downgrade_subscription", "subscription", subscription_id,
                      hotel.get("name", "") if hotel else "", user, {
                          "from_plan": sub.get("plan"),
                          "to_plan": new_plan["code"],
                          "apply_immediately": request.apply_immediately,
                          "users_disabled": check.excess_users if request.action_on_excess_users == DowngradeAction.DISABLE_EXCESS else 0
                      })
    
    return {
        "message": "Abonnement downgradé" if request.apply_immediately else "Downgrade programmé",
        "subscription_id": subscription_id,
        "new_plan": new_plan["name"],
        "applied_immediately": request.apply_immediately,
        "users_disabled": check.excess_users if request.action_on_excess_users == DowngradeAction.DISABLE_EXCESS else 0
    }

# ===================== CREATE SUBSCRIPTION WITH CATALOG PLAN =====================

@lifecycle_router.post("/create")
async def create_subscription_from_catalog(
    hotel_id: str,
    plan_id: str,
    payment_frequency: str,
    trial_days: Optional[int] = None,
    custom_max_users: Optional[int] = None,
    custom_price: Optional[float] = None,
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new subscription using a catalog plan"""
    user = verify_superadmin(credentials)
    
    # Verify hotel
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Check existing subscription
    existing = await db.sa_subscriptions.find_one({
        "hotel_id": hotel_id,
        "status": {"$in": ["active", "trial", "paused"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cet hôtel a déjà un abonnement actif")
    
    # Get plan
    plan = await db.sa_subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    if not plan.get("is_active"):
        raise HTTPException(status_code=400, detail="Ce plan n'est plus disponible")
    
    now = datetime.now(timezone.utc)
    
    # Calculate trial
    actual_trial_days = trial_days if trial_days is not None else plan.get("trial_days", 0)
    trial_end = None
    initial_status = "active"
    
    if actual_trial_days > 0:
        trial_end = (now + timedelta(days=actual_trial_days)).isoformat()
        initial_status = "trial"
    
    # Calculate pricing
    if payment_frequency == "annual":
        base_price = plan.get("price_annual", plan["price_monthly"] * 12)
        discount = plan.get("annual_discount_percent", 0)
        price_effective = base_price * (1 - discount / 100) / 12
        end_date = now + timedelta(days=365)
    else:
        price_effective = plan.get("price_monthly")
        end_date = now + timedelta(days=30)
    
    if custom_price is not None:
        price_effective = custom_price
    
    sub_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "plan_id": plan["id"],
        "plan": plan["code"],
        "plan_name": plan["name"],
        "status": initial_status,
        "payment_frequency": payment_frequency,
        "trial_days": actual_trial_days,
        "trial_end_date": trial_end,
        "price_monthly": plan["price_monthly"],
        "price_effective": round(price_effective, 2),
        "modules": plan["modules"],
        "max_users": custom_max_users if custom_max_users else plan["max_users"],
        "start_date": now.isoformat(),
        "end_date": end_date.isoformat(),
        "next_billing_date": end_date.isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.sa_subscriptions.insert_one(sub_doc)
    del sub_doc["_id"]
    
    await log_activity(db, "create_subscription", "subscription", sub_doc["id"],
                      f"{hotel.get('name')} - {plan['name']}", user)
    
    return sub_doc
