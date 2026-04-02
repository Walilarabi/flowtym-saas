"""
Flowtym Configuration Module - Advanced Settings Models

These models define advanced configuration options like taxes, 
business rules, and customer segmentation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# TAX CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class TaxType(str, Enum):
    """Types of taxes"""
    VAT = "vat"
    CITY_TAX = "city_tax"
    TOURIST_TAX = "tourist_tax"
    SERVICE_CHARGE = "service_charge"
    OTHER = "other"


class TaxCalculation(str, Enum):
    """How tax is calculated"""
    PERCENTAGE = "percentage"
    FIXED_PER_NIGHT = "fixed_per_night"
    FIXED_PER_PERSON = "fixed_per_person"
    FIXED_PER_PERSON_NIGHT = "fixed_per_person_night"
    FIXED_PER_STAY = "fixed_per_stay"


class TaxRule(BaseModel):
    """A tax rule configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identification
    code: str  # VAT_10, CITY_TAX, etc.
    name: str
    tax_type: TaxType
    
    # Calculation
    calculation: TaxCalculation = TaxCalculation.PERCENTAGE
    rate: float = 0  # Percentage or fixed amount
    currency: str = "EUR"
    
    # Application rules
    applies_to_room: bool = True
    applies_to_extras: bool = True
    applies_to_meals: bool = True
    
    # Exemptions
    exempt_age_under: Optional[int] = None  # Exempt children under X years
    exempt_business: bool = False  # Exempt business travelers
    max_nights: Optional[int] = None  # Apply for max X nights
    
    # Display
    included_in_price: bool = False  # Is this tax included in displayed prices?
    show_on_invoice: bool = True
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER SEGMENTATION
# ═══════════════════════════════════════════════════════════════════════════════

class SegmentType(str, Enum):
    """Customer segment types"""
    LEISURE = "leisure"
    BUSINESS = "business"
    GROUP = "group"
    CORPORATE = "corporate"
    LOYALTY = "loyalty"
    OTA = "ota"
    WHOLESALE = "wholesale"
    DIRECT = "direct"
    OTHER = "other"


class CustomerSegment(BaseModel):
    """Customer segment definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str  # IND_LEI, BUS_CORP, GRP_TOUR
    name: str
    segment_type: SegmentType
    
    # Description
    description: Optional[str] = None
    
    # Color for UI
    color: str = "#6366f1"  # Violet default
    
    # Status
    is_active: bool = True
    sort_order: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# BUSINESS RULES
# ═══════════════════════════════════════════════════════════════════════════════

class BusinessRule(BaseModel):
    """A business rule configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str
    name: str
    category: str  # booking, pricing, housekeeping, etc.
    
    # Rule definition
    rule_type: str  # constraint, automation, validation
    condition: Optional[str] = None  # JSON condition
    action: Optional[str] = None  # What to do when triggered
    
    # Parameters
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
    # Status
    is_active: bool = True
    priority: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# ADVANCED SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

class AdvancedSettings(BaseModel):
    """
    Advanced Settings Model
    
    Stores all advanced configuration for a hotel.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Tax Configuration
    taxes: List[TaxRule] = Field(default_factory=list)
    
    # Customer Segments
    segments: List[CustomerSegment] = Field(default_factory=list)
    
    # Business Rules
    business_rules: List[BusinessRule] = Field(default_factory=list)
    
    # Booking Rules
    min_booking_advance_hours: int = 0  # Minimum hours before arrival
    max_booking_advance_days: int = 365  # Maximum days in advance
    default_arrival_time: str = "15:00"
    default_departure_time: str = "11:00"
    allow_same_day_booking: bool = True
    
    # Inventory Rules
    overbooking_allowed: bool = False
    overbooking_percentage: float = 0
    
    # Pricing Rules
    round_prices_to: float = 1  # Round to nearest X
    min_price_floor: float = 0  # Never go below this
    
    # Communication
    auto_confirmation_email: bool = True
    auto_reminder_email: bool = True
    reminder_days_before: int = 3
    
    # Housekeeping
    default_checkout_cleaning_time_minutes: int = 45
    checkout_inspection_required: bool = False
    
    # Integration Settings
    pms_sync_interval_minutes: int = 5
    channel_manager_sync_interval_minutes: int = 15
    
    # Audit
    enable_audit_log: bool = True
    audit_retention_days: int = 365
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AdvancedSettingsUpdate(BaseModel):
    """Schema for updating advanced settings"""
    taxes: Optional[List[TaxRule]] = None
    segments: Optional[List[CustomerSegment]] = None
    min_booking_advance_hours: Optional[int] = None
    max_booking_advance_days: Optional[int] = None
    default_arrival_time: Optional[str] = None
    default_departure_time: Optional[str] = None
    allow_same_day_booking: Optional[bool] = None
    overbooking_allowed: Optional[bool] = None
    overbooking_percentage: Optional[float] = None
    round_prices_to: Optional[float] = None
    min_price_floor: Optional[float] = None
    auto_confirmation_email: Optional[bool] = None
    auto_reminder_email: Optional[bool] = None
    reminder_days_before: Optional[int] = None
    default_checkout_cleaning_time_minutes: Optional[int] = None
    checkout_inspection_required: Optional[bool] = None
    pms_sync_interval_minutes: Optional[int] = None
    channel_manager_sync_interval_minutes: Optional[int] = None
    enable_audit_log: Optional[bool] = None
    audit_retention_days: Optional[int] = None
