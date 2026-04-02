"""
Flowtym Data Hub - Configuration
Global settings for the enterprise API platform
"""
from pydantic import BaseModel
from typing import Dict, List, Optional
from enum import Enum


class Environment(str, Enum):
    PRODUCTION = "production"
    STAGING = "staging"
    SANDBOX = "sandbox"
    DEVELOPMENT = "development"


class DataHubConfig(BaseModel):
    """Global Data Hub Configuration"""
    
    # Environment
    environment: Environment = Environment.PRODUCTION
    
    # API Settings
    api_version: str = "v1"
    api_rate_limit_per_minute: int = 1000
    api_rate_limit_per_hour: int = 10000
    
    # Cache Settings
    cache_default_ttl: int = 300  # 5 minutes
    cache_max_size: int = 10000
    
    # Event Bus Settings
    event_retention_days: int = 30
    event_max_retries: int = 3
    event_retry_delay_seconds: int = 60
    
    # Connector Settings
    connector_timeout_seconds: int = 30
    connector_max_retries: int = 3
    connector_circuit_breaker_threshold: int = 5
    connector_circuit_breaker_timeout: int = 300
    
    # Quality Engine
    quality_duplicate_threshold: float = 0.85
    quality_validation_strict: bool = True
    
    # Billing
    billing_enabled: bool = True
    billing_free_tier_requests: int = 1000
    
    # Multi-tenant
    max_hotels_per_tenant: int = 100
    
    # Versioning
    supported_api_versions: List[str] = ["v1", "v2"]
    connector_schema_version: str = "1.0.0"


# Default configuration
default_config = DataHubConfig()


# Source priority levels (higher = more trusted)
SOURCE_PRIORITY = {
    "pms": 100,           # PMS is the source of truth
    "direct": 90,         # Direct bookings
    "rms": 80,            # RMS pricing decisions
    "channel_manager": 70, # Channel Manager
    "ota": 60,            # OTA data
    "crm": 50,            # CRM data
    "external_api": 40,   # External API submissions
    "import": 30,         # Bulk imports
    "manual": 20,         # Manual entries
    "default": 10         # Fallback
}


# Connector categories
CONNECTOR_CATEGORIES = {
    "pms": ["mews", "apaleo", "medialogue", "asterio", "oracle", "vega", "misterbooking"],
    "ota": ["booking_com", "expedia", "airbnb", "agoda", "ctrip", "hrs"],
    "payment": ["stripe", "adyen", "paypal"],
    "reputation": ["tripadvisor", "google", "booking_reviews", "expedia_reviews"],
    "messaging": ["email_smtp", "twilio_sms", "whatsapp"]
}


# Event types for orchestration
EVENT_TYPES = {
    # Reservation events
    "reservation.created": {"modules": ["pms", "crm", "rms"]},
    "reservation.updated": {"modules": ["pms", "crm", "channel_manager"]},
    "reservation.cancelled": {"modules": ["pms", "crm", "channel_manager", "rms"]},
    "reservation.checked_in": {"modules": ["pms", "crm"]},
    "reservation.checked_out": {"modules": ["pms", "crm", "billing"]},
    "reservation.no_show": {"modules": ["pms", "crm", "billing", "rms"]},
    
    # Rate events
    "rate.updated": {"modules": ["channel_manager", "booking_engine", "rms"]},
    "rate.restriction_changed": {"modules": ["channel_manager", "booking_engine"]},
    
    # Availability events
    "availability.updated": {"modules": ["channel_manager", "booking_engine"]},
    "availability.overbooking_detected": {"modules": ["pms", "alerts"]},
    
    # Customer events
    "customer.created": {"modules": ["crm", "pms"]},
    "customer.updated": {"modules": ["crm", "pms"]},
    "customer.merged": {"modules": ["crm", "pms"]},
    
    # Review events
    "review.received": {"modules": ["e_reputation", "crm", "rms"]},
    "review.response_needed": {"modules": ["e_reputation", "alerts"]},
    
    # Payment events
    "payment.received": {"modules": ["billing", "pms"]},
    "payment.failed": {"modules": ["billing", "alerts"]},
    "payment.refunded": {"modules": ["billing", "pms"]},
    
    # Distribution events
    "parity.violation_detected": {"modules": ["distribution", "alerts", "rms"]},
    "commission.changed": {"modules": ["distribution", "rms"]},
    
    # System events
    "connector.health_changed": {"modules": ["monitoring", "alerts"]},
    "api.quota_exceeded": {"modules": ["billing", "alerts"]},
}
