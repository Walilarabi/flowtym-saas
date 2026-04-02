"""
Flowtym Data Hub - Monitoring Models
Metrics, alerts, and monitoring data models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class MetricType(str, Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# ═══════════════════════════════════════════════════════════════════════════════
# METRICS
# ═══════════════════════════════════════════════════════════════════════════════

class Metric(BaseModel):
    """Single metric data point"""
    name: str
    metric_type: MetricType
    value: float
    
    # Labels
    labels: Dict[str, str] = Field(default_factory=dict)
    
    # Tenant
    tenant_id: Optional[str] = None
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MetricDefinition(BaseModel):
    """Metric definition for monitoring"""
    name: str
    description: str
    metric_type: MetricType
    unit: str = ""
    
    # Aggregation
    aggregation: str = "sum"  # sum, avg, min, max, count, p95, p99
    
    # Thresholds
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    
    # Labels
    label_keys: List[str] = Field(default_factory=list)


class MetricAggregation(BaseModel):
    """Aggregated metric over time period"""
    name: str
    tenant_id: Optional[str] = None
    
    # Time period
    period_start: datetime
    period_end: datetime
    granularity: str = "1h"  # 1m, 5m, 1h, 1d
    
    # Values
    count: int = 0
    sum_value: float = 0
    min_value: float = 0
    max_value: float = 0
    avg_value: float = 0
    
    # Percentiles
    p50: Optional[float] = None
    p95: Optional[float] = None
    p99: Optional[float] = None


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════════

class AlertRule(BaseModel):
    """Alert rule definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # None = global rule
    
    # Rule info
    name: str
    description: Optional[str] = None
    
    # Condition
    metric_name: str
    condition: str  # ">", "<", ">=", "<=", "=="
    threshold: float
    duration_seconds: int = 60  # How long condition must be true
    
    # Severity
    severity: AlertSeverity = AlertSeverity.WARNING
    
    # Labels to match
    label_filters: Dict[str, str] = Field(default_factory=dict)
    
    # Notification
    notification_channels: List[str] = Field(default_factory=list)
    
    # Settings
    is_enabled: bool = True
    cooldown_seconds: int = 300  # Time before re-alerting
    
    # Created
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Alert(BaseModel):
    """Active or historical alert"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    
    # Alert info
    rule_id: str
    name: str
    description: Optional[str] = None
    
    # Severity and status
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    
    # Trigger info
    metric_name: str
    metric_value: float
    threshold: float
    
    # Timing
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    
    # Context
    context: Dict[str, Any] = Field(default_factory=dict)
    
    # Notification
    notifications_sent: int = 0
    last_notification_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════════════════════
# LOGS
# ═══════════════════════════════════════════════════════════════════════════════

class LogEntry(BaseModel):
    """Log entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    
    # Log info
    level: LogLevel
    message: str
    
    # Source
    source: str  # Module or component name
    source_id: Optional[str] = None
    
    # Context
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    
    # Request context
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user_id: Optional[str] = None
    api_key_id: Optional[str] = None
    
    # Additional data
    extra: Dict[str, Any] = Field(default_factory=dict)
    
    # Error details
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # Timestamp
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# SLA TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

class SLADefinition(BaseModel):
    """SLA definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # SLA info
    name: str
    description: Optional[str] = None
    
    # Targets
    availability_target: float = 99.9  # Percentage
    response_time_target_ms: int = 500  # p95
    error_rate_target: float = 0.1  # Percentage
    
    # Measurement
    measurement_window: str = "monthly"  # daily, weekly, monthly
    
    # Applies to
    applies_to: str = "all"  # all, tenant, connector


class SLAReport(BaseModel):
    """SLA compliance report"""
    sla_id: str
    tenant_id: Optional[str] = None
    
    # Period
    period_start: datetime
    period_end: datetime
    
    # Availability
    total_minutes: int
    available_minutes: int
    downtime_minutes: int
    availability_percentage: float
    availability_target: float
    availability_met: bool
    
    # Response time
    avg_response_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    response_time_target_ms: int
    response_time_met: bool
    
    # Errors
    total_requests: int
    failed_requests: int
    error_rate: float
    error_rate_target: float
    error_rate_met: bool
    
    # Overall
    sla_met: bool
    
    # Generated
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

class DashboardWidget(BaseModel):
    """Dashboard widget configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Widget info
    title: str
    widget_type: str  # metric_card, chart, table, alert_list
    
    # Data source
    metric_name: Optional[str] = None
    query: Optional[str] = None
    
    # Visualization
    chart_type: Optional[str] = None  # line, bar, pie, area
    
    # Position
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)


class Dashboard(BaseModel):
    """Dashboard configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    
    # Dashboard info
    name: str
    description: Optional[str] = None
    
    # Widgets
    widgets: List[DashboardWidget] = Field(default_factory=list)
    
    # Settings
    refresh_interval_seconds: int = 60
    time_range: str = "24h"  # 1h, 6h, 24h, 7d, 30d
    
    # Sharing
    is_public: bool = False
    is_default: bool = False
    
    # Created
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
