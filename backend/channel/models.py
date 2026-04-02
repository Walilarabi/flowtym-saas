"""
Channel Manager Models
Pydantic models for OTA connections, inventory, rates, and reservations
Designed for future D-EDGE / SiteMinder integration
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ===================== ENUMS =====================

class ChannelProvider(str, Enum):
    """Supported OTA/Channel providers"""
    BOOKING_COM = "booking_com"
    EXPEDIA = "expedia"
    AIRBNB = "airbnb"
    HOTELS_COM = "hotels_com"
    AGODA = "agoda"
    TRIVAGO = "trivago"
    DIRECT = "direct"  # Direct bookings
    GDS = "gds"  # Global Distribution Systems
    D_EDGE = "d_edge"  # D-EDGE Channel Manager
    SITEMINDER = "siteminder"  # SiteMinder


class ChannelStatus(str, Enum):
    """Channel connection status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    SUSPENDED = "suspended"


class SyncStatus(str, Enum):
    """Synchronization status"""
    SYNCED = "synced"
    PENDING = "pending"
    FAILED = "failed"
    PARTIAL = "partial"


class RateType(str, Enum):
    """Rate plan types"""
    BAR = "bar"  # Best Available Rate
    PROMO = "promo"
    PACKAGE = "package"
    CORPORATE = "corporate"
    MEMBER = "member"
    LAST_MINUTE = "last_minute"
    EARLY_BIRD = "early_bird"


# ===================== CHANNEL CONNECTION =====================

class ChannelCredentials(BaseModel):
    """Credentials for OTA API connection"""
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    hotel_id: Optional[str] = None  # Hotel ID on the OTA platform
    username: Optional[str] = None
    password: Optional[str] = None
    endpoint_url: Optional[str] = None
    extra_config: Dict[str, Any] = {}


class ChannelConnectionCreate(BaseModel):
    """Create a new channel connection"""
    provider: ChannelProvider
    name: str  # Display name
    credentials: ChannelCredentials = ChannelCredentials()
    is_active: bool = True
    sync_inventory: bool = True
    sync_rates: bool = True
    sync_reservations: bool = True
    commission_rate: float = 0.0  # Commission percentage


class ChannelConnectionUpdate(BaseModel):
    """Update channel connection"""
    name: Optional[str] = None
    credentials: Optional[ChannelCredentials] = None
    is_active: Optional[bool] = None
    sync_inventory: Optional[bool] = None
    sync_rates: Optional[bool] = None
    sync_reservations: Optional[bool] = None
    commission_rate: Optional[float] = None


class ChannelConnection(BaseModel):
    """Channel connection response"""
    id: str
    hotel_id: str
    provider: ChannelProvider
    name: str
    status: ChannelStatus = ChannelStatus.PENDING
    is_active: bool = True
    sync_inventory: bool = True
    sync_rates: bool = True
    sync_reservations: bool = True
    commission_rate: float = 0.0
    last_sync: Optional[str] = None
    last_sync_status: Optional[SyncStatus] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


# ===================== ROOM TYPE MAPPING =====================

class RoomMappingCreate(BaseModel):
    """Map internal room type to OTA room type"""
    channel_id: str
    internal_room_type_id: str
    external_room_code: str
    external_room_name: str
    is_active: bool = True


class RoomMappingUpdate(BaseModel):
    """Update room mapping"""
    external_room_code: Optional[str] = None
    external_room_name: Optional[str] = None
    is_active: Optional[bool] = None


class RoomMapping(BaseModel):
    """Room mapping response"""
    id: str
    hotel_id: str
    channel_id: str
    channel_provider: ChannelProvider
    internal_room_type_id: str
    internal_room_name: str
    external_room_code: str
    external_room_name: str
    is_active: bool
    created_at: str


# ===================== INVENTORY =====================

class InventoryUpdate(BaseModel):
    """Update inventory for a specific date/room/channel"""
    date: str  # YYYY-MM-DD
    room_type_id: str
    channel_id: Optional[str] = None  # None = all channels
    available: int
    min_stay: int = 1
    max_stay: int = 30
    closed_to_arrival: bool = False
    closed_to_departure: bool = False
    stop_sell: bool = False


class InventoryBulkUpdate(BaseModel):
    """Bulk update inventory"""
    updates: List[InventoryUpdate]
    apply_to_all_channels: bool = False


class InventoryRecord(BaseModel):
    """Inventory record"""
    id: str
    hotel_id: str
    date: str
    room_type_id: str
    room_type_name: str
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    total_rooms: int
    sold: int
    available: int
    blocked: int = 0
    min_stay: int = 1
    max_stay: int = 30
    closed_to_arrival: bool = False
    closed_to_departure: bool = False
    stop_sell: bool = False
    sync_status: SyncStatus = SyncStatus.SYNCED
    last_updated: str


# ===================== RATES =====================

class RateUpdate(BaseModel):
    """Update rate for a specific date/room/channel"""
    date: str  # YYYY-MM-DD
    room_type_id: str
    channel_id: Optional[str] = None  # None = all channels
    rate_type: RateType = RateType.BAR
    price: float
    currency: str = "EUR"
    single_use_price: Optional[float] = None
    extra_adult_price: Optional[float] = None
    extra_child_price: Optional[float] = None


class RateBulkUpdate(BaseModel):
    """Bulk update rates"""
    updates: List[RateUpdate]
    apply_to_all_channels: bool = False


class RateRecord(BaseModel):
    """Rate record"""
    id: str
    hotel_id: str
    date: str
    room_type_id: str
    room_type_name: str
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    rate_type: RateType
    price: float
    currency: str
    single_use_price: Optional[float] = None
    extra_adult_price: Optional[float] = None
    extra_child_price: Optional[float] = None
    sync_status: SyncStatus = SyncStatus.SYNCED
    last_updated: str


# ===================== OTA RESERVATIONS =====================

class OTAReservationStatus(str, Enum):
    """OTA reservation status"""
    CONFIRMED = "confirmed"
    PENDING = "pending"
    CANCELLED = "cancelled"
    MODIFIED = "modified"
    NO_SHOW = "no_show"


class OTAGuest(BaseModel):
    """Guest info from OTA"""
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None


class OTAReservation(BaseModel):
    """Reservation received from OTA"""
    id: str
    hotel_id: str
    channel_id: str
    channel_provider: ChannelProvider
    external_reservation_id: str  # ID on the OTA
    status: OTAReservationStatus
    guest: OTAGuest
    room_type_id: str
    room_type_name: str
    check_in: str
    check_out: str
    nights: int
    adults: int
    children: int = 0
    total_amount: float
    currency: str = "EUR"
    commission_amount: float = 0.0
    net_amount: float = 0.0
    rate_plan: str = "BAR"
    special_requests: Optional[str] = None
    is_synced_to_pms: bool = False
    pms_reservation_id: Optional[str] = None
    received_at: str
    created_at: str
    updated_at: str


# ===================== SYNC LOGS =====================

class SyncLog(BaseModel):
    """Sync operation log"""
    id: str
    hotel_id: str
    channel_id: str
    channel_name: str
    operation: str  # "inventory", "rates", "reservations"
    status: SyncStatus
    items_processed: int = 0
    items_success: int = 0
    items_failed: int = 0
    error_details: Optional[List[str]] = None
    started_at: str
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None


# ===================== RATE SHOPPER =====================

class CompetitorRate(BaseModel):
    """Competitor rate from rate shopper"""
    competitor_name: str
    room_type: str
    date: str
    price: float
    currency: str = "EUR"
    source: str  # Where the rate was found
    scraped_at: str


class RateShopperResult(BaseModel):
    """Rate shopper analysis result"""
    hotel_id: str
    date: str
    our_rate: float
    competitor_rates: List[CompetitorRate]
    avg_competitor_rate: float
    min_competitor_rate: float
    max_competitor_rate: float
    position: int  # Our position (1 = cheapest)
    recommendation: str
    recommended_price: Optional[float] = None
