"""
Flowtym AI Support Center - Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TicketStatus(str, Enum):
    OPEN = "open"
    AI_PROCESSING = "ai_processing"
    ESCALATED_TO_HUMAN = "escalated_to_human"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class IssueDiagnosisType(str, Enum):
    LOCAL_BROWSER = "local_browser"
    LOCAL_CACHE = "local_cache"
    LOCAL_CONNECTION = "local_connection"
    SYSTEM_BUG = "system_bug"
    SYSTEM_SYNC = "system_sync"
    SYSTEM_CONFIG = "system_config"
    USER_ERROR = "user_error"
    UNKNOWN = "unknown"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TicketModule(str, Enum):
    PMS = "pms"
    CHANNEL_MANAGER = "channel_manager"
    RMS = "rms"
    HOUSEKEEPING = "housekeeping"
    CRM = "crm"
    FACTURATION = "facturation"
    STAFF = "staff"
    CONFIGURATION = "configuration"
    AUTRE = "autre"

# Request Models
class TicketCreateRequest(BaseModel):
    module: TicketModule
    title: str
    description: str
    screenshot_url: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    
class TicketUpdateRequest(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class TicketMessageRequest(BaseModel):
    content: str
    is_internal: bool = False
    attachments: Optional[List[str]] = None

class AIDiagnosticRequest(BaseModel):
    module: TicketModule
    description: str
    context: Optional[Dict[str, Any]] = None
    error_logs: Optional[str] = None

# Response Models
class TicketResponse(BaseModel):
    id: str
    ticket_id: str  # FLW-2026-000123
    hotel_id: str
    user_id: str
    user_name: str
    user_email: str
    module: str
    title: str
    description: str
    status: str
    priority: str
    screenshot_url: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    ai_diagnosis: Optional[Dict[str, Any]] = None
    resolution_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    messages: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

class AIDiagnosticResponse(BaseModel):
    is_known_issue: bool
    issue_type: Optional[str] = None
    suggested_solution: Optional[str] = None
    auto_fixable: bool = False
    confidence: float = 0.0
    related_articles: List[Dict[str, str]] = []
    recommendation: str

class SupportStatsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    avg_resolution_time_hours: float
    ai_resolution_rate: float
    tickets_by_module: Dict[str, int]
    tickets_by_priority: Dict[str, int]
    recent_tickets: List[Dict[str, Any]]

class KnowledgeArticle(BaseModel):
    id: str
    title: str
    module: str
    content: str
    solution: str
    tags: List[str]
    views: int = 0
    helpful_votes: int = 0
    created_at: datetime
    updated_at: datetime
