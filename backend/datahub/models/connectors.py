"""
Flowtym Data Hub - Connector Configuration & Status Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectorType(str, Enum):
    """Types of connectors"""
    PMS = "pms"
    OTA = "ota"
    CHANNEL_MANAGER = "channel_manager"
    PAYMENT = "payment"
    RATE_SHOPPER = "rate_shopper"
    CRM = "crm"
    MESSAGING = "messaging"
    REPUTATION = "reputation"


class ConnectorStatus(str, Enum):
    """Connector connection status"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"
    MAINTENANCE = "maintenance"


class SyncStatus(str, Enum):
    """Sync operation status"""
    IDLE = "idle"
    SYNCING = "syncing"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class SyncDirection(str, Enum):
    """Data flow direction"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    BIDIRECTIONAL = "bidirectional"


class WebhookStatus(str, Enum):
    """Webhook subscription status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    FAILED = "failed"


class AuthType(str, Enum):
    """Authentication types"""
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC = "basic"
    BEARER = "bearer"
    CUSTOM = "custom"


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectorAuth(BaseModel):
    """Connector authentication configuration"""
    auth_type: AuthType = AuthType.API_KEY
    
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    username: Optional[str] = None
    password: Optional[str] = None
    
    custom_headers: Dict[str, str] = Field(default_factory=dict)
    
    is_encrypted: bool = True


# ═══════════════════════════════════════════════════════════════════════════════
# SYNC TRACKING MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class SyncRecord(BaseModel):
    """Record of a single sync operation"""
    sync_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    direction: SyncDirection
    entity_type: str
    
    status: SyncStatus = SyncStatus.SYNCING
    
    started_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    
    total_records: int = 0
    processed_records: int = 0
    created_records: int = 0
    updated_records: int = 0
    failed_records: int = 0
    skipped_records: int = 0
    
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    error_sample: Optional[str] = None
    
    last_cursor: Optional[str] = None
    next_cursor: Optional[str] = None


class SyncSchedule(BaseModel):
    """Sync schedule configuration"""
    enabled: bool = True
    interval_minutes: int = 15
    cron_expression: Optional[str] = None
    
    active_hours_start: Optional[int] = None
    active_hours_end: Optional[int] = None
    
    min_interval_seconds: int = 60
    max_concurrent_syncs: int = 1


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class WebhookSubscription(BaseModel):
    """Webhook subscription configuration"""
    webhook_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    endpoint_url: str
    events: List[str] = Field(default_factory=list)
    
    status: WebhookStatus = WebhookStatus.PENDING
    
    secret: Optional[str] = None
    
    retry_count: int = 3
    retry_interval_seconds: int = 60
    
    last_triggered_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    consecutive_failures: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR CONFIGURATION MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectorCapabilities(BaseModel):
    """What the connector can do"""
    supports_reservations: bool = True
    supports_rates: bool = True
    supports_availability: bool = True
    supports_guests: bool = False
    supports_payments: bool = False
    supports_reviews: bool = False
    
    supports_push: bool = False
    supports_pull: bool = True
    supports_webhooks: bool = False
    supports_real_time: bool = False
    
    supports_bulk_operations: bool = True
    supports_delta_sync: bool = True
    max_records_per_request: int = 100


class ConnectorConfig(BaseModel):
    """Complete connector configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    connector_type: ConnectorType
    connector_name: str
    display_name: str
    
    status: ConnectorStatus = ConnectorStatus.DISCONNECTED
    
    auth: ConnectorAuth = Field(default_factory=ConnectorAuth)
    
    base_url: Optional[str] = None
    environment: str = "production"
    version: str = "1.0"
    
    external_hotel_id: Optional[str] = None
    external_property_code: Optional[str] = None
    
    sync_schedule: SyncSchedule = Field(default_factory=SyncSchedule)
    
    webhooks: List[WebhookSubscription] = Field(default_factory=list)
    webhook_receiving_url: Optional[str] = None
    
    capabilities: ConnectorCapabilities = Field(default_factory=ConnectorCapabilities)
    
    field_mappings: Dict[str, str] = Field(default_factory=dict)
    custom_transformations: Dict[str, Any] = Field(default_factory=dict)
    
    priority: int = 50
    
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[SyncStatus] = None
    last_error: Optional[str] = None
    last_error_at: Optional[datetime] = None
    
    sync_success_rate: float = 0.0
    average_sync_duration_ms: int = 0
    total_syncs_24h: int = 0
    failed_syncs_24h: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    connected_at: Optional[datetime] = None
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConnectorDefinition(BaseModel):
    """Connector definition - describes a connector type"""
    connector_name: str
    display_name: str
    description: str
    connector_type: ConnectorType
    
    provider: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    documentation_url: Optional[str] = None
    
    is_available: bool = True
    is_beta: bool = False
    is_deprecated: bool = False
    
    capabilities: ConnectorCapabilities = Field(default_factory=ConnectorCapabilities)
    
    required_auth_fields: List[str] = Field(default_factory=list)
    
    setup_instructions: Optional[str] = None
    sandbox_available: bool = True
    
    version: str = "1.0.0"
    min_api_version: Optional[str] = None


class ConnectorState(BaseModel):
    """Runtime state of a connector"""
    connector_id: str
    tenant_id: str
    
    status: ConnectorStatus
    
    current_operation: Optional[str] = None
    operation_progress: float = 0.0
    
    recent_syncs: List[SyncRecord] = Field(default_factory=list)
    
    is_healthy: bool = True
    health_check_at: Optional[datetime] = None
    
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset_at: Optional[datetime] = None
    
    pending_operations: int = 0
    
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT ALL
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "ConnectorType", "ConnectorStatus", "SyncStatus", "SyncDirection",
    "WebhookStatus", "AuthType", "ConnectorAuth",
    "SyncRecord", "SyncSchedule", "WebhookSubscription",
    "ConnectorCapabilities", "ConnectorConfig", "ConnectorDefinition", "ConnectorState",
]
