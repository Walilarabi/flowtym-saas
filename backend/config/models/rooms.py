"""
Flowtym Configuration Module - Room Types & Inventory Models

These models define room typologies and individual room inventory.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class RoomCategory(str, Enum):
    """Room category classification"""
    STANDARD = "standard"
    SUPERIOR = "superior"
    DELUXE = "deluxe"
    PREMIUM = "premium"
    SUITE = "suite"
    JUNIOR_SUITE = "junior_suite"
    EXECUTIVE = "executive"
    PRESIDENTIAL = "presidential"


class ViewType(str, Enum):
    """Room view types"""
    CITY = "city"
    SEA = "sea"
    GARDEN = "garden"
    POOL = "pool"
    MOUNTAIN = "mountain"
    COURTYARD = "courtyard"
    STREET = "street"
    PARK = "park"
    NONE = "none"


class BathroomType(str, Enum):
    """Bathroom types"""
    SHOWER = "shower"
    BATHTUB = "bathtub"
    BOTH = "both"
    JACUZZI = "jacuzzi"


class BedType(str, Enum):
    """Bed types"""
    SINGLE = "single"
    DOUBLE = "double"
    QUEEN = "queen"
    KING = "king"
    TWIN = "twin"
    SOFA_BED = "sofa_bed"
    BUNK = "bunk"


class BedConfiguration(BaseModel):
    """Bed configuration in a room"""
    bed_type: BedType
    quantity: int = 1
    width_cm: Optional[int] = None  # 90, 140, 160, 180


class RoomType(BaseModel):
    """
    Room Type / Typology Model
    
    Defines a category of rooms with shared characteristics.
    Example: "Double Standard", "Suite Deluxe", "Twin Superior"
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    code: str  # STD, SUP, DLX, STE - used in systems
    name: str  # Display name: "Chambre Double Standard"
    name_en: Optional[str] = None
    
    # Classification
    category: RoomCategory = RoomCategory.STANDARD
    
    # Capacity
    max_occupancy: int = 2
    max_adults: int = 2
    max_children: int = 1
    standard_occupancy: int = 2
    
    # Beds
    beds: List[BedConfiguration] = Field(default_factory=list)
    
    # Physical
    size_sqm: Optional[float] = None
    floor_min: Optional[int] = None
    floor_max: Optional[int] = None
    
    # Features
    view: ViewType = ViewType.NONE
    bathroom: BathroomType = BathroomType.SHOWER
    is_accessible: bool = False
    is_smoking: bool = False
    has_balcony: bool = False
    has_terrace: bool = False
    
    # Equipment (dynamic list)
    equipment: List[str] = Field(default_factory=list)
    # wifi, tv, minibar, safe, air_conditioning, heating, coffee_machine, etc.
    
    # Pricing Reference
    base_price: float = 100.0  # Reference price for rate calculations
    currency: str = "EUR"
    
    # Inventory
    total_rooms: int = 0  # How many rooms of this type
    
    # Media
    images: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    description_en: Optional[str] = None
    
    # Channel Manager mapping
    ota_mappings: Dict[str, str] = Field(default_factory=dict)
    # {"booking_com": "123456", "expedia": "RT-001"}
    
    # Status
    is_active: bool = True
    sort_order: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RoomTypeCreate(BaseModel):
    """Schema for creating a room type"""
    code: str
    name: str
    name_en: Optional[str] = None
    category: RoomCategory = RoomCategory.STANDARD
    max_occupancy: int = 2
    max_adults: int = 2
    max_children: int = 1
    beds: List[BedConfiguration] = Field(default_factory=list)
    size_sqm: Optional[float] = None
    view: ViewType = ViewType.NONE
    bathroom: BathroomType = BathroomType.SHOWER
    equipment: List[str] = Field(default_factory=list)
    base_price: float = 100.0
    description: Optional[str] = None


class RoomTypeUpdate(BaseModel):
    """Schema for updating a room type"""
    code: Optional[str] = None
    name: Optional[str] = None
    name_en: Optional[str] = None
    category: Optional[RoomCategory] = None
    max_occupancy: Optional[int] = None
    max_adults: Optional[int] = None
    max_children: Optional[int] = None
    beds: Optional[List[BedConfiguration]] = None
    size_sqm: Optional[float] = None
    view: Optional[ViewType] = None
    bathroom: Optional[BathroomType] = None
    is_accessible: Optional[bool] = None
    is_smoking: Optional[bool] = None
    has_balcony: Optional[bool] = None
    equipment: Optional[List[str]] = None
    base_price: Optional[float] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM INVENTORY
# ═══════════════════════════════════════════════════════════════════════════════

class RoomStatus(str, Enum):
    """Physical room status"""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    OUT_OF_ORDER = "out_of_order"
    OUT_OF_SERVICE = "out_of_service"


class Room(BaseModel):
    """
    Individual Room Model
    
    Represents a physical room in the hotel inventory.
    Links to a RoomType for category characteristics.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Identification
    room_number: str  # "101", "201A", "P-01"
    room_name: Optional[str] = None  # "Suite Eiffel", "Chambre Jardin"
    
    # Type Reference
    room_type_id: str
    room_type_code: Optional[str] = None  # Denormalized for display
    room_type_name: Optional[str] = None
    
    # Location
    floor: int = 1
    building: Optional[str] = None  # For multi-building properties
    wing: Optional[str] = None
    
    # Override capacity (if different from type)
    max_occupancy: Optional[int] = None
    max_adults: Optional[int] = None
    
    # Override features
    view: Optional[ViewType] = None
    bathroom: Optional[BathroomType] = None
    beds: Optional[List[BedConfiguration]] = None
    equipment: Optional[List[str]] = None  # Additional equipment
    
    # Physical
    size_sqm: Optional[float] = None
    is_accessible: bool = False
    is_smoking: bool = False
    has_balcony: bool = False
    has_terrace: bool = False
    
    # Connecting rooms
    is_connecting: bool = False
    connecting_room_ids: List[str] = Field(default_factory=list)
    
    # Status
    status: RoomStatus = RoomStatus.AVAILABLE
    is_active: bool = True
    
    # Housekeeping
    last_cleaned: Optional[datetime] = None
    cleaning_priority: int = 0
    
    # Maintenance
    last_maintenance: Optional[datetime] = None
    maintenance_notes: Optional[str] = None
    
    # Special notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    # PMS mapping
    pms_room_id: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RoomCreate(BaseModel):
    """Schema for creating a room"""
    room_number: str
    room_name: Optional[str] = None
    room_type_id: str
    floor: int = 1
    building: Optional[str] = None
    wing: Optional[str] = None
    view: Optional[ViewType] = None
    bathroom: Optional[BathroomType] = None
    equipment: Optional[List[str]] = None
    is_accessible: bool = False
    is_smoking: bool = False
    has_balcony: bool = False
    notes: Optional[str] = None


class RoomUpdate(BaseModel):
    """Schema for updating a room"""
    room_number: Optional[str] = None
    room_name: Optional[str] = None
    room_type_id: Optional[str] = None
    floor: Optional[int] = None
    building: Optional[str] = None
    wing: Optional[str] = None
    view: Optional[ViewType] = None
    bathroom: Optional[BathroomType] = None
    beds: Optional[List[BedConfiguration]] = None
    equipment: Optional[List[str]] = None
    is_accessible: Optional[bool] = None
    is_smoking: Optional[bool] = None
    has_balcony: Optional[bool] = None
    has_terrace: Optional[bool] = None
    is_connecting: Optional[bool] = None
    connecting_room_ids: Optional[List[str]] = None
    status: Optional[RoomStatus] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None


class RoomBulkImport(BaseModel):
    """Schema for Excel import"""
    room_number: str
    room_type_code: str
    floor: Optional[int] = 1
    view: Optional[str] = None
    bathroom: Optional[str] = None
    equipment: Optional[str] = None  # Comma-separated
    is_accessible: Optional[bool] = False
    notes: Optional[str] = None
