"""
Flowtym Data Hub - Models Package
"""

from .universal import (
    UNIVERSAL_SCHEMA_VERSION,
    ReservationStatus, PaymentStatus, GuestType, ChannelType,
    RoomStatus, RateType, MealPlan, SourceSystem, TransactionType,
    TransformationLogEntry, UniversalBase,
    ContactInfo, IdentityDocument, LoyaltyInfo, UniversalGuest,
    RoomAmenity, BedConfiguration, UniversalRoom,
    ReservationGuest, ReservationRoom, ReservationPayment,
    ReservationModification, UniversalReservation,
    RateRestriction, DailyRate, UniversalRate,
    DailyAvailability, UniversalAvailability,
    UniversalTransaction,
    CompetitorPrice, UniversalMarketData,
)

from .connectors import (
    ConnectorType, ConnectorStatus, SyncStatus, SyncDirection,
    WebhookStatus, AuthType, ConnectorAuth,
    SyncRecord, SyncSchedule, WebhookSubscription,
    ConnectorCapabilities, ConnectorConfig, ConnectorDefinition, ConnectorState,
)

from .events import (
    EventType, EventPriority, EventStatus,
    EventSource, EventTarget, DataHubEvent,
    EventSubscription, EventQueueItem, DeadLetterEvent,
    create_reservation_event, create_rate_event, create_sync_event,
)


__all__ = [
    # Universal
    "UNIVERSAL_SCHEMA_VERSION",
    "ReservationStatus", "PaymentStatus", "GuestType", "ChannelType",
    "RoomStatus", "RateType", "MealPlan", "SourceSystem", "TransactionType",
    "TransformationLogEntry", "UniversalBase",
    "ContactInfo", "IdentityDocument", "LoyaltyInfo", "UniversalGuest",
    "RoomAmenity", "BedConfiguration", "UniversalRoom",
    "ReservationGuest", "ReservationRoom", "ReservationPayment",
    "ReservationModification", "UniversalReservation",
    "RateRestriction", "DailyRate", "UniversalRate",
    "DailyAvailability", "UniversalAvailability",
    "UniversalTransaction",
    "CompetitorPrice", "UniversalMarketData",
    
    # Connectors
    "ConnectorType", "ConnectorStatus", "SyncStatus", "SyncDirection",
    "WebhookStatus", "AuthType", "ConnectorAuth",
    "SyncRecord", "SyncSchedule", "WebhookSubscription",
    "ConnectorCapabilities", "ConnectorConfig", "ConnectorDefinition", "ConnectorState",
    
    # Events
    "EventType", "EventPriority", "EventStatus",
    "EventSource", "EventTarget", "DataHubEvent",
    "EventSubscription", "EventQueueItem", "DeadLetterEvent",
    "create_reservation_event", "create_rate_event", "create_sync_event",
]
