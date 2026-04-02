"""
Super Admin Models - Pydantic schemas for SaaS management
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ===================== ENUMS =====================

class SubscriptionPlan(str, Enum):
    BASIC = "basic"
    PRO = "pro"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PaymentFrequency(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"

class TrialType(str, Enum):
    FREE_15_DAYS = "free_15_days"
    HALF_PRICE_FIRST_MONTH = "half_price_first_month"
    NONE = "none"

class HotelUserRole(str, Enum):
    DIRECTION = "direction"
    RH = "rh"
    RECEPTION = "reception"
    HOUSEKEEPING = "housekeeping"
    RESTAURANT = "restaurant"
    MAINTENANCE = "maintenance"
    COMPTABILITE = "comptabilite"

# ===================== SUBSCRIPTION PLANS DEFINITION =====================

SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Basic",
        "max_users": 5,
        "price_monthly": 99,
        "price_annual": 1128,  # 99 * 12 * 0.95
        "modules": ["pms"],
        "features": {
            "pms": ["reservations", "check_in_out", "housekeeping_basic"],
        }
    },
    "pro": {
        "name": "Pro",
        "max_users": 15,
        "price_monthly": 199,
        "price_annual": 2269,  # 199 * 12 * 0.95
        "modules": ["pms", "staff", "crm"],
        "features": {
            "pms": ["reservations", "check_in_out", "housekeeping_basic", "housekeeping_advanced", "channel_manager"],
            "staff": ["planning", "employees", "contracts", "reporting"],
            "crm": ["guests", "segments", "campaigns_basic"],
        }
    },
    "premium": {
        "name": "Premium",
        "max_users": 30,
        "price_monthly": 349,
        "price_annual": 3979,  # 349 * 12 * 0.95
        "modules": ["pms", "staff", "crm", "rms", "finance"],
        "features": {
            "pms": ["reservations", "check_in_out", "housekeeping_basic", "housekeeping_advanced", "channel_manager", "otas_sync"],
            "staff": ["planning", "employees", "contracts", "reporting", "recruitment", "payroll_export"],
            "crm": ["guests", "segments", "campaigns_basic", "campaigns_advanced", "loyalty"],
            "rms": ["pricing_basic", "yield_management", "forecasting"],
            "finance": ["invoicing", "accounting_export", "reports"],
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "max_users": -1,  # Unlimited
        "price_monthly": 599,
        "price_annual": 6829,  # 599 * 12 * 0.95
        "modules": ["pms", "staff", "crm", "rms", "finance", "api"],
        "features": {
            "pms": ["all"],
            "staff": ["all"],
            "crm": ["all"],
            "rms": ["all"],
            "finance": ["all"],
            "api": ["webhooks", "custom_integrations", "white_label"],
        }
    }
}

# ===================== REQUEST MODELS =====================

class HotelCreate(BaseModel):
    """Create a new hotel (client)"""
    name: str
    legal_name: str  # Société juridique
    address: str
    city: str
    postal_code: str
    country: str = "France"
    siret: str
    contact_email: EmailStr
    contact_phone: str
    contact_name: str
    
class HotelUpdate(BaseModel):
    """Update hotel information"""
    name: Optional[str] = None
    legal_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    siret: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None

class SubscriptionCreate(BaseModel):
    """Create subscription for a hotel"""
    hotel_id: str
    plan: SubscriptionPlan
    payment_frequency: PaymentFrequency
    trial_type: TrialType = TrialType.FREE_15_DAYS
    custom_modules: Optional[List[str]] = None  # Override plan modules
    custom_features: Optional[Dict[str, List[str]]] = None  # Override features
    custom_max_users: Optional[int] = None  # Override max users
    custom_price_monthly: Optional[float] = None  # Custom pricing
    notes: str = ""

class SubscriptionUpdate(BaseModel):
    """Update subscription"""
    plan: Optional[SubscriptionPlan] = None
    payment_frequency: Optional[PaymentFrequency] = None
    custom_modules: Optional[List[str]] = None
    custom_features: Optional[Dict[str, List[str]]] = None
    custom_max_users: Optional[int] = None
    custom_price_monthly: Optional[float] = None
    notes: Optional[str] = None

class UserInvite(BaseModel):
    """Invite user to a hotel"""
    hotel_id: str
    email: EmailStr
    first_name: str
    last_name: str
    role: HotelUserRole
    
class SEPAMandateCreate(BaseModel):
    """Create SEPA mandate for hotel"""
    hotel_id: str
    iban: str
    bic: str
    account_holder: str  # Titulaire du compte
    payment_type: str = "RCUR"  # RCUR (récurrent) ou OOFF (ponctuel)

class ContractData(BaseModel):
    """Data for contract generation"""
    hotel_id: str
    include_sepa: bool = True

# ===================== RESPONSE MODELS =====================

class HotelResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    legal_name: str
    address: str
    city: str
    postal_code: str
    country: str
    siret: str
    contact_email: str
    contact_phone: str
    contact_name: str
    status: str  # active, suspended, expired
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[str] = None
    users_count: int = 0
    max_users: int = 0
    rooms_count: int = 0
    created_at: str
    health_score: int = 100  # 0-100

class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    plan: str
    plan_name: str
    status: str
    payment_frequency: str
    price_monthly: float
    price_effective: float  # After discounts
    modules: List[str]
    features: Dict[str, List[str]]
    max_users: int
    trial_end_date: Optional[str] = None
    start_date: str
    end_date: str
    next_billing_date: Optional[str] = None
    created_at: str

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    hotel_name: str
    number: str  # FACT-2024-001
    amount_ht: float
    tva: float
    amount_ttc: float
    status: str  # draft, sent, paid, overdue
    due_date: str
    paid_date: Optional[str] = None
    period_start: str
    period_end: str
    created_at: str

class SEPAMandateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    reference: str  # RUM - Référence Unique de Mandat
    iban_masked: str  # FR76****1234
    bic: str
    account_holder: str
    status: str  # pending_signature, active, revoked
    signed_date: Optional[str] = None
    created_at: str

class DashboardStats(BaseModel):
    """Super Admin dashboard KPIs"""
    total_hotels: int
    active_hotels: int
    suspended_hotels: int
    expiring_soon: int  # < 30 days
    total_users: int
    total_rooms: int
    mrr: float  # Monthly Recurring Revenue
    arr: float  # Annual Recurring Revenue
    churn_rate: float
    plan_distribution: Dict[str, int]
    growth_data: List[Dict]  # Monthly growth
    recent_activity: List[Dict]

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    action: str
    entity_type: str  # hotel, subscription, user, invoice
    entity_id: str
    entity_name: str
    actor_email: str
    actor_name: str
    details: Dict[str, Any] = {}
    created_at: str
