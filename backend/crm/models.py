"""
CRM Module - Data Models
Pydantic models for CRM entities
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ===================== ENUMS =====================

class ClientType(str, Enum):
    VIP = "vip"
    BUSINESS = "business"
    LEISURE = "leisure"
    GROUP = "group"
    REGULAR = "regular"

class ClientStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"
    CHURNED = "churned"

class CommunicationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PHONE = "phone"
    IN_APP = "in_app"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class WorkflowStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"

class AlertPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# ===================== CLIENT MODELS =====================

class ClientPreferences(BaseModel):
    room_type: Optional[str] = None
    floor_preference: Optional[str] = None
    pillow_type: Optional[str] = None
    dietary: List[str] = []
    allergies: List[str] = []
    special_requests: List[str] = []

class ClientStay(BaseModel):
    id: str
    check_in: str
    check_out: str
    room_number: str
    room_type: str
    total_amount: float
    satisfaction_score: Optional[int] = None
    reservation_id: Optional[str] = None

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    client_type: ClientType = ClientType.REGULAR
    tags: List[str] = []
    preferences: Optional[ClientPreferences] = None
    notes: str = ""
    language: str = "fr"
    country: str = "France"

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    client_type: Optional[ClientType] = None
    status: Optional[ClientStatus] = None
    tags: Optional[List[str]] = None
    preferences: Optional[ClientPreferences] = None
    notes: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    loyalty_score: Optional[int] = None

class ClientResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    client_type: str
    status: str
    tags: List[str]
    preferences: Dict[str, Any]
    loyalty_score: int
    total_stays: int
    total_spent: float
    last_stay: Optional[str] = None
    stays: List[Dict[str, Any]] = []
    notes: str
    language: str
    country: str
    created_at: str
    updated_at: str

# ===================== SEGMENT MODELS =====================

class SegmentCondition(BaseModel):
    field: str  # e.g., "total_stays", "loyalty_score", "client_type"
    operator: str  # e.g., ">=", "==", "contains"
    value: Any

class SegmentCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#8B5CF6"
    icon: str = "users"
    conditions: List[SegmentCondition] = []
    is_dynamic: bool = True  # Auto-update based on conditions

class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    conditions: Optional[List[SegmentCondition]] = None
    is_dynamic: Optional[bool] = None

class SegmentResponse(BaseModel):
    id: str
    name: str
    description: str
    color: str
    icon: str
    conditions: List[Dict[str, Any]]
    is_dynamic: bool
    client_count: int
    created_at: str
    updated_at: str

# ===================== COMMUNICATION MODELS =====================

class MessageCreate(BaseModel):
    client_id: str
    channel: CommunicationChannel
    subject: Optional[str] = None
    content: str
    template_id: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    channel: str
    last_message: str
    last_message_at: str
    unread_count: int
    status: str  # open, closed, pending

# ===================== CAMPAIGN MODELS =====================

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    type: str  # email, sms, whatsapp, multi-channel
    segment_ids: List[str] = []
    subject: Optional[str] = None
    content: str
    scheduled_at: Optional[str] = None
    auto_triggers: List[Dict[str, Any]] = []

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    segment_ids: Optional[List[str]] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    scheduled_at: Optional[str] = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    status: str
    segment_ids: List[str]
    subject: Optional[str]
    content: str
    scheduled_at: Optional[str]
    sent_count: int
    open_rate: float
    click_rate: float
    created_at: str
    updated_at: str

# ===================== WORKFLOW MODELS =====================

class WorkflowTrigger(BaseModel):
    type: str  # e.g., "booking_confirmed", "check_in", "check_out", "birthday"
    delay_hours: int = 0

class WorkflowAction(BaseModel):
    type: str  # e.g., "send_email", "send_sms", "add_tag", "notify_staff"
    config: Dict[str, Any] = {}

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    trigger: WorkflowTrigger
    actions: List[WorkflowAction]
    is_active: bool = True

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[WorkflowTrigger] = None
    actions: Optional[List[WorkflowAction]] = None
    is_active: Optional[bool] = None

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    trigger: Dict[str, Any]
    actions: List[Dict[str, Any]]
    status: str
    executions_count: int
    last_execution: Optional[str]
    created_at: str
    updated_at: str

# ===================== AUTO-REPLY MODELS =====================

class AutoReplyCreate(BaseModel):
    name: str
    trigger_keywords: List[str]
    channel: CommunicationChannel
    response_template: str
    is_active: bool = True

class AutoReplyResponse(BaseModel):
    id: str
    name: str
    trigger_keywords: List[str]
    channel: str
    response_template: str
    is_active: bool
    usage_count: int
    created_at: str

# ===================== ALERT MODELS =====================

class AlertCreate(BaseModel):
    type: str
    title: str
    message: str
    priority: AlertPriority = AlertPriority.MEDIUM
    client_id: Optional[str] = None
    data: Dict[str, Any] = {}

class AlertResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    priority: str
    client_id: Optional[str]
    is_read: bool
    data: Dict[str, Any]
    created_at: str

# ===================== ANALYTICS MODELS =====================

class CRMAnalytics(BaseModel):
    total_clients: int
    active_clients: int
    new_clients_month: int
    retention_rate: float
    average_nps: float
    average_ltv: float
    top_segments: List[Dict[str, Any]]
    channel_distribution: Dict[str, int]
    monthly_trends: List[Dict[str, Any]]
