# QR Codes Models for Flowtym
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class QRCodeType(str, Enum):
    HOUSEKEEPING = "housekeeping"  # Pour le suivi nettoyage
    SATISFACTION = "satisfaction"  # Pour les enquêtes client
    ROOM = "room"  # Combiné (housekeeping + satisfaction)
    ZONE = "zone"  # Pour les zones communes (PDJ, SPA, etc.)

class ZoneType(str, Enum):
    ROOM = "room"
    BREAKFAST = "breakfast"
    RESTAURANT = "restaurant"
    SPA = "spa"
    POOL = "pool"
    GYM = "gym"
    LOBBY = "lobby"
    PARKING = "parking"
    CUSTOM = "custom"

# ═══════════════════════════════════════════════════════════════════════════════
# QR ZONE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class QRZoneCreate(BaseModel):
    name: str  # Ex: "Chambre 101", "Restaurant Le Jardin", "SPA Aqua"
    zone_type: ZoneType
    qr_types: List[QRCodeType] = [QRCodeType.HOUSEKEEPING, QRCodeType.SATISFACTION]
    room_number: Optional[str] = None  # Pour les chambres
    floor: Optional[int] = None
    description: Optional[str] = None
    is_active: bool = True

class QRZoneResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    name: str
    zone_type: str
    qr_types: List[str]
    room_number: Optional[str] = None
    floor: Optional[int] = None
    description: Optional[str] = None
    qr_token: str  # Token unique pour le QR code
    qr_url: str  # URL complète du QR code
    is_active: bool
    created_at: str
    updated_at: str

class QRZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    qr_types: Optional[List[QRCodeType]] = None
    is_active: Optional[bool] = None

# ═══════════════════════════════════════════════════════════════════════════════
# HOUSEKEEPING TRACKING MODELS (Chrono)
# ═══════════════════════════════════════════════════════════════════════════════

class HKTrackingStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"  # Scan entrée
    COMPLETED = "completed"  # Scan sortie
    AWAITING_VALIDATION = "awaiting_validation"  # En attente de validation gouvernante

class HKScanCreate(BaseModel):
    employee_id: str
    scan_type: str  # "start" ou "end"

class HKTrackingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    hotel_id: str
    zone_id: str
    zone_name: str
    room_number: Optional[str] = None
    employee_id: str
    employee_name: str
    status: str
    scan_start: Optional[str] = None
    scan_end: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    date: str
    created_at: str
    updated_at: str

# ═══════════════════════════════════════════════════════════════════════════════
# BATCH QR GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

class BatchQRCreate(BaseModel):
    """Génération en masse de QR codes pour les chambres"""
    zone_type: ZoneType = ZoneType.ROOM
    qr_types: List[QRCodeType] = [QRCodeType.HOUSEKEEPING, QRCodeType.SATISFACTION]
    floor_filter: Optional[int] = None  # Filtrer par étage

class BatchQRResponse(BaseModel):
    created_count: int
    zones: List[QRZoneResponse]
