"""
Flowtym Data Hub - Billing Models
API usage tracking and billing models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid


class BillingPlanType(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class UsageMetricType(str, Enum):
    API_CALLS = "api_calls"
    DATA_SYNC = "data_sync"
    EVENTS_PROCESSED = "events_processed"
    WEBHOOKS_SENT = "webhooks_sent"
    STORAGE_GB = "storage_gb"
    CONNECTORS_ACTIVE = "connectors_active"


class BillingPlan(BaseModel):
    """API billing plan definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Plan info
    name: str
    plan_type: BillingPlanType
    description: Optional[str] = None
    
    # Pricing
    monthly_price: float = 0
    annual_price: float = 0
    currency: str = "EUR"
    
    # Limits
    api_calls_per_month: int = 1000
    api_calls_per_minute: int = 60
    data_syncs_per_day: int = 24
    events_per_month: int = 10000
    webhooks_per_month: int = 1000
    storage_gb: float = 1.0
    max_connectors: int = 5
    max_hotels: int = 1
    
    # Features
    features: List[str] = Field(default_factory=list)
    
    # Overage
    overage_api_call_price: float = 0.001  # per call
    overage_event_price: float = 0.0005
    overage_storage_price: float = 0.10  # per GB
    
    # Status
    is_active: bool = True
    is_public: bool = True


class TenantBilling(BaseModel):
    """Billing configuration for a tenant"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Plan
    plan_id: str
    plan_type: BillingPlanType
    
    # Subscription
    subscription_status: str = "active"  # active, paused, cancelled, past_due
    subscription_start: datetime
    subscription_end: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    
    # Payment
    payment_method_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    
    # Billing contact
    billing_email: Optional[str] = None
    billing_name: Optional[str] = None
    billing_address: Optional[Dict[str, str]] = None
    vat_number: Optional[str] = None
    
    # Custom limits (override plan)
    custom_limits: Dict[str, int] = Field(default_factory=dict)
    
    # Created
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UsageRecord(BaseModel):
    """Single usage record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Metric
    metric_type: UsageMetricType
    metric_value: float = 1
    
    # Context
    endpoint: Optional[str] = None
    connector_id: Optional[str] = None
    api_key_id: Optional[str] = None
    
    # Timestamp
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Aggregation
    hour: int
    day: int
    month: int
    year: int


class UsageSummary(BaseModel):
    """Aggregated usage summary"""
    tenant_id: str
    period_start: date
    period_end: date
    period_type: str = "monthly"  # daily, weekly, monthly
    
    # Metrics
    api_calls: int = 0
    data_syncs: int = 0
    events_processed: int = 0
    webhooks_sent: int = 0
    storage_gb: float = 0
    active_connectors: int = 0
    
    # Limits
    api_calls_limit: int = 0
    api_calls_remaining: int = 0
    
    # Overage
    api_calls_overage: int = 0
    events_overage: int = 0
    storage_overage_gb: float = 0
    
    # Cost
    base_cost: float = 0
    overage_cost: float = 0
    total_cost: float = 0


class Invoice(BaseModel):
    """Billing invoice"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Invoice info
    invoice_number: str
    period_start: date
    period_end: date
    
    # Status
    status: str = "draft"  # draft, pending, paid, overdue, cancelled
    
    # Amounts
    subtotal: float = 0
    tax_amount: float = 0
    tax_rate: float = 0.20  # 20% VAT
    discount_amount: float = 0
    total_amount: float = 0
    currency: str = "EUR"
    
    # Line items
    line_items: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Payment
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    
    # Dates
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: date
    
    # PDF
    pdf_url: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API KEY MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class APIKeyScope(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    FULL = "full"


class APIKey(BaseModel):
    """API key for external access"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Key info
    name: str
    description: Optional[str] = None
    key_prefix: str  # First 8 chars for identification
    key_hash: str    # Hashed full key
    
    # Permissions
    scopes: List[APIKeyScope] = Field(default_factory=lambda: [APIKeyScope.READ])
    allowed_endpoints: List[str] = Field(default_factory=list)  # Empty = all
    allowed_ips: List[str] = Field(default_factory=list)  # Empty = all
    
    # Rate limits
    rate_limit_per_minute: Optional[int] = None  # Override tenant limit
    rate_limit_per_hour: Optional[int] = None
    
    # Status
    is_active: bool = True
    
    # Expiration
    expires_at: Optional[datetime] = None
    
    # Usage
    last_used_at: Optional[datetime] = None
    total_requests: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class APIKeyUsage(BaseModel):
    """API key usage tracking"""
    api_key_id: str
    tenant_id: str
    
    # Request info
    endpoint: str
    method: str
    
    # Response
    status_code: int
    response_time_ms: int
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow)
