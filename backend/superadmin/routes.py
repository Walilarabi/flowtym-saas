"""
Super Admin API Routes
Multi-tenant hotel management, subscriptions, billing, support
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import os

from .models import (
    HotelCreate, HotelUpdate, HotelResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    UserInvite, SEPAMandateCreate, SEPAMandateResponse,
    ContractData, InvoiceResponse, DashboardStats, ActivityLog,
    SUBSCRIPTION_PLANS, SubscriptionStatus, SubscriptionPlan, 
    PaymentFrequency, TrialType, HotelUserRole
)
from .pdf_generator import pdf_generator

# Router setup
superadmin_router = APIRouter(prefix="/superadmin", tags=["Super Admin"])
security = HTTPBearer()

# JWT config (imported from main app)
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

def verify_superadmin(credentials: HTTPAuthorizationCredentials):
    """Verify user is a super_admin"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check if user has super_admin role
        if payload.get('role') != 'super_admin':
            raise HTTPException(status_code=403, detail="Accès réservé aux Super Admins")
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def log_activity(db, action: str, entity_type: str, entity_id: str, entity_name: str, actor: Dict, details: Dict = None):
    """Log administrative activity"""
    log_doc = {
        "id": str(uuid.uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "actor_email": actor.get('email', ''),
        "actor_name": f"{actor.get('first_name', '')} {actor.get('last_name', '')}",
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.superadmin_logs.insert_one(log_doc)

# ===================== DASHBOARD =====================

@superadmin_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get Super Admin dashboard KPIs"""
    user = verify_superadmin(credentials)
    
    # Count hotels
    total_hotels = await db.sa_hotels.count_documents({})
    active_hotels = await db.sa_hotels.count_documents({"status": "active"})
    suspended_hotels = await db.sa_hotels.count_documents({"status": "suspended"})
    
    # Expiring soon (< 30 days)
    thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    expiring_soon = await db.sa_subscriptions.count_documents({
        "status": "active",
        "end_date": {"$lt": thirty_days}
    })
    
    # Users and rooms
    total_users = await db.sa_hotel_users.count_documents({})
    
    # Calculate MRR
    mrr = 0.0
    async for sub in db.sa_subscriptions.find({"status": {"$in": ["active", "trial"]}}):
        if sub.get('payment_frequency') == 'annual':
            mrr += sub.get('price_effective', 0) / 12
        else:
            mrr += sub.get('price_effective', 0)
    
    arr = mrr * 12
    
    # Plan distribution
    plan_distribution = {}
    for plan in ["basic", "pro", "premium", "enterprise"]:
        count = await db.sa_subscriptions.count_documents({"plan": plan, "status": {"$in": ["active", "trial"]}})
        plan_distribution[plan] = count
    
    # Growth data (last 6 months)
    growth_data = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30*i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        count = await db.sa_hotels.count_documents({
            "created_at": {"$lt": month_end.isoformat()}
        })
        
        growth_data.append({
            "month": month_start.strftime("%b"),
            "hotels": count
        })
    
    # Recent activity
    recent_logs = await db.superadmin_logs.find({}).sort("created_at", -1).limit(10).to_list(10)
    recent_activity = [{k: v for k, v in log.items() if k != '_id'} for log in recent_logs]
    
    return DashboardStats(
        total_hotels=total_hotels,
        active_hotels=active_hotels,
        suspended_hotels=suspended_hotels,
        expiring_soon=expiring_soon,
        total_users=total_users,
        total_rooms=0,  # Could aggregate from hotels
        mrr=round(mrr, 2),
        arr=round(arr, 2),
        churn_rate=0.0,  # Calculate from cancelled subscriptions
        plan_distribution=plan_distribution,
        growth_data=growth_data,
        recent_activity=recent_activity
    )

# ===================== HOTELS =====================

@superadmin_router.get("/hotels", response_model=List[HotelResponse])
async def list_hotels(
    db,
    status: Optional[str] = None,
    search: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all hotels"""
    verify_superadmin(credentials)
    
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"legal_name": {"$regex": search, "$options": "i"}},
            {"contact_email": {"$regex": search, "$options": "i"}}
        ]
    
    hotels = await db.sa_hotels.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with subscription data
    for hotel in hotels:
        sub = await db.sa_subscriptions.find_one(
            {"hotel_id": hotel["id"], "status": {"$in": ["active", "trial"]}},
            {"_id": 0}
        )
        if sub:
            hotel["subscription_plan"] = sub.get("plan")
            hotel["subscription_status"] = sub.get("status")
            hotel["subscription_end_date"] = sub.get("end_date")
            hotel["max_users"] = sub.get("max_users", 0)
        
        # Count users
        hotel["users_count"] = await db.sa_hotel_users.count_documents({"hotel_id": hotel["id"]})
    
    return hotels

@superadmin_router.post("/hotels", response_model=HotelResponse)
async def create_hotel(
    hotel: HotelCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new hotel (client)"""
    user = verify_superadmin(credentials)
    
    # Check if SIRET already exists
    existing = await db.sa_hotels.find_one({"siret": hotel.siret})
    if existing:
        raise HTTPException(status_code=400, detail="Un hôtel avec ce SIRET existe déjà")
    
    hotel_doc = {
        "id": str(uuid.uuid4()),
        **hotel.model_dump(),
        "status": "active",
        "health_score": 100,
        "rooms_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotels.insert_one(hotel_doc)
    del hotel_doc["_id"]
    
    # Log activity
    await log_activity(db, "create", "hotel", hotel_doc["id"], hotel.name, user)
    
    # Add computed fields for response
    hotel_doc["users_count"] = 0
    hotel_doc["max_users"] = 0
    hotel_doc["subscription_plan"] = None
    hotel_doc["subscription_status"] = None
    hotel_doc["subscription_end_date"] = None
    
    return hotel_doc

@superadmin_router.get("/hotels/{hotel_id}", response_model=HotelResponse)
async def get_hotel(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get hotel details"""
    verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Enrich with subscription
    sub = await db.sa_subscriptions.find_one(
        {"hotel_id": hotel_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    if sub:
        hotel["subscription_plan"] = sub.get("plan")
        hotel["subscription_status"] = sub.get("status")
        hotel["subscription_end_date"] = sub.get("end_date")
        hotel["max_users"] = sub.get("max_users", 0)
    
    hotel["users_count"] = await db.sa_hotel_users.count_documents({"hotel_id": hotel_id})
    
    return hotel

@superadmin_router.put("/hotels/{hotel_id}", response_model=HotelResponse)
async def update_hotel(
    hotel_id: str,
    hotel: HotelUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update hotel information"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_hotels.find_one({"id": hotel_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    update_data = {k: v for k, v in hotel.model_dump().items() if v is not None}
    
    if update_data:
        await db.sa_hotels.update_one({"id": hotel_id}, {"$set": update_data})
        await log_activity(db, "update", "hotel", hotel_id, existing.get("name", ""), user, update_data)
    
    return await get_hotel(hotel_id, db, credentials)

@superadmin_router.patch("/hotels/{hotel_id}/status")
async def update_hotel_status(
    hotel_id: str,
    status: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Suspend/Activate hotel"""
    user = verify_superadmin(credentials)
    
    if status not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Status invalide")
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    await db.sa_hotels.update_one({"id": hotel_id}, {"$set": {"status": status}})
    await log_activity(db, f"status_{status}", "hotel", hotel_id, hotel.get("name", ""), user)
    
    return {"message": f"Hôtel {status}", "hotel_id": hotel_id}

@superadmin_router.delete("/hotels/{hotel_id}")
async def delete_hotel(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete hotel (soft delete - marks as deleted)"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Soft delete
    await db.sa_hotels.update_one({"id": hotel_id}, {"$set": {"status": "deleted"}})
    await log_activity(db, "delete", "hotel", hotel_id, hotel.get("name", ""), user)
    
    return {"message": "Hôtel supprimé", "hotel_id": hotel_id}

# ===================== SUBSCRIPTIONS =====================

@superadmin_router.get("/plans")
async def get_subscription_plans(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get available subscription plans"""
    verify_superadmin(credentials)
    return SUBSCRIPTION_PLANS

@superadmin_router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    sub: SubscriptionCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create subscription for a hotel"""
    user = verify_superadmin(credentials)
    
    # Verify hotel exists
    hotel = await db.sa_hotels.find_one({"id": sub.hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Check for existing active subscription
    existing = await db.sa_subscriptions.find_one({
        "hotel_id": sub.hotel_id,
        "status": {"$in": ["active", "trial"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cet hôtel a déjà un abonnement actif")
    
    # Get plan details
    plan_details = SUBSCRIPTION_PLANS.get(sub.plan.value, SUBSCRIPTION_PLANS["basic"])
    
    # Calculate dates
    now = datetime.now(timezone.utc)
    start_date = now
    
    # Trial handling
    trial_end_date = None
    initial_status = SubscriptionStatus.ACTIVE.value
    
    if sub.trial_type == TrialType.FREE_15_DAYS:
        trial_end_date = (now + timedelta(days=15)).isoformat()
        initial_status = SubscriptionStatus.TRIAL.value
    elif sub.trial_type == TrialType.HALF_PRICE_FIRST_MONTH:
        initial_status = SubscriptionStatus.TRIAL.value
    
    # Calculate end date and pricing
    if sub.payment_frequency == PaymentFrequency.ANNUAL:
        end_date = now + timedelta(days=365)
        price_effective = sub.custom_price_monthly or (plan_details["price_annual"] / 12)
    else:
        end_date = now + timedelta(days=30)
        price_effective = sub.custom_price_monthly or plan_details["price_monthly"]
    
    # Apply trial discount
    if sub.trial_type == TrialType.HALF_PRICE_FIRST_MONTH:
        price_effective = price_effective * 0.5
    
    sub_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": sub.hotel_id,
        "plan": sub.plan.value,
        "plan_name": plan_details["name"],
        "status": initial_status,
        "payment_frequency": sub.payment_frequency.value,
        "trial_type": sub.trial_type.value,
        "trial_end_date": trial_end_date,
        "price_monthly": sub.custom_price_monthly or plan_details["price_monthly"],
        "price_effective": round(price_effective, 2),
        "modules": sub.custom_modules or plan_details["modules"],
        "features": sub.custom_features or plan_details["features"],
        "max_users": sub.custom_max_users if sub.custom_max_users is not None else plan_details["max_users"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "next_billing_date": end_date.isoformat(),
        "notes": sub.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_subscriptions.insert_one(sub_doc)
    del sub_doc["_id"]
    
    await log_activity(db, "create_subscription", "subscription", sub_doc["id"], 
                      f"{hotel.get('name')} - {plan_details['name']}", user)
    
    return sub_doc

@superadmin_router.get("/subscriptions/{hotel_id}", response_model=SubscriptionResponse)
async def get_subscription(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get active subscription for hotel"""
    verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one(
        {"hotel_id": hotel_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement actif")
    
    return sub

@superadmin_router.put("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    sub_update: SubscriptionUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update subscription (plan change, features, etc.)"""
    user = verify_superadmin(credentials)
    
    existing = await db.sa_subscriptions.find_one({"id": subscription_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    update_data = {k: v for k, v in sub_update.model_dump().items() if v is not None}
    
    # If plan changed, update plan-related fields
    if "plan" in update_data:
        new_plan = SUBSCRIPTION_PLANS.get(update_data["plan"], SUBSCRIPTION_PLANS["basic"])
        update_data["plan_name"] = new_plan["name"]
        if "custom_modules" not in update_data:
            update_data["modules"] = new_plan["modules"]
        if "custom_features" not in update_data:
            update_data["features"] = new_plan["features"]
        if "custom_max_users" not in update_data:
            update_data["max_users"] = new_plan["max_users"]
    
    if update_data:
        await db.sa_subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
        
        hotel = await db.sa_hotels.find_one({"id": existing.get("hotel_id")})
        await log_activity(db, "update_subscription", "subscription", subscription_id,
                          hotel.get("name", "") if hotel else "", user, update_data)
    
    updated = await db.sa_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    return updated

@superadmin_router.patch("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cancel subscription"""
    user = verify_superadmin(credentials)
    
    sub = await db.sa_subscriptions.find_one({"id": subscription_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    await db.sa_subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {"status": SubscriptionStatus.CANCELLED.value}}
    )
    
    hotel = await db.sa_hotels.find_one({"id": sub.get("hotel_id")})
    await log_activity(db, "cancel_subscription", "subscription", subscription_id,
                      hotel.get("name", "") if hotel else "", user)
    
    return {"message": "Abonnement annulé", "subscription_id": subscription_id}

# ===================== USERS =====================

@superadmin_router.get("/hotels/{hotel_id}/users")
async def list_hotel_users(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List users for a hotel"""
    verify_superadmin(credentials)
    
    users = await db.sa_hotel_users.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(100)
    return users

@superadmin_router.post("/hotels/{hotel_id}/users/invite")
async def invite_user(
    hotel_id: str,
    invite: UserInvite,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Invite a user to a hotel"""
    user = verify_superadmin(credentials)
    
    # Verify hotel
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Check user limit
    sub = await db.sa_subscriptions.find_one({"hotel_id": hotel_id, "status": {"$in": ["active", "trial"]}})
    if sub:
        current_users = await db.sa_hotel_users.count_documents({"hotel_id": hotel_id})
        max_users = sub.get("max_users", 5)
        if max_users != -1 and current_users >= max_users:
            raise HTTPException(status_code=400, detail=f"Limite d'utilisateurs atteinte ({max_users})")
    
    # Check if user already exists for this hotel
    existing = await db.sa_hotel_users.find_one({"hotel_id": hotel_id, "email": invite.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet utilisateur est déjà associé à cet hôtel")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "email": invite.email,
        "first_name": invite.first_name,
        "last_name": invite.last_name,
        "role": invite.role.value,
        "status": "invited",  # invited, active, suspended
        "invite_token": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_hotel_users.insert_one(user_doc)
    del user_doc["_id"]
    
    await log_activity(db, "invite_user", "user", user_doc["id"],
                      f"{invite.first_name} {invite.last_name}", user, {"hotel": hotel.get("name")})
    
    # TODO: Send invitation email
    
    return {"message": "Invitation envoyée", "user": user_doc}

@superadmin_router.delete("/users/{user_id}")
async def remove_user(
    user_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Remove user from hotel"""
    user = verify_superadmin(credentials)
    
    hotel_user = await db.sa_hotel_users.find_one({"id": user_id})
    if not hotel_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await db.sa_hotel_users.delete_one({"id": user_id})
    
    await log_activity(db, "remove_user", "user", user_id,
                      f"{hotel_user.get('first_name', '')} {hotel_user.get('last_name', '')}", user)
    
    return {"message": "Utilisateur supprimé"}

# ===================== SEPA MANDATES =====================

@superadmin_router.post("/sepa-mandates", response_model=SEPAMandateResponse)
async def create_sepa_mandate(
    mandate: SEPAMandateCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create SEPA mandate for hotel"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": mandate.hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Generate RUM (Référence Unique de Mandat)
    rum = f"RUM-{datetime.now().strftime('%Y%m%d')}-{mandate.hotel_id[:8].upper()}"
    
    # Mask IBAN for storage
    iban = mandate.iban.replace(" ", "")
    iban_masked = iban[:4] + "****" + iban[-4:]
    
    mandate_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": mandate.hotel_id,
        "reference": rum,
        "iban": iban,  # Store full IBAN (encrypted in production)
        "iban_masked": iban_masked,
        "bic": mandate.bic,
        "account_holder": mandate.account_holder,
        "payment_type": mandate.payment_type,
        "status": "pending_signature",
        "signed_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_sepa_mandates.insert_one(mandate_doc)
    del mandate_doc["_id"]
    del mandate_doc["iban"]  # Don't return full IBAN
    
    await log_activity(db, "create_sepa_mandate", "sepa_mandate", mandate_doc["id"],
                      hotel.get("name", ""), user)
    
    return mandate_doc

@superadmin_router.get("/sepa-mandates/{hotel_id}", response_model=List[SEPAMandateResponse])
async def get_sepa_mandates(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get SEPA mandates for hotel"""
    verify_superadmin(credentials)
    
    mandates = await db.sa_sepa_mandates.find(
        {"hotel_id": hotel_id},
        {"_id": 0, "iban": 0}  # Exclude full IBAN
    ).to_list(10)
    
    return mandates

@superadmin_router.patch("/sepa-mandates/{mandate_id}/sign")
async def sign_sepa_mandate(
    mandate_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark SEPA mandate as signed"""
    user = verify_superadmin(credentials)
    
    mandate = await db.sa_sepa_mandates.find_one({"id": mandate_id})
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandat non trouvé")
    
    await db.sa_sepa_mandates.update_one(
        {"id": mandate_id},
        {"$set": {
            "status": "active",
            "signed_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    hotel = await db.sa_hotels.find_one({"id": mandate.get("hotel_id")})
    await log_activity(db, "sign_sepa_mandate", "sepa_mandate", mandate_id,
                      hotel.get("name", "") if hotel else "", user)
    
    return {"message": "Mandat signé", "mandate_id": mandate_id}

# ===================== PDF GENERATION =====================

@superadmin_router.get("/hotels/{hotel_id}/contract/pdf")
async def generate_contract_pdf(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate SaaS contract PDF for hotel"""
    verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    sub = await db.sa_subscriptions.find_one(
        {"hotel_id": hotel_id, "status": {"$in": ["active", "trial"]}},
        {"_id": 0}
    )
    
    if not sub:
        # Use default plan for preview
        sub = {
            "plan": "pro",
            "plan_name": "Pro",
            "payment_frequency": "monthly",
            "price_monthly": SUBSCRIPTION_PLANS["pro"]["price_monthly"],
            "price_annual": SUBSCRIPTION_PLANS["pro"]["price_annual"],
            "modules": SUBSCRIPTION_PLANS["pro"]["modules"],
            "features": SUBSCRIPTION_PLANS["pro"]["features"],
            "max_users": SUBSCRIPTION_PLANS["pro"]["max_users"],
            "trial_type": "free_15_days"
        }
    
    pdf_bytes = pdf_generator.generate_contract_pdf(hotel, sub)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=contrat-flowtym-{hotel.get('name', 'hotel').replace(' ', '-')}.pdf"
        }
    )

@superadmin_router.get("/hotels/{hotel_id}/sepa-mandate/pdf")
async def generate_sepa_mandate_pdf(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate SEPA mandate PDF for hotel"""
    verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Get latest mandate or create placeholder
    mandate = await db.sa_sepa_mandates.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    if not mandate:
        mandate = {
            "reference": f"RUM-{datetime.now().strftime('%Y%m%d')}-{hotel_id[:8].upper()}",
            "iban": "FR76 XXXX XXXX XXXX XXXX XXXX XXX",
            "bic": "XXXXXXXX",
            "account_holder": hotel.get("contact_name", ""),
            "payment_type": "RCUR"
        }
    
    pdf_bytes = pdf_generator.generate_sepa_mandate_pdf(hotel, mandate)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=mandat-sepa-{hotel.get('name', 'hotel').replace(' ', '-')}.pdf"
        }
    )

# ===================== INVOICES =====================

@superadmin_router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    db,
    hotel_id: Optional[str] = None,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List invoices"""
    verify_superadmin(credentials)
    
    query = {}
    if hotel_id:
        query["hotel_id"] = hotel_id
    if status:
        query["status"] = status
    
    invoices = await db.sa_invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return invoices

@superadmin_router.post("/invoices/generate")
async def generate_invoice(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate invoice for hotel"""
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    sub = await db.sa_subscriptions.find_one({"hotel_id": hotel_id, "status": {"$in": ["active", "trial"]}}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=400, detail="Aucun abonnement actif")
    
    # Generate invoice number
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = await db.sa_invoices.count_documents({"created_at": {"$gte": month_start.isoformat()}})
    invoice_number = f"FACT-{now.strftime('%Y%m')}-{str(count + 1).zfill(3)}"
    
    amount_ht = sub.get("price_effective", sub.get("price_monthly", 0))
    tva = amount_ht * 0.20
    amount_ttc = amount_ht + tva
    
    invoice_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "hotel_name": hotel.get("name", ""),
        "subscription_id": sub.get("id"),
        "number": invoice_number,
        "amount_ht": round(amount_ht, 2),
        "tva": round(tva, 2),
        "amount_ttc": round(amount_ttc, 2),
        "status": "draft",
        "due_date": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
        "paid_date": None,
        "period_start": now.strftime("%Y-%m-%d"),
        "period_end": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
        "plan_name": sub.get("plan_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sa_invoices.insert_one(invoice_doc)
    del invoice_doc["_id"]
    
    await log_activity(db, "generate_invoice", "invoice", invoice_doc["id"],
                      f"{invoice_number} - {hotel.get('name', '')}", user)
    
    return invoice_doc

@superadmin_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate invoice PDF"""
    verify_superadmin(credentials)
    
    invoice = await db.sa_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    hotel = await db.sa_hotels.find_one({"id": invoice.get("hotel_id")}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    pdf_bytes = pdf_generator.generate_invoice_pdf(hotel, invoice)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={invoice.get('number', 'facture')}.pdf"
        }
    )

# ===================== ACTIVITY LOGS =====================

@superadmin_router.get("/logs", response_model=List[ActivityLog])
async def get_activity_logs(
    db,
    entity_type: Optional[str] = None,
    limit: int = Query(default=50, le=500),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get activity logs"""
    verify_superadmin(credentials)
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.superadmin_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

# ===================== SUPPORT MODE =====================

@superadmin_router.post("/support/simulate-user")
async def simulate_user_view(
    hotel_id: str,
    role: HotelUserRole,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Generate support session token to simulate user view
    This allows Super Admin to see the interface as a specific role
    """
    user = verify_superadmin(credentials)
    
    hotel = await db.sa_hotels.find_one({"id": hotel_id})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Create support session token
    support_token = jwt.encode({
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "role": role.value,
        "hotel_id": hotel_id,
        "hotel_name": hotel.get("name"),
        "support_mode": True,
        "original_role": "super_admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    await log_activity(db, "support_simulate", "support", hotel_id,
                      f"{hotel.get('name')} - Vue {role.value}", user)
    
    return {
        "support_token": support_token,
        "hotel_id": hotel_id,
        "hotel_name": hotel.get("name"),
        "simulated_role": role.value,
        "expires_in": "2 hours"
    }

@superadmin_router.post("/support/end-session")
async def end_support_session(
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """End support simulation session"""
    user = verify_superadmin(credentials)
    
    await log_activity(db, "support_end", "support", "", "", user)
    
    return {"message": "Session support terminée"}

# ===================== ELECTRONIC SIGNATURE =====================

from pydantic import BaseModel

class SignatureRequestCreate(BaseModel):
    hotel_id: str
    document_type: str  # contract, sepa_mandate
    signer_email: str
    signer_name: str
    test_mode: bool = True

@superadmin_router.post("/signature/send")
async def send_for_signature(
    request: SignatureRequestCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send document for electronic signature via Dropbox Sign"""
    user = verify_superadmin(credentials)
    
    from .signature_service import dropbox_sign_service
    
    if not dropbox_sign_service.is_available():
        raise HTTPException(status_code=503, detail="Service de signature électronique non configuré")
    
    # Get hotel data
    hotel = await db.sa_hotels.find_one({"id": request.hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # Generate PDF
    if request.document_type == "contract":
        sub = await db.sa_subscriptions.find_one(
            {"hotel_id": request.hotel_id, "status": {"$in": ["active", "trial"]}},
            {"_id": 0}
        )
        if not sub:
            sub = {"plan": "pro", "plan_name": "Pro", "payment_frequency": "monthly",
                   "price_monthly": 199, "modules": ["pms", "staff", "crm"],
                   "features": {}, "max_users": 15, "trial_type": "free_15_days"}
        
        pdf_bytes = pdf_generator.generate_contract_pdf(hotel, sub)
        subject = f"Contrat d'abonnement Flowtym - {hotel.get('name')}"
        message = f"Bonjour {request.signer_name},\n\nVeuillez signer le contrat d'abonnement Flowtym ci-joint.\n\nCordialement,\nL'équipe Flowtym"
    
    elif request.document_type == "sepa_mandate":
        mandate = await db.sa_sepa_mandates.find_one({"hotel_id": request.hotel_id}, {"_id": 0})
        if not mandate:
            mandate = {"reference": f"RUM-{datetime.now().strftime('%Y%m%d')}-{request.hotel_id[:8].upper()}",
                      "iban": "FR76 XXXX XXXX XXXX XXXX XXXX XXX", "bic": "XXXXXXXX",
                      "account_holder": hotel.get("contact_name", ""), "payment_type": "RCUR"}
        
        pdf_bytes = pdf_generator.generate_sepa_mandate_pdf(hotel, mandate)
        subject = f"Mandat SEPA Flowtym - {hotel.get('name')}"
        message = f"Bonjour {request.signer_name},\n\nVeuillez signer le mandat de prélèvement SEPA ci-joint.\n\nCordialement,\nL'équipe Flowtym"
    
    else:
        raise HTTPException(status_code=400, detail="Type de document invalide")
    
    try:
        # Send for signature
        response = dropbox_sign_service.send_signature_request(
            pdf_bytes=pdf_bytes,
            filename=f"{request.document_type}_{hotel.get('name').replace(' ', '_')}.pdf",
            signer_email=request.signer_email,
            signer_name=request.signer_name,
            subject=subject,
            message=message,
            test_mode=request.test_mode
        )
        
        sig_request = response.get('signature_request', {})
        
        # Store signature request in database
        sig_doc = {
            "id": str(uuid.uuid4()),
            "hotel_id": request.hotel_id,
            "document_type": request.document_type,
            "signature_request_id": sig_request.get('signature_request_id'),
            "signer_email": request.signer_email,
            "signer_name": request.signer_name,
            "status": "sent",
            "test_mode": request.test_mode,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "signed_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.sa_signature_requests.insert_one(sig_doc)
        
        await log_activity(db, "send_for_signature", "signature", sig_doc["id"],
                          f"{request.document_type} - {hotel.get('name')}", user)
        
        return {
            "message": "Document envoyé pour signature",
            "signature_request_id": sig_request.get('signature_request_id'),
            "status": "sent"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi: {str(e)}")

@superadmin_router.get("/signature/status/{signature_request_id}")
async def get_signature_status(
    signature_request_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get status of a signature request"""
    verify_superadmin(credentials)
    
    from .signature_service import dropbox_sign_service
    
    if not dropbox_sign_service.is_available():
        raise HTTPException(status_code=503, detail="Service de signature électronique non configuré")
    
    try:
        response = dropbox_sign_service.get_signature_request_status(signature_request_id)
        sig_request = response.get('signature_request', {})
        
        return {
            "signature_request_id": signature_request_id,
            "is_complete": sig_request.get('is_complete', False),
            "is_declined": sig_request.get('is_declined', False),
            "has_error": sig_request.get('has_error', False),
            "signatures": [
                {
                    "signer_email": sig.get('signer_email_address'),
                    "signer_name": sig.get('signer_name'),
                    "status": sig.get('status_code'),
                    "signed_at": sig.get('signed_at'),
                    "last_viewed_at": sig.get('last_viewed_at')
                }
                for sig in sig_request.get('signatures', [])
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@superadmin_router.get("/signature/requests/{hotel_id}")
async def list_signature_requests(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List signature requests for a hotel"""
    verify_superadmin(credentials)
    
    requests = await db.sa_signature_requests.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return requests

@superadmin_router.post("/webhooks/dropbox-sign")
async def dropbox_sign_webhook(request_data: Dict[str, Any], db):
    """Handle Dropbox Sign webhook events"""
    from .signature_service import dropbox_sign_service
    
    # Verify webhook signature
    api_key = os.environ.get('DROPBOX_SIGN_API_KEY', '')
    if not dropbox_sign_service.verify_webhook_signature(request_data, api_key):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")
    
    event = request_data.get('event', {})
    event_type = event.get('event_type')
    sig_request = request_data.get('signature_request', {})
    sig_request_id = sig_request.get('signature_request_id')
    
    # Update our database based on event
    if event_type == 'signature_request_signed':
        await db.sa_signature_requests.update_one(
            {"signature_request_id": sig_request_id},
            {"$set": {"status": "signed", "signed_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    elif event_type == 'signature_request_all_signed':
        await db.sa_signature_requests.update_one(
            {"signature_request_id": sig_request_id},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Also update SEPA mandate status if applicable
        sig_doc = await db.sa_signature_requests.find_one({"signature_request_id": sig_request_id})
        if sig_doc and sig_doc.get('document_type') == 'sepa_mandate':
            await db.sa_sepa_mandates.update_one(
                {"hotel_id": sig_doc['hotel_id']},
                {"$set": {"status": "active", "signed_date": datetime.now(timezone.utc).isoformat()}}
            )
    
    elif event_type == 'signature_request_declined':
        await db.sa_signature_requests.update_one(
            {"signature_request_id": sig_request_id},
            {"$set": {"status": "declined"}}
        )
    
    return {"message": "Hello API Event Received"}

