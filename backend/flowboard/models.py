"""
Flowboard Models - Central Dashboard Data Models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class WidgetType(str, Enum):
    KPI_CARD = "kpi_card"
    TIMELINE = "timeline"
    CHART = "chart"
    TABLE = "table"
    ALERTS = "alerts"
    AI_SUGGESTIONS = "ai_suggestions"
    QUICK_ACTIONS = "quick_actions"
    WEATHER = "weather"
    OCCUPANCY_GAUGE = "occupancy_gauge"
    REVENUE_TRACKER = "revenue_tracker"
    CHANNEL_MIX = "channel_mix"
    HOUSEKEEPING_STATUS = "housekeeping_status"
    REPUTATION_SCORE = "reputation_score"
    RMS_RECOMMENDATIONS = "rms_recommendations"


class WidgetSize(str, Enum):
    SMALL = "small"      # 1x1
    MEDIUM = "medium"    # 2x1
    LARGE = "large"      # 2x2
    WIDE = "wide"        # 3x1
    TALL = "tall"        # 1x2


class WidgetConfig(BaseModel):
    """Configuration for a dashboard widget"""
    id: str
    type: WidgetType
    title: str
    size: WidgetSize = WidgetSize.MEDIUM
    position: Dict[str, int] = Field(default_factory=lambda: {"x": 0, "y": 0})
    visible: bool = True
    refresh_interval: int = 60  # seconds
    data_source: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)


class DashboardLayout(BaseModel):
    """User's dashboard layout configuration"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    hotel_id: str
    name: str = "Default Dashboard"
    widgets: List[WidgetConfig] = Field(default_factory=list)
    is_default: bool = True
    created_at: str
    updated_at: str


class DashboardLayoutCreate(BaseModel):
    name: str = "My Dashboard"
    widgets: List[WidgetConfig] = Field(default_factory=list)


class DashboardLayoutUpdate(BaseModel):
    name: Optional[str] = None
    widgets: Optional[List[WidgetConfig]] = None


# ═══════════════════════════════════════════════════════════════════════════════
# FLOWBOARD UNIFIED RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class FlowboardKPI(BaseModel):
    """Single KPI metric"""
    id: str
    label: str
    value: Any
    unit: Optional[str] = None
    trend: Optional[float] = None  # Percentage change
    trend_direction: Optional[str] = None  # up, down, stable
    color: Optional[str] = None
    icon: Optional[str] = None
    source_module: str  # pms, channel, crm, housekeeping, rms, ereputation


class FlowboardEvent(BaseModel):
    """Timeline event"""
    id: str
    time: str
    title: str
    description: Optional[str] = None
    type: str  # arrival, departure, task, alert, booking, payment
    priority: str = "normal"  # low, normal, high, urgent
    source_module: str
    action_url: Optional[str] = None
    status: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FlowboardAlert(BaseModel):
    """Alert/notification"""
    id: str
    title: str
    message: str
    severity: str  # info, warning, error, success
    source_module: str
    timestamp: str
    is_read: bool = False
    action_url: Optional[str] = None
    action_label: Optional[str] = None


class AISuggestion(BaseModel):
    """AI-powered suggestion"""
    id: str
    title: str
    description: str
    impact: str  # low, medium, high
    category: str  # revenue, operations, guest_experience, cost_reduction
    confidence: float  # 0-1
    action_items: List[str] = Field(default_factory=list)
    estimated_value: Optional[float] = None
    source_data: Dict[str, Any] = Field(default_factory=dict)


class FlowboardResponse(BaseModel):
    """Complete Flowboard data response"""
    model_config = ConfigDict(extra="ignore")
    
    # Header info
    hotel_id: str
    hotel_name: str
    date: str
    last_updated: str
    
    # Consolidated KPIs
    kpis: Dict[str, List[FlowboardKPI]] = Field(default_factory=dict)
    
    # Timeline
    timeline: List[FlowboardEvent] = Field(default_factory=list)
    
    # Alerts
    alerts: List[FlowboardAlert] = Field(default_factory=list)
    
    # AI Suggestions
    ai_suggestions: List[AISuggestion] = Field(default_factory=list)
    
    # Module-specific data
    pms_summary: Dict[str, Any] = Field(default_factory=dict)
    channel_summary: Dict[str, Any] = Field(default_factory=dict)
    crm_summary: Dict[str, Any] = Field(default_factory=dict)
    housekeeping_summary: Dict[str, Any] = Field(default_factory=dict)
    rms_summary: Dict[str, Any] = Field(default_factory=dict)
    ereputation_summary: Dict[str, Any] = Field(default_factory=dict)
    
    # Quick stats
    quick_stats: Dict[str, Any] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# INTER-MODULE SYNC MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ModuleSyncStatus(BaseModel):
    """Status of inter-module synchronization"""
    module: str
    last_sync: Optional[str] = None
    status: str  # connected, syncing, error, disconnected
    records_synced: int = 0
    last_error: Optional[str] = None


class InterModuleSyncResponse(BaseModel):
    """Overview of all module synchronizations"""
    hotel_id: str
    modules: List[ModuleSyncStatus] = Field(default_factory=list)
    overall_status: str  # healthy, warning, error
    last_full_sync: Optional[str] = None
