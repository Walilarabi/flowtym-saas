"""
Integration Models - External PMS & Channel Manager Connectors
Supports: Mews, Medialog, D-Edge and generic API integrations
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class IntegrationType(str, Enum):
    PMS = "pms"
    CHANNEL_MANAGER = "channel_manager"
    PAYMENT_GATEWAY = "payment_gateway"
    CRM = "crm"
    ACCOUNTING = "accounting"


class IntegrationProvider(str, Enum):
    # PMS Providers
    MEWS = "mews"
    MEDIALOG = "medialog"
    OPERA = "opera"
    CLOUDBEDS = "cloudbeds"
    PROTEL = "protel"
    
    # Channel Managers
    DEDGE = "d-edge"
    SITEMINDER = "siteminder"
    RATEGAIN = "rategain"
    AVAILPRO = "availpro"
    
    # Generic
    WEBHOOK = "webhook"
    REST_API = "rest_api"


class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    TESTING = "testing"


class SyncDirection(str, Enum):
    INBOUND = "inbound"      # External -> Flowtym
    OUTBOUND = "outbound"    # Flowtym -> External
    BIDIRECTIONAL = "bidirectional"


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class IntegrationCredentials(BaseModel):
    """Encrypted credentials for external service"""
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    webhook_secret: Optional[str] = None
    custom_fields: Dict[str, str] = Field(default_factory=dict)


class IntegrationEndpoints(BaseModel):
    """API endpoints configuration"""
    base_url: str
    auth_url: Optional[str] = None
    reservations_url: Optional[str] = None
    inventory_url: Optional[str] = None
    rates_url: Optional[str] = None
    availability_url: Optional[str] = None
    webhook_url: Optional[str] = None


class FieldMapping(BaseModel):
    """Field mapping between Flowtym and external system"""
    flowtym_field: str
    external_field: str
    transform: Optional[str] = None  # Optional transformation function name
    default_value: Optional[Any] = None


class IntegrationMappings(BaseModel):
    """Data mappings for synchronization"""
    room_types: List[FieldMapping] = Field(default_factory=list)
    rate_plans: List[FieldMapping] = Field(default_factory=list)
    channels: List[FieldMapping] = Field(default_factory=list)
    reservation_status: List[FieldMapping] = Field(default_factory=list)
    custom: Dict[str, List[FieldMapping]] = Field(default_factory=dict)


class IntegrationConfigCreate(BaseModel):
    """Create/update integration configuration"""
    name: str
    provider: IntegrationProvider
    integration_type: IntegrationType
    credentials: IntegrationCredentials
    endpoints: IntegrationEndpoints
    sync_direction: SyncDirection = SyncDirection.BIDIRECTIONAL
    sync_interval_minutes: int = 15
    mappings: IntegrationMappings = Field(default_factory=IntegrationMappings)
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class IntegrationConfigResponse(BaseModel):
    """Integration configuration response"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    hotel_id: str
    name: str
    provider: IntegrationProvider
    integration_type: IntegrationType
    status: IntegrationStatus
    sync_direction: SyncDirection
    sync_interval_minutes: int
    last_sync: Optional[str] = None
    last_error: Optional[str] = None
    error_count: int = 0
    mappings: IntegrationMappings
    settings: Dict[str, Any]
    is_active: bool
    created_at: str
    updated_at: str
    
    # Stats
    total_synced: int = 0
    sync_success_rate: float = 100.0


# ═══════════════════════════════════════════════════════════════════════════════
# SYNC LOGS & EVENTS
# ═══════════════════════════════════════════════════════════════════════════════

class SyncLogEntry(BaseModel):
    """Log entry for synchronization events"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    integration_id: str
    hotel_id: str
    direction: SyncDirection
    entity_type: str  # reservation, inventory, rate, availability
    entity_id: Optional[str] = None
    action: str  # create, update, delete, fetch
    status: str  # success, error, skipped
    message: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None
    duration_ms: int = 0
    created_at: str


class SyncBatchResult(BaseModel):
    """Result of a batch synchronization"""
    integration_id: str
    started_at: str
    completed_at: str
    direction: SyncDirection
    total_processed: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    errors: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class WebhookEventType(str, Enum):
    RESERVATION_CREATED = "reservation.created"
    RESERVATION_UPDATED = "reservation.updated"
    RESERVATION_CANCELLED = "reservation.cancelled"
    INVENTORY_UPDATED = "inventory.updated"
    RATE_UPDATED = "rate.updated"
    AVAILABILITY_UPDATED = "availability.updated"
    GUEST_CREATED = "guest.created"
    GUEST_UPDATED = "guest.updated"


class WebhookConfig(BaseModel):
    """Webhook endpoint configuration"""
    id: str
    integration_id: str
    hotel_id: str
    event_types: List[WebhookEventType]
    target_url: str
    secret_key: str
    is_active: bool = True
    retry_count: int = 3
    retry_delay_seconds: int = 60
    created_at: str


class WebhookDelivery(BaseModel):
    """Webhook delivery attempt"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    webhook_id: str
    event_type: WebhookEventType
    payload: Dict[str, Any]
    attempt_number: int
    status: str  # pending, delivered, failed
    response_code: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    delivered_at: Optional[str] = None
    created_at: str


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER-SPECIFIC MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class MewsReservation(BaseModel):
    """Mews PMS reservation format"""
    Id: str
    State: str  # Confirmed, Started, Processed
    StartUtc: str
    EndUtc: str
    AdultCount: int
    ChildCount: int
    CustomerId: str
    AssignedResourceId: Optional[str] = None
    RateId: str
    TotalAmount: Optional[float] = None
    Notes: Optional[str] = None


class MedialogReservation(BaseModel):
    """Medialog PMS reservation format"""
    numero_reservation: str
    date_arrivee: str
    date_depart: str
    nom_client: str
    prenom_client: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    numero_chambre: str
    type_chambre: str
    tarif_journalier: float
    montant_total: float
    statut: str  # CONFIRMEE, EN_COURS, TERMINEE, ANNULEE
    canal: str
    commentaire: Optional[str] = None


class DEdgeInventoryUpdate(BaseModel):
    """D-Edge Channel Manager inventory update"""
    hotel_code: str
    room_type_code: str
    date: str
    availability: int
    rate: Optional[float] = None
    min_stay: Optional[int] = None
    max_stay: Optional[int] = None
    closed_to_arrival: bool = False
    closed_to_departure: bool = False


class DEdgeRateUpdate(BaseModel):
    """D-Edge rate update"""
    hotel_code: str
    room_type_code: str
    rate_plan_code: str
    date: str
    rate_amount: float
    currency: str = "EUR"
    extra_adult: Optional[float] = None
    extra_child: Optional[float] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class IntegrationTestResult(BaseModel):
    """Result of testing an integration connection"""
    success: bool
    provider: str
    message: str
    response_time_ms: int
    capabilities: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class AvailableIntegration(BaseModel):
    """Information about an available integration provider"""
    provider: IntegrationProvider
    name: str
    description: str
    integration_type: IntegrationType
    logo_url: Optional[str] = None
    documentation_url: Optional[str] = None
    required_credentials: List[str]
    supported_features: List[str]
    sync_capabilities: List[str]
    is_certified: bool = False
