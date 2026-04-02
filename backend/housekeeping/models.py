"""
Housekeeping Module - Pydantic Models
Flowtym PMS - Module de gestion du ménage hôtelier
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class RoomStatus(str, Enum):
    LIBRE = "libre"
    OCCUPE = "occupe"
    DEPART = "depart"
    RECOUCHE = "recouche"
    HORS_SERVICE = "hors_service"


class CleaningStatus(str, Enum):
    NONE = "none"
    EN_COURS = "en_cours"
    NETTOYEE = "nettoyee"
    VALIDEE = "validee"
    REFUSEE = "refusee"


class CleaningType(str, Enum):
    DEPARTURE = "departure_cleaning"
    STAY = "stay_cleaning"
    DEEP = "deep_cleaning"
    INSPECTION = "inspection"
    TOUCH_UP = "touch_up"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REFUSED = "refused"


class StaffStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFF = "off"
    BREAK = "break"


class Priority(str, Enum):
    LOW = "basse"
    MEDIUM = "moyenne"
    HIGH = "haute"
    URGENT = "urgente"


class ClientBadge(str, Enum):
    NORMAL = "normal"
    VIP = "vip"
    PRIORITAIRE = "prioritaire"


class MaintenanceStatus(str, Enum):
    EN_ATTENTE = "en_attente"
    EN_COURS = "en_cours"
    RESOLU = "resolu"


class BreakfastStatus(str, Enum):
    A_PREPARER = "a_preparer"
    PREPARE = "prepare"
    EN_LIVRAISON = "en_livraison"
    SERVI = "servi"


# ═══════════════════════════════════════════════════════════════════════════════
# BASE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class HousekeepingStaff(BaseModel):
    id: str
    hotel_id: str
    first_name: str
    last_name: str
    role: str = "femme_de_chambre"  # femme_de_chambre, gouvernante, maintenance, pdj
    status: StaffStatus = StaffStatus.AVAILABLE
    max_rooms_per_day: int = 12
    current_load: int = 0
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    skills: List[str] = []  # deep_cleaning, vip, suite, etc.
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class HousekeepingZone(BaseModel):
    id: str
    hotel_id: str
    zone_name: str
    floor_number: int
    room_ids: List[str] = []
    assigned_staff_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class HousekeepingTask(BaseModel):
    id: str
    hotel_id: str
    room_id: str
    room_number: str
    room_type: str
    floor: int
    cleaning_type: CleaningType
    status: TaskStatus = TaskStatus.PENDING
    priority: Priority = Priority.MEDIUM
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    validated_at: Optional[str] = None
    validated_by: Optional[str] = None
    refused_reason: Optional[str] = None
    estimated_minutes: int = 30
    actual_minutes: Optional[int] = None
    client_badge: ClientBadge = ClientBadge.NORMAL
    vip_instructions: Optional[str] = None
    guest_name: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None
    photos_before: List[str] = []
    photos_after: List[str] = []
    issues_reported: List[str] = []
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class HousekeepingAssignment(BaseModel):
    id: str
    hotel_id: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    staff_id: str
    staff_name: str
    date: str
    room_ids: List[str] = []
    task_ids: List[str] = []
    total_rooms: int = 0
    completed_rooms: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class RoomInspection(BaseModel):
    id: str
    hotel_id: str
    room_id: str
    room_number: str
    room_type: str
    floor: int
    task_id: str
    cleaned_by: str
    cleaned_by_name: str
    status: str = "en_attente"  # en_attente, valide, refuse
    completed_at: str
    validated_at: Optional[str] = None
    validated_by: Optional[str] = None
    refused_reason: Optional[str] = None
    checklist: Dict[str, bool] = {}
    rating: Optional[int] = None  # 1-5
    notes: Optional[str] = None
    photos: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class MaintenanceTicket(BaseModel):
    id: str
    hotel_id: str
    room_id: str
    room_number: str
    title: str
    description: str
    category: str = "general"  # plomberie, electricite, climatisation, general
    priority: Priority = Priority.MEDIUM
    status: MaintenanceStatus = MaintenanceStatus.EN_ATTENTE
    reported_by: str
    reported_by_name: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    reported_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    photos: List[str] = []
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None


class BreakfastOrder(BaseModel):
    id: str
    hotel_id: str
    room_id: str
    room_number: str
    guest_name: str
    formule: str = "continental"  # continental, americain, buffet, custom
    person_count: int = 1
    boissons: List[str] = []  # cafe, the, jus_orange, etc.
    options: List[str] = []  # sans_gluten, vegetarien, etc.
    included: bool = True  # Inclus dans le séjour ou payant
    status: BreakfastStatus = BreakfastStatus.A_PREPARER
    delivery_time: Optional[str] = None
    ordered_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    prepared_at: Optional[str] = None
    served_at: Optional[str] = None
    served_by: Optional[str] = None
    notes: Optional[str] = None
    price: Optional[float] = None


class InventoryItem(BaseModel):
    id: str
    hotel_id: str
    item_name: str
    category: str  # linge, amenities, produits_nettoyage, etc.
    unit: str = "pieces"
    current_stock: int = 0
    minimum_threshold: int = 10
    location: str = "stock_principal"
    supplier: Optional[str] = None
    unit_price: Optional[float] = None
    last_restocked_at: Optional[str] = None


class StockConsumption(BaseModel):
    id: str
    hotel_id: str
    item_id: str
    item_name: str
    quantity: int
    room_id: Optional[str] = None
    room_number: Optional[str] = None
    consumed_by: str
    consumed_by_name: str
    consumed_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    reason: str = "nettoyage"  # nettoyage, remplacement, incident


class ActivityEvent(BaseModel):
    id: str
    hotel_id: str
    time: str
    type: str  # cleaning, checkin, checkout, maintenance, review, alert
    description: str
    room_number: Optional[str] = None
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    metadata: Dict[str, Any] = {}


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class CreateTaskRequest(BaseModel):
    room_id: str
    room_number: str
    room_type: str
    floor: int
    cleaning_type: CleaningType
    priority: Priority = Priority.MEDIUM
    assigned_to: Optional[str] = None
    client_badge: ClientBadge = ClientBadge.NORMAL
    vip_instructions: Optional[str] = None
    guest_name: Optional[str] = None
    notes: Optional[str] = None


class UpdateTaskRequest(BaseModel):
    status: Optional[TaskStatus] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    refused_reason: Optional[str] = None
    photos_after: Optional[List[str]] = None
    issues_reported: Optional[List[str]] = None


class StartCleaningRequest(BaseModel):
    task_id: str


class CompleteCleaningRequest(BaseModel):
    task_id: str
    photos_after: List[str] = []
    notes: Optional[str] = None


class ValidateRoomRequest(BaseModel):
    inspection_id: str
    approved: bool
    rating: Optional[int] = None
    notes: Optional[str] = None
    refused_reason: Optional[str] = None


class CreateMaintenanceRequest(BaseModel):
    room_id: str
    room_number: str
    title: str
    description: str
    category: str = "general"
    priority: Priority = Priority.MEDIUM
    photos: List[str] = []


class CreateBreakfastOrderRequest(BaseModel):
    room_id: str
    room_number: str
    guest_name: str
    formule: str = "continental"
    person_count: int = 1
    boissons: List[str] = []
    options: List[str] = []
    included: bool = True
    delivery_time: Optional[str] = None
    notes: Optional[str] = None


class AutoAssignRequest(BaseModel):
    date: str
    strategy: str = "balanced"  # balanced, zone_based, priority_first


class HousekeepingStatsResponse(BaseModel):
    total_rooms: int
    rooms_to_clean: int
    rooms_in_progress: int
    rooms_done: int
    rooms_validated: int
    rooms_refused: int
    departures: int
    stayovers: int
    out_of_service: int
    staff_active: int
    avg_cleaning_time: float
    completion_rate: float


class StaffPerformance(BaseModel):
    staff_id: str
    staff_name: str
    total_rooms: int
    completed: int
    pending: int
    in_progress: int
    avg_time_minutes: float
    quality_rating: float
