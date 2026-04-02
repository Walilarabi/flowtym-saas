"""
Flowtym Configuration Module - Hotel Profile Model

This model stores the core hotel information that feeds all other modules.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    CHF = "CHF"


class Timezone(str, Enum):
    EUROPE_PARIS = "Europe/Paris"
    EUROPE_LONDON = "Europe/London"
    EUROPE_BERLIN = "Europe/Berlin"
    EUROPE_MADRID = "Europe/Madrid"
    EUROPE_ROME = "Europe/Rome"
    EUROPE_ZURICH = "Europe/Zurich"
    UTC = "UTC"


class Language(str, Enum):
    FR = "fr"
    EN = "en"
    DE = "de"
    ES = "es"
    IT = "it"


class HotelAddress(BaseModel):
    """Hotel address details"""
    street: str = ""
    street2: Optional[str] = None
    city: str = ""
    postal_code: str = ""
    region: Optional[str] = None
    country: str = "FR"
    country_name: str = "France"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HotelContact(BaseModel):
    """Hotel contact information"""
    phone: Optional[str] = None
    phone2: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    email_reservations: Optional[str] = None
    email_accounting: Optional[str] = None
    website: Optional[str] = None


class HotelProfile(BaseModel):
    """
    Complete Hotel Profile Model
    
    Central configuration that feeds:
    - PMS (room inventory, rates)
    - RMS (market positioning)
    - Channel Manager (distribution)
    - CRM (customer communications)
    - Booking Engine (display)
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # For multi-tenancy
    
    # Basic Info
    name: str
    legal_name: Optional[str] = None
    brand: Optional[str] = None
    chain: Optional[str] = None
    
    # Classification
    stars: int = Field(default=3, ge=1, le=5)
    hotel_type: str = "hotel"  # hotel, residence, boutique, resort
    
    # Capacity
    total_rooms: int = 0
    total_beds: int = 0
    floors: int = 1
    
    # Address
    address: HotelAddress = Field(default_factory=HotelAddress)
    
    # Contact
    contact: HotelContact = Field(default_factory=HotelContact)
    
    # Regional Settings
    currency: Currency = Currency.EUR
    timezone: Timezone = Timezone.EUROPE_PARIS
    default_language: Language = Language.FR
    supported_languages: List[Language] = Field(default_factory=lambda: [Language.FR, Language.EN])
    
    # Tax Settings
    vat_number: Optional[str] = None
    siret: Optional[str] = None  # French business ID
    default_vat_rate: float = 10.0  # Hébergement en France
    city_tax_per_night: float = 0.0  # Taxe de séjour
    city_tax_type: str = "per_person"  # per_person, per_room, percentage
    
    # Operational Settings
    check_in_time: str = "15:00"
    check_out_time: str = "11:00"
    early_check_in_fee: float = 0.0
    late_check_out_fee: float = 0.0
    
    # Amenities & Features
    amenities: List[str] = Field(default_factory=list)
    # wifi, parking, restaurant, spa, pool, gym, bar, room_service, etc.
    
    # Media
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    gallery_urls: List[str] = Field(default_factory=list)
    
    # Integration IDs (for Data Hub)
    pms_property_id: Optional[str] = None
    channel_manager_id: Optional[str] = None
    booking_engine_id: Optional[str] = None
    
    # Metadata
    description: Optional[str] = None
    description_en: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_open: bool = True  # Currently accepting reservations
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Versioning for audit
    version: int = 1
    last_modified_by: Optional[str] = None


class HotelProfileCreate(BaseModel):
    """Schema for creating a hotel profile"""
    name: str
    stars: int = 3
    total_rooms: int = 0
    address: Optional[HotelAddress] = None
    contact: Optional[HotelContact] = None
    currency: Currency = Currency.EUR
    timezone: Timezone = Timezone.EUROPE_PARIS
    default_language: Language = Language.FR


class HotelProfileUpdate(BaseModel):
    """Schema for updating a hotel profile"""
    name: Optional[str] = None
    legal_name: Optional[str] = None
    brand: Optional[str] = None
    stars: Optional[int] = None
    hotel_type: Optional[str] = None
    total_rooms: Optional[int] = None
    total_beds: Optional[int] = None
    floors: Optional[int] = None
    address: Optional[HotelAddress] = None
    contact: Optional[HotelContact] = None
    currency: Optional[Currency] = None
    timezone: Optional[Timezone] = None
    default_language: Optional[Language] = None
    supported_languages: Optional[List[Language]] = None
    vat_number: Optional[str] = None
    siret: Optional[str] = None
    default_vat_rate: Optional[float] = None
    city_tax_per_night: Optional[float] = None
    city_tax_type: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    early_check_in_fee: Optional[float] = None
    late_check_out_fee: Optional[float] = None
    amenities: Optional[List[str]] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    is_active: Optional[bool] = None
    is_open: Optional[bool] = None
