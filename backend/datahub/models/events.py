"""
Flowtym Data Hub - Event Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    """Types of events in the system"""
    RESERVATION_CREATED = "reservation.created"
    RESERVATION_MODIFIED = "reservation.modified"
    RESERVATION_CANCELLED = "reservation.cancelled"
    RESERVATION_CHECKED_IN = "reservation.checked_in"
    RESERVATION_CHECKED_OUT = "reservation.checked_out"
    RESERVATION_NO_SHOW = "reservation.no_show"
    
    RATE_UPDATED = "rate.updated"
    RATE_CREATED = "rate.created"
    RATE_DELETED = "rate.deleted"
    
    AVAILABILITY_UPDATED = "availability.updated"
    INVENTORY_LOW = "inventory.low"
    SOLD_OUT = "inventory.sold_out"
    
    GUEST_CREATED = "guest.created"
    GUEST_UPDATED = "guest.updated"
    GUEST_MERGED = "guest.merged"
    
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_FAILED = "payment.failed"
    REFUND_PROCESSED = "refund.processed"
    
    ROOM_STATUS_CHANGED = "room.status_changed"
    
    CONNECTOR_CONNECTED = "connector.connected"
    CONNECTOR_DISCONNECTED = "connector.disconnected"
    CONNECTOR_ERROR = "connector.error"
    SYNC_COMPLETED = "sync.completed"
    SYNC_FAILED = "sync.failed"
    
    DATA_QUALITY_ALERT = "system.data_quality_alert"
    PRIORITY_CONFLICT = "system.priority_conflict"
    
    COMPETITOR_PRICE_CHANGE = "market.competitor_price_change"
    DEMAND_LEVEL_CHANGE = "market.demand_level_change"


class EventPriority(str, Enum):
    """Event processing priority"""
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"
    BATCH = "batch"


class EventStatus(str, Enum):
    """Event processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD_LETTER = "dead_letter"


# ═══════════════════════════════════════════════════════════════════════════════
# EVENT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class EventSource(BaseModel):
    """Source of an event"""
    system: str
    module: str
    connector_id: Optional[str] = None
    user_id: Optional[str] = None


class EventTarget(BaseModel):
    """Target for event processing"""
    module: str
    handler: str
    
    status: EventStatus = EventStatus.PENDING
    delivered_at: Optional[datetime] = None
    
    retry_count: int = 0
    last_error: Optional[str] = None


class DataHubEvent(BaseModel):
    """Core event model for the Data Hub Event Bus"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    event_type: EventType
    priority: EventPriority = EventPriority.NORMAL
    
    tenant_id: str
    
    source: EventSource
    
    entity_type: str
    entity_id: str
    
    payload: Dict[str, Any]
    previous_state: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    
    status: EventStatus = EventStatus.PENDING
    targets: List[EventTarget] = Field(default_factory=list)
    
    occurred_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    processed_at: Optional[datetime] = None
    
    max_retries: int = 3
    retry_delay_seconds: int = 60
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EventSubscription(BaseModel):
    """Subscription to events"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    subscriber_module: str
    subscriber_name: str
    
    event_types: List[EventType]
    
    tenant_filter: Optional[str] = None
    entity_filter: Optional[str] = None
    priority_filter: Optional[EventPriority] = None
    
    handler_endpoint: Optional[str] = None
    is_async: bool = True
    
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class EventQueueItem(BaseModel):
    """Item in the event queue"""
    queue_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    event_type: EventType
    priority: EventPriority
    
    scheduled_for: datetime = Field(default_factory=lambda: datetime.utcnow())
    
    attempts: int = 0
    last_attempt_at: Optional[datetime] = None
    last_error: Optional[str] = None
    
    status: EventStatus = EventStatus.PENDING
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class DeadLetterEvent(BaseModel):
    """Events that failed processing after max retries"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    original_event: DataHubEvent
    
    failure_reason: str
    failure_details: Dict[str, Any] = Field(default_factory=dict)
    
    total_attempts: int
    last_attempt_at: datetime
    
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# ═══════════════════════════════════════════════════════════════════════════════
# EVENT BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def create_reservation_event(
    tenant_id: str,
    event_type: EventType,
    reservation_data: Dict[str, Any],
    source_system: str,
    previous_state: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> DataHubEvent:
    """Helper to create reservation events"""
    return DataHubEvent(
        event_type=event_type,
        tenant_id=tenant_id,
        source=EventSource(
            system=source_system,
            module="datahub",
            user_id=user_id
        ),
        entity_type="reservation",
        entity_id=reservation_data.get("id", ""),
        payload=reservation_data,
        previous_state=previous_state,
        priority=EventPriority.HIGH if event_type in [
            EventType.RESERVATION_CREATED,
            EventType.RESERVATION_CANCELLED
        ] else EventPriority.NORMAL
    )


def create_rate_event(
    tenant_id: str,
    event_type: EventType,
    rate_data: Dict[str, Any],
    source_system: str
) -> DataHubEvent:
    """Helper to create rate events"""
    return DataHubEvent(
        event_type=event_type,
        tenant_id=tenant_id,
        source=EventSource(
            system=source_system,
            module="datahub"
        ),
        entity_type="rate",
        entity_id=rate_data.get("id", ""),
        payload=rate_data,
        priority=EventPriority.NORMAL
    )


def create_sync_event(
    tenant_id: str,
    connector_id: str,
    success: bool,
    sync_details: Dict[str, Any]
) -> DataHubEvent:
    """Helper to create sync completion events"""
    return DataHubEvent(
        event_type=EventType.SYNC_COMPLETED if success else EventType.SYNC_FAILED,
        tenant_id=tenant_id,
        source=EventSource(
            system="datahub",
            module="connector",
            connector_id=connector_id
        ),
        entity_type="sync",
        entity_id=sync_details.get("sync_id", ""),
        payload=sync_details,
        priority=EventPriority.LOW
    )


__all__ = [
    "EventType", "EventPriority", "EventStatus",
    "EventSource", "EventTarget", "DataHubEvent",
    "EventSubscription", "EventQueueItem", "DeadLetterEvent",
    "create_reservation_event", "create_rate_event", "create_sync_event",
]
