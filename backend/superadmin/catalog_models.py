"""
Super Admin - Subscription Catalog Models
Dynamic subscription plans, modules, and features management
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ===================== ENUMS =====================

class ModuleCode(str, Enum):
    PMS = "pms"
    STAFF = "staff"
    CHANNEL_MANAGER = "channel_manager"
    CRM = "crm"
    RMS = "rms"
    E_REPUTATION = "e_reputation"
    OPERATIONS = "operations"
    BOOKING_ENGINE = "booking_engine"
    FINANCE = "finance"
    MARKETING = "marketing"

class SubscriptionStatusV2(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class DowngradeAction(str, Enum):
    BLOCK = "block"  # Block downgrade until users reduced
    DISABLE_EXCESS = "disable_excess"  # Disable excess users automatically

# ===================== MODULE & FEATURE DEFINITIONS =====================

# Default modules with their features
DEFAULT_MODULES = {
    "pms": {
        "name": "PMS",
        "description": "Gestion des réservations et hébergement",
        "icon": "building",
        "features": {
            "reservations": {"name": "Réservations", "description": "Gestion des réservations"},
            "check_in_out": {"name": "Check-in/Check-out", "description": "Arrivées et départs"},
            "housekeeping_basic": {"name": "Housekeeping Basique", "description": "Gestion des chambres"},
            "housekeeping_advanced": {"name": "Housekeeping Avancé", "description": "Planning ménage détaillé"},
            "night_audit": {"name": "Clôture Journalière", "description": "Night audit et rapports"},
        }
    },
    "staff": {
        "name": "Staff",
        "description": "Gestion du personnel et RH",
        "icon": "users",
        "features": {
            "planning": {"name": "Planning", "description": "Planning des équipes"},
            "employees": {"name": "Fiches Employés", "description": "Gestion du personnel"},
            "contracts": {"name": "Contrats", "description": "Génération de contrats"},
            "ocr_documents": {"name": "OCR Documents", "description": "Scan et reconnaissance"},
            "payroll_export": {"name": "Export Paie", "description": "Export vers logiciels paie"},
            "recruitment": {"name": "Recrutement", "description": "Pipeline candidats"},
            "leave_management": {"name": "Congés", "description": "Gestion des congés payés"},
        }
    },
    "channel_manager": {
        "name": "Channel Manager",
        "description": "Synchronisation avec les OTAs",
        "icon": "globe",
        "features": {
            "ota_sync": {"name": "Sync OTAs", "description": "Booking, Expedia, etc."},
            "rate_parity": {"name": "Parité Tarifaire", "description": "Contrôle des tarifs"},
            "availability_sync": {"name": "Sync Disponibilités", "description": "Mise à jour automatique"},
            "two_way_sync": {"name": "Sync Bidirectionnelle", "description": "Import/Export auto"},
        }
    },
    "crm": {
        "name": "CRM",
        "description": "Gestion de la relation client",
        "icon": "heart",
        "features": {
            "guest_profiles": {"name": "Profils Clients", "description": "Fiches clients détaillées"},
            "segments": {"name": "Segmentation", "description": "Groupes de clients"},
            "campaigns_basic": {"name": "Campagnes Basiques", "description": "Emailing simple"},
            "campaigns_advanced": {"name": "Campagnes Avancées", "description": "Automation marketing"},
            "loyalty": {"name": "Fidélité", "description": "Programme de fidélité"},
            "reviews_management": {"name": "Gestion Avis", "description": "Réponses aux avis"},
        }
    },
    "rms": {
        "name": "RMS",
        "description": "Revenue Management System",
        "icon": "trending-up",
        "features": {
            "pricing_basic": {"name": "Tarification Basique", "description": "Grilles tarifaires"},
            "yield_management": {"name": "Yield Management", "description": "Optimisation revenus"},
            "forecasting": {"name": "Prévisions", "description": "Forecasting demande"},
            "competitor_analysis": {"name": "Analyse Concurrence", "description": "Veille tarifaire"},
            "dynamic_pricing": {"name": "Prix Dynamiques", "description": "Ajustement automatique"},
        }
    },
    "e_reputation": {
        "name": "E-Réputation",
        "description": "Gestion de la réputation en ligne",
        "icon": "star",
        "features": {
            "review_monitoring": {"name": "Veille Avis", "description": "Suivi des avis"},
            "auto_responses": {"name": "Réponses Auto", "description": "Réponses automatiques IA"},
            "sentiment_analysis": {"name": "Analyse Sentiments", "description": "Analyse des tendances"},
            "competitor_benchmark": {"name": "Benchmark", "description": "Comparaison concurrents"},
        }
    },
    "operations": {
        "name": "Operations",
        "description": "Gestion opérationnelle",
        "icon": "settings",
        "features": {
            "maintenance": {"name": "Maintenance", "description": "Suivi des interventions"},
            "inventory": {"name": "Inventaire", "description": "Gestion des stocks"},
            "suppliers": {"name": "Fournisseurs", "description": "Gestion fournisseurs"},
            "task_management": {"name": "Tâches", "description": "Gestion des tâches"},
        }
    },
    "booking_engine": {
        "name": "Booking Engine",
        "description": "Moteur de réservation directe",
        "icon": "shopping-cart",
        "features": {
            "direct_booking": {"name": "Réservation Directe", "description": "Widget site web"},
            "packages": {"name": "Packages", "description": "Offres groupées"},
            "promo_codes": {"name": "Codes Promo", "description": "Gestion promotions"},
            "upselling": {"name": "Upselling", "description": "Ventes additionnelles"},
        }
    },
    "finance": {
        "name": "Finance",
        "description": "Gestion financière",
        "icon": "euro",
        "features": {
            "invoicing": {"name": "Facturation", "description": "Factures automatiques"},
            "accounting_export": {"name": "Export Comptable", "description": "Export vers comptabilité"},
            "reports": {"name": "Rapports Financiers", "description": "Tableaux de bord"},
            "cash_management": {"name": "Caisse", "description": "Gestion de caisse"},
            "payment_tracking": {"name": "Suivi Paiements", "description": "Encaissements"},
        }
    },
    "marketing": {
        "name": "Marketing",
        "description": "Marketing et commercialisation",
        "icon": "megaphone",
        "features": {
            "email_campaigns": {"name": "Campagnes Email", "description": "Emailing marketing"},
            "sms_campaigns": {"name": "Campagnes SMS", "description": "SMS marketing"},
            "social_media": {"name": "Réseaux Sociaux", "description": "Publication automatique"},
            "analytics": {"name": "Analytics", "description": "Statistiques marketing"},
            "ab_testing": {"name": "A/B Testing", "description": "Tests d'optimisation"},
        }
    }
}

# ===================== REQUEST MODELS =====================

class FeatureToggle(BaseModel):
    """Feature configuration within a module"""
    code: str
    enabled: bool = True

class ModuleConfig(BaseModel):
    """Module configuration for a subscription plan"""
    code: str  # Module code (pms, staff, etc.)
    enabled: bool = True
    features: List[FeatureToggle] = []

class SubscriptionPlanCreate(BaseModel):
    """Create a new subscription plan"""
    name: str
    code: str  # Unique code (e.g., "starter", "business")
    description: str = ""
    price_monthly: float
    price_annual: float
    annual_discount_percent: float = 0.0  # Configurable discount
    max_users: int  # -1 for unlimited
    trial_days: int = 0  # 0 = no trial, configurable
    commitment_months: int = 0  # 0 = no commitment
    modules: List[ModuleConfig]
    is_active: bool = True
    is_featured: bool = False  # Show as "Popular"
    sort_order: int = 0

class SubscriptionPlanUpdate(BaseModel):
    """Update subscription plan"""
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_annual: Optional[float] = None
    annual_discount_percent: Optional[float] = None
    max_users: Optional[int] = None
    trial_days: Optional[int] = None
    commitment_months: Optional[int] = None
    modules: Optional[List[ModuleConfig]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None

# ===================== LIFECYCLE ACTIONS =====================

class PauseSubscriptionRequest(BaseModel):
    """Pause a subscription"""
    reason: str = ""
    
class ReactivateSubscriptionRequest(BaseModel):
    """Reactivate a paused subscription"""
    resume_billing: bool = True

class UpgradeSubscriptionRequest(BaseModel):
    """Upgrade subscription"""
    new_plan_id: str
    additional_modules: List[str] = []  # Module codes to add
    additional_features: Dict[str, List[str]] = {}  # Module code -> feature codes
    new_max_users: Optional[int] = None
    apply_immediately: bool = True  # False = apply at next billing
    prorate: bool = True  # Prorate charges

class DowngradeSubscriptionRequest(BaseModel):
    """Downgrade subscription"""
    new_plan_id: str
    action_on_excess_users: DowngradeAction = DowngradeAction.BLOCK
    apply_immediately: bool = False  # Default: apply at next billing
    
class DowngradeCompatibilityCheck(BaseModel):
    """Result of downgrade compatibility check"""
    is_compatible: bool
    current_users: int
    new_max_users: int
    excess_users: int = 0
    excess_user_emails: List[str] = []
    removed_modules: List[str] = []
    removed_features: Dict[str, List[str]] = {}
    message: str = ""

# ===================== RESPONSE MODELS =====================

class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response"""
    id: str
    name: str
    code: str
    description: str
    price_monthly: float
    price_annual: float
    annual_discount_percent: float
    max_users: int
    trial_days: int
    commitment_months: int
    modules: List[Dict[str, Any]]  # Full module config with features
    is_active: bool
    is_featured: bool
    sort_order: int
    subscribers_count: int = 0  # Number of active subscribers
    created_at: str
    updated_at: str

class ModuleDefinitionResponse(BaseModel):
    """Module definition for UI"""
    code: str
    name: str
    description: str
    icon: str
    features: Dict[str, Dict[str, str]]  # feature_code -> {name, description}

class HotelSubscriptionDetail(BaseModel):
    """Detailed subscription info for a hotel"""
    id: str
    hotel_id: str
    hotel_name: str
    plan_id: str
    plan_name: str
    plan_code: str
    status: str
    price_monthly: float
    price_effective: float
    payment_frequency: str
    max_users: int
    current_users: int
    modules: List[Dict[str, Any]]
    trial_end_date: Optional[str] = None
    paused_at: Optional[str] = None
    paused_reason: Optional[str] = None
    start_date: str
    end_date: str
    next_billing_date: Optional[str] = None
    created_at: str
