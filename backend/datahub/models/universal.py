"""
Flowtym Data Hub - Universal Data Models (Version 1.0)

This module defines the NORMALIZED data models that serve as the single source of truth
across all Flowtym modules. All external data (PMS, OTA, Channel Manager, etc.) is
transformed into these universal models.

Design Principles:
- Multi-tenant: Every entity has tenant_id (hotel_id)
- Traceable: source_system, source_id, transformation_log for audit
- Extensible: metadata dict for custom fields
- Versioned: schema_version for future migrations
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA VERSION - For future migrations
# ═══════════════════════════════════════════════════════════════════════════════

UNIVERSAL_SCHEMA_VERSION = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS - Normalized status/type values
# ═══════════════════════════════════════════════════════════════════════════════

class ReservationStatus(str, Enum):
    """Normalized reservation statuses across all sources"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    MODIFIED = "modified"


class PaymentStatus(str, Enum):
    """Normalized payment statuses"""
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"


class GuestType(str, Enum):
    """Normalized guest types"""
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"
    GROUP = "group"
    LOYALTY_MEMBER = "loyalty_member"
    VIP = "vip"
    OTA_GUEST = "ota_guest"


class ChannelType(str, Enum):
    """Distribution channels"""
    DIRECT = "direct"
    BOOKING_COM = "booking_com"
    EXPEDIA = "expedia"
    AIRBNB = "airbnb"
    HOTELS_COM = "hotels_com"
    HRS = "hrs"
    AMADEUS = "amadeus"
    SABRE = "sabre"
    CHANNEL_MANAGER = "channel_manager"
    GDS = "gds"
    WHOLESALER = "wholesaler"
    CORPORATE = "corporate"
    OTHER = "other"


class RoomStatus(str, Enum):
    """Normalized room statuses"""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    OUT_OF_ORDER = "out_of_order"
    OUT_OF_SERVICE = "out_of_service"
    BLOCKED = "blocked"


class RateType(str, Enum):
    """Normalized rate types"""
    STANDARD = "standard"
    FLEXIBLE = "flexible"
    NON_REFUNDABLE = "non_refundable"
    CORPORATE = "corporate"
    PROMOTIONAL = "promotional"
    PACKAGE = "package"
    MEMBER = "member"
    LAST_MINUTE = "last_minute"
    ADVANCE_PURCHASE = "advance_purchase"


class MealPlan(str, Enum):
    """Normalized meal plans"""
    ROOM_ONLY = "room_only"
    BREAKFAST = "breakfast"
    HALF_BOARD = "half_board"
    FULL_BOARD = "full_board"
    ALL_INCLUSIVE = "all_inclusive"


class SourceSystem(str, Enum):
    """Known source systems"""
    FLOWTYM_PMS = "flowtym_pms"
    MEWS = "mews"
    ORACLE_OPERA = "oracle_opera"
    BOOKING_COM = "booking_com"
    EXPEDIA = "expedia"
    DEDGE = "dedge"
    SITEMINDER = "siteminder"
    STRIPE = "stripe"
    ADYEN = "adyen"
    LIGHTHOUSE = "lighthouse"
    MANUAL = "manual"


# ═══════════════════════════════════════════════════════════════════════════════
# BASE MODELS - Common fields for all entities
# ═══════════════════════════════════════════════════════════════════════════════

class TransformationLogEntry(BaseModel):
    """Log entry for data transformation tracking"""
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())
    source_system: SourceSystem
    source_field: str
    original_value: Any
    normalized_value: Any
    transformation_rule: str
    connector_version: str = "1.0.0"


class UniversalBase(BaseModel):
    """Base model with common fields for all Universal entities"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # hotel_id - MANDATORY for multi-tenancy
    
    # Source tracking
    source_system: SourceSystem
    source_id: str
    source_raw_data: Optional[Dict[str, Any]] = None
    
    # Transformation audit trail
    transformation_log: List[TransformationLogEntry] = Field(default_factory=list)
    
    # Versioning
    schema_version: str = UNIVERSAL_SCHEMA_VERSION
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    synced_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    # Extensibility
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Hooks for Phase 2 engines
    priority_score: Optional[float] = None
    quality_score: Optional[float] = None
    quality_issues: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# GUEST / CUSTOMER MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class ContactInfo(BaseModel):
    """Contact information sub-model"""
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "FR"
    country_code: str = "FRA"


class IdentityDocument(BaseModel):
    """Identity document sub-model"""
    document_type: str
    document_number: Optional[str] = None
    issuing_country: Optional[str] = None
    expiry_date: Optional[str] = None


class LoyaltyInfo(BaseModel):
    """Loyalty program information"""
    program_name: Optional[str] = None
    member_id: Optional[str] = None
    tier: Optional[str] = None
    points_balance: int = 0


class UniversalGuest(UniversalBase):
    """Universal Guest/Customer Model"""
    first_name: str
    last_name: str
    full_name: str
    guest_type: GuestType = GuestType.INDIVIDUAL
    
    contact: ContactInfo = Field(default_factory=ContactInfo)
    preferred_language: str = "fr"
    preferred_currency: str = "EUR"
    
    identity_documents: List[IdentityDocument] = Field(default_factory=list)
    birth_date: Optional[str] = None
    nationality: Optional[str] = None
    
    company_name: Optional[str] = None
    company_vat: Optional[str] = None
    
    loyalty: Optional[LoyaltyInfo] = None
    
    total_stays: int = 0
    total_revenue: float = 0.0
    first_stay_date: Optional[str] = None
    last_stay_date: Optional[str] = None
    average_spend_per_stay: float = 0.0
    
    preferences: Dict[str, Any] = Field(default_factory=dict)
    special_requests: List[str] = Field(default_factory=list)
    
    tags: List[str] = Field(default_factory=list)
    segments: List[str] = Field(default_factory=list)
    
    marketing_consent: bool = False
    gdpr_consent_date: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM / INVENTORY MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class RoomAmenity(BaseModel):
    """Room amenity"""
    code: str
    name: str
    category: str


class BedConfiguration(BaseModel):
    """Bed configuration"""
    bed_type: str
    quantity: int = 1


class UniversalRoom(UniversalBase):
    """Universal Room/Inventory Model"""
    room_number: str
    room_name: Optional[str] = None
    room_type_code: str
    room_type_name: str
    
    floor: int = 1
    building: Optional[str] = None
    wing: Optional[str] = None
    
    max_occupancy: int = 2
    max_adults: int = 2
    max_children: int = 0
    standard_occupancy: int = 2
    
    beds: List[BedConfiguration] = Field(default_factory=list)
    size_sqm: Optional[float] = None
    
    amenities: List[RoomAmenity] = Field(default_factory=list)
    amenity_codes: List[str] = Field(default_factory=list)
    
    view_type: Optional[str] = None
    is_accessible: bool = False
    is_smoking: bool = False
    is_connecting: bool = False
    connecting_room_ids: List[str] = Field(default_factory=list)
    
    status: RoomStatus = RoomStatus.AVAILABLE
    
    base_price: float = 100.0
    currency: str = "EUR"
    
    images: List[str] = Field(default_factory=list)
    
    pms_room_id: Optional[str] = None
    channel_manager_room_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# RESERVATION MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class ReservationGuest(BaseModel):
    """Guest attached to a reservation"""
    guest_id: str
    is_primary: bool = False
    is_payer: bool = False
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class ReservationRoom(BaseModel):
    """Room assignment in a reservation"""
    room_id: Optional[str] = None
    room_type_code: str
    room_type_name: str
    room_number: Optional[str] = None
    
    adults: int = 1
    children: int = 0
    children_ages: List[int] = Field(default_factory=list)
    
    rate_code: str
    rate_name: str
    rate_type: RateType = RateType.STANDARD
    daily_rate: float
    currency: str = "EUR"
    
    meal_plan: MealPlan = MealPlan.ROOM_ONLY


class ReservationPayment(BaseModel):
    """Payment record for a reservation"""
    payment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    currency: str = "EUR"
    status: PaymentStatus = PaymentStatus.PENDING
    method: str
    
    gateway: Optional[str] = None
    gateway_transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    processed_at: Optional[datetime] = None


class ReservationModification(BaseModel):
    """Modification history entry"""
    modification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    modification_type: str
    modified_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    modified_by: Optional[str] = None
    
    field_changed: str
    old_value: Any
    new_value: Any
    
    reason: Optional[str] = None
    price_difference: float = 0.0


class UniversalReservation(UniversalBase):
    """Universal Reservation Model"""
    confirmation_number: str
    external_confirmation_number: Optional[str] = None
    pms_confirmation_number: Optional[str] = None
    
    channel: ChannelType
    channel_reference: Optional[str] = None
    
    status: ReservationStatus = ReservationStatus.CONFIRMED
    previous_status: Optional[ReservationStatus] = None
    
    check_in_date: str
    check_out_date: str
    original_check_in_date: Optional[str] = None
    original_check_out_date: Optional[str] = None
    nights: int
    
    expected_arrival_time: Optional[str] = None
    expected_departure_time: Optional[str] = None
    actual_check_in: Optional[datetime] = None
    actual_check_out: Optional[datetime] = None
    
    guests: List[ReservationGuest] = Field(default_factory=list)
    primary_guest_id: Optional[str] = None
    total_adults: int = 1
    total_children: int = 0
    
    rooms: List[ReservationRoom] = Field(default_factory=list)
    
    total_amount: float
    currency: str = "EUR"
    
    room_charges: float = 0.0
    tax_amount: float = 0.0
    service_charges: float = 0.0
    extras_amount: float = 0.0
    discounts_amount: float = 0.0
    
    deposit_amount: float = 0.0
    paid_amount: float = 0.0
    balance: float = 0.0
    payments: List[ReservationPayment] = Field(default_factory=list)
    payment_status: PaymentStatus = PaymentStatus.PENDING
    
    rate_code: Optional[str] = None
    rate_name: Optional[str] = None
    rate_type: RateType = RateType.STANDARD
    meal_plan: MealPlan = MealPlan.ROOM_ONLY
    
    commission_rate: Optional[float] = None
    commission_amount: Optional[float] = None
    net_amount: Optional[float] = None
    
    special_requests: List[str] = Field(default_factory=list)
    guest_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    cancellation_date: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    cancellation_fee: float = 0.0
    is_refundable: bool = True
    cancellation_policy: Optional[str] = None
    
    modifications: List[ReservationModification] = Field(default_factory=list)
    is_modified: bool = False
    modification_count: int = 0
    
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    corporate_id: Optional[str] = None
    corporate_name: Optional[str] = None
    
    promo_code: Optional[str] = None
    campaign_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# RATE / PRICING MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class RateRestriction(BaseModel):
    """Rate restrictions"""
    min_stay: Optional[int] = None
    max_stay: Optional[int] = None
    closed_to_arrival: bool = False
    closed_to_departure: bool = False
    min_advance_booking: Optional[int] = None
    max_advance_booking: Optional[int] = None


class DailyRate(BaseModel):
    """Rate for a specific date"""
    date: str
    price: float
    currency: str = "EUR"
    
    available_rooms: int = 0
    total_rooms: int = 0
    
    is_open: bool = True
    is_sold_out: bool = False
    
    restrictions: RateRestriction = Field(default_factory=RateRestriction)
    
    source_system: SourceSystem = SourceSystem.FLOWTYM_PMS
    last_updated: datetime = Field(default_factory=lambda: datetime.utcnow())


class UniversalRate(UniversalBase):
    """Universal Rate Model"""
    rate_code: str
    rate_name: str
    rate_type: RateType = RateType.STANDARD
    
    room_type_code: str
    room_type_name: str
    
    meal_plan: MealPlan = MealPlan.ROOM_ONLY
    
    base_price: float
    currency: str = "EUR"
    
    valid_from: str
    valid_to: str
    
    daily_rates: Dict[str, DailyRate] = Field(default_factory=dict)
    
    default_restrictions: RateRestriction = Field(default_factory=RateRestriction)
    
    channels: List[ChannelType] = Field(default_factory=list)
    
    is_commissionable: bool = True
    commission_rate: Optional[float] = None
    
    cancellation_policy_code: Optional[str] = None
    cancellation_policy_text: Optional[str] = None
    
    is_active: bool = True
    is_derived: bool = False
    parent_rate_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class DailyAvailability(BaseModel):
    """Availability for a specific date"""
    date: str
    
    total_rooms: int
    available_rooms: int
    sold_rooms: int
    blocked_rooms: int = 0
    overbooking_allowance: int = 0
    
    is_open: bool = True
    stop_sell: bool = False
    
    restrictions: RateRestriction = Field(default_factory=RateRestriction)


class UniversalAvailability(UniversalBase):
    """Universal Availability Model"""
    room_type_code: str
    room_type_name: str
    
    daily_availability: Dict[str, DailyAvailability] = Field(default_factory=dict)
    
    channel_sync_status: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# FINANCIAL / TRANSACTION MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class TransactionType(str, Enum):
    """Transaction types"""
    CHARGE = "charge"
    PAYMENT = "payment"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"
    COMMISSION = "commission"


class UniversalTransaction(UniversalBase):
    """Universal Transaction Model"""
    transaction_type: TransactionType
    
    amount: float
    currency: str = "EUR"
    exchange_rate: Optional[float] = None
    original_amount: Optional[float] = None
    original_currency: Optional[str] = None
    
    status: PaymentStatus
    
    gateway: str
    gateway_transaction_id: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    
    reservation_id: Optional[str] = None
    invoice_id: Optional[str] = None
    guest_id: Optional[str] = None
    
    payment_method: str
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None
    
    processed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# MARKET DATA MODEL
# ═══════════════════════════════════════════════════════════════════════════════

class CompetitorPrice(BaseModel):
    """Competitor pricing data"""
    competitor_id: str
    competitor_name: str
    date: str
    price: float
    currency: str = "EUR"
    room_type: Optional[str] = None
    meal_plan: Optional[MealPlan] = None
    is_available: bool = True
    source: str
    extracted_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class UniversalMarketData(UniversalBase):
    """Universal Market Data Model"""
    date: str
    
    demand_level: str
    demand_score: float = 0.0
    
    competitor_prices: List[CompetitorPrice] = Field(default_factory=list)
    market_average_price: Optional[float] = None
    market_min_price: Optional[float] = None
    market_max_price: Optional[float] = None
    
    has_event: bool = False
    event_name: Optional[str] = None
    event_impact: Optional[float] = None
    
    weather_condition: Optional[str] = None
    temperature: Optional[float] = None


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT ALL
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "UNIVERSAL_SCHEMA_VERSION",
    "ReservationStatus", "PaymentStatus", "GuestType", "ChannelType",
    "RoomStatus", "RateType", "MealPlan", "SourceSystem", "TransactionType",
    "TransformationLogEntry", "UniversalBase",
    "ContactInfo", "IdentityDocument", "LoyaltyInfo", "UniversalGuest",
    "RoomAmenity", "BedConfiguration", "UniversalRoom",
    "ReservationGuest", "ReservationRoom", "ReservationPayment",
    "ReservationModification", "UniversalReservation",
    "RateRestriction", "DailyRate", "UniversalRate",
    "DailyAvailability", "UniversalAvailability",
    "UniversalTransaction",
    "CompetitorPrice", "UniversalMarketData",
]
