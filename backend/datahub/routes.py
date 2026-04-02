"""
Flowtym Data Hub - API Routes

This module provides the internal API endpoints for the Data Hub.
These APIs allow Flowtym modules (PMS, RMS, CRM) to interact with
centralized, normalized data.

Endpoints:
- /api/datahub/connectors - Connector management
- /api/datahub/reservations - Unified reservation access
- /api/datahub/guests - Unified guest/customer access
- /api/datahub/rates - Unified rate access
- /api/datahub/availability - Unified availability access
- /api/datahub/sync - Trigger sync operations
- /api/datahub/config-integration - Configuration module integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging
import uuid

from .models import (
    ConnectorConfig,
    ConnectorStatus,
    ConnectorType,
    SyncRecord,
    SyncStatus,
    UniversalReservation,
    UniversalGuest,
    UniversalRate,
    ChannelType,
    ReservationStatus,
    SourceSystem,
    EventType,
    DataHubEvent,
    create_reservation_event,
)
from .connectors import (
    ConnectorRegistry,
    BaseConnector,
    MewsConnector,
    BookingComConnector,
    DEdgeConnector,
    StripeConnector,
    LighthouseConnector,
)
from .engines import get_normalization_engine

# Import shared ConfigService for Configuration integration
try:
    from shared.config_service import get_config_service
    HAS_CONFIG_SERVICE = True
except ImportError:
    HAS_CONFIG_SERVICE = False


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datahub", tags=["Data Hub"])


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectorConfigCreate(BaseModel):
    """Request to create/update a connector configuration"""
    connector_name: str
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    external_hotel_id: Optional[str] = None
    external_property_code: Optional[str] = None
    environment: str = "production"
    sync_interval_minutes: int = 15
    priority: int = 50
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConnectorStatusResponse(BaseModel):
    """Response with connector status"""
    connector_id: str
    connector_name: str
    display_name: str
    connector_type: str
    status: str
    is_connected: bool
    last_sync_at: Optional[str] = None
    last_error: Optional[str] = None
    sync_success_rate: float = 0.0
    capabilities: Dict[str, bool] = Field(default_factory=dict)


class SyncRequest(BaseModel):
    """Request to trigger a sync operation"""
    connector_name: str
    entity_type: str = "reservations"  # reservations, guests, rates, availability
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    full_sync: bool = False


class SyncResponse(BaseModel):
    """Response from a sync operation"""
    sync_id: str
    connector_name: str
    entity_type: str
    status: str
    total_records: int
    processed_records: int
    created_records: int
    updated_records: int
    failed_records: int
    duration_ms: Optional[int] = None
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class ReservationListResponse(BaseModel):
    """Response with list of reservations"""
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    has_more: bool


class DataHubStats(BaseModel):
    """Data Hub statistics"""
    total_reservations: int = 0
    total_guests: int = 0
    active_connectors: int = 0
    total_connectors: int = 0
    syncs_last_24h: int = 0
    failed_syncs_last_24h: int = 0
    last_sync_at: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# IN-MEMORY STORAGE (will be replaced with MongoDB in production)
# ═══════════════════════════════════════════════════════════════════════════════

# Temporary storage for demo/testing
_connector_configs: Dict[str, Dict[str, ConnectorConfig]] = {}  # tenant_id -> connector_name -> config
_reservations: Dict[str, Dict[str, UniversalReservation]] = {}  # tenant_id -> reservation_id -> reservation
_guests: Dict[str, Dict[str, UniversalGuest]] = {}  # tenant_id -> guest_id -> guest
_sync_history: Dict[str, List[SyncRecord]] = {}  # tenant_id -> list of sync records
_events: Dict[str, List[DataHubEvent]] = {}  # tenant_id -> list of events


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_connector_instance(tenant_id: str, connector_name: str) -> BaseConnector:
    """Get or create a connector instance"""
    
    # Get config
    configs = _connector_configs.get(tenant_id, {})
    config = configs.get(connector_name)
    
    if not config:
        # Create default config
        connector_class = ConnectorRegistry.get_connector_class(connector_name)
        if not connector_class:
            raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_name}")
        
        config = ConnectorConfig(
            tenant_id=tenant_id,
            connector_type=connector_class.CONNECTOR_TYPE,
            connector_name=connector_name,
            display_name=connector_class.DISPLAY_NAME,
        )
    
    return ConnectorRegistry.create_connector(connector_name, config)


def emit_event(event: DataHubEvent):
    """Emit an event to the event bus (simple in-memory for now)"""
    if event.tenant_id not in _events:
        _events[event.tenant_id] = []
    _events[event.tenant_id].append(event)
    logger.info(f"Event emitted: {event.event_type.value} for entity {event.entity_id}")


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/connectors/available")
async def list_available_connectors():
    """List all available connectors in the registry"""
    return {
        "connectors": ConnectorRegistry.list_connectors(),
        "total": len(ConnectorRegistry._connectors)
    }


@router.get("/hotels/{hotel_id}/connectors")
async def list_hotel_connectors(hotel_id: str):
    """List connectors configured for a hotel"""
    configs = _connector_configs.get(hotel_id, {})
    
    connectors = []
    for name, config in configs.items():
        connector = get_connector_instance(hotel_id, name)
        connectors.append({
            "connector_id": config.id,
            "connector_name": config.connector_name,
            "display_name": config.display_name,
            "connector_type": config.connector_type.value,
            "status": connector.status.value,
            "is_connected": connector.is_connected,
            "last_sync_at": config.last_sync_at.isoformat() if config.last_sync_at else None,
            "priority": config.priority,
        })
    
    return {
        "hotel_id": hotel_id,
        "connectors": connectors,
        "total": len(connectors)
    }


@router.post("/hotels/{hotel_id}/connectors")
async def configure_connector(hotel_id: str, request: ConnectorConfigCreate):
    """Configure a connector for a hotel"""
    
    # Validate connector exists
    connector_class = ConnectorRegistry.get_connector_class(request.connector_name)
    if not connector_class:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {request.connector_name}")
    
    # Create config
    from .models.connectors import ConnectorAuth
    
    config = ConnectorConfig(
        tenant_id=hotel_id,
        connector_type=connector_class.CONNECTOR_TYPE,
        connector_name=request.connector_name,
        display_name=request.display_name or connector_class.DISPLAY_NAME,
        auth=ConnectorAuth(
            api_key=request.api_key,
            api_secret=request.api_secret,
        ),
        external_hotel_id=request.external_hotel_id,
        external_property_code=request.external_property_code,
        environment=request.environment,
        priority=request.priority,
        metadata=request.metadata,
    )
    config.sync_schedule.interval_minutes = request.sync_interval_minutes
    
    # Store config
    if hotel_id not in _connector_configs:
        _connector_configs[hotel_id] = {}
    _connector_configs[hotel_id][request.connector_name] = config
    
    return {
        "message": f"Connector {request.connector_name} configured successfully",
        "connector_id": config.id,
        "status": "disconnected"
    }


@router.post("/hotels/{hotel_id}/connectors/{connector_name}/connect")
async def connect_connector(hotel_id: str, connector_name: str):
    """Connect a connector"""
    connector = get_connector_instance(hotel_id, connector_name)
    
    try:
        success = await connector.connect()
        if success:
            return {
                "message": f"Connected to {connector_name}",
                "status": "connected"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to connect: {connector._last_error}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hotels/{hotel_id}/connectors/{connector_name}/disconnect")
async def disconnect_connector(hotel_id: str, connector_name: str):
    """Disconnect a connector"""
    connector = get_connector_instance(hotel_id, connector_name)
    await connector.disconnect()
    return {"message": f"Disconnected from {connector_name}", "status": "disconnected"}


@router.get("/hotels/{hotel_id}/connectors/{connector_name}/test")
async def test_connector(hotel_id: str, connector_name: str):
    """Test a connector connection"""
    connector = get_connector_instance(hotel_id, connector_name)
    result = await connector.test_connection()
    return result


@router.get("/hotels/{hotel_id}/connectors/{connector_name}/health")
async def health_check_connector(hotel_id: str, connector_name: str):
    """Health check for a connector"""
    connector = get_connector_instance(hotel_id, connector_name)
    return await connector.health_check()


# ═══════════════════════════════════════════════════════════════════════════════
# SYNC ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/sync", response_model=SyncResponse)
async def trigger_sync(hotel_id: str, request: SyncRequest):
    """Trigger a sync operation for a connector"""
    
    connector = get_connector_instance(hotel_id, request.connector_name)
    
    # Connect if not connected
    if not connector.is_connected:
        await connector.connect()
    
    # Determine date range
    from_date = request.from_date or datetime.now().strftime("%Y-%m-%d")
    to_date = request.to_date or (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    
    logger.info(f"Starting sync: {request.connector_name} / {request.entity_type} for hotel {hotel_id}")
    
    # Perform sync based on entity type
    if request.entity_type == "reservations":
        sync_record = await connector.sync_reservations(
            from_date=from_date,
            to_date=to_date,
            full_sync=request.full_sync
        )
        
        # Store normalized reservations
        result = await connector.fetch_reservations(from_date, to_date)
        if hotel_id not in _reservations:
            _reservations[hotel_id] = {}
        
        for raw in result.get("data", []):
            try:
                normalized = connector.normalize_reservation(raw)
                _reservations[hotel_id][normalized.id] = normalized
                
                # Emit event
                event = create_reservation_event(
                    tenant_id=hotel_id,
                    event_type=EventType.RESERVATION_CREATED,
                    reservation_data=normalized.model_dump(),
                    source_system=connector.SOURCE_SYSTEM.value
                )
                emit_event(event)
                
            except Exception as e:
                logger.error(f"Failed to normalize reservation: {e}")
    
    elif request.entity_type == "guests":
        result = await connector.fetch_guests()
        if hotel_id not in _guests:
            _guests[hotel_id] = {}
        
        for raw in result.get("data", []):
            try:
                normalized = connector.normalize_guest(raw)
                _guests[hotel_id][normalized.id] = normalized
            except Exception as e:
                logger.error(f"Failed to normalize guest: {e}")
        
        sync_record = SyncRecord(
            direction="inbound",
            entity_type="guests",
            status=SyncStatus.SUCCESS,
            total_records=len(result.get("data", [])),
            processed_records=len(_guests.get(hotel_id, {}))
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported entity type: {request.entity_type}")
    
    # Store sync record
    if hotel_id not in _sync_history:
        _sync_history[hotel_id] = []
    _sync_history[hotel_id].append(sync_record)
    
    # Update connector config
    if hotel_id in _connector_configs and request.connector_name in _connector_configs[hotel_id]:
        _connector_configs[hotel_id][request.connector_name].last_sync_at = datetime.utcnow()
        _connector_configs[hotel_id][request.connector_name].last_sync_status = sync_record.status
    
    return SyncResponse(
        sync_id=sync_record.sync_id,
        connector_name=request.connector_name,
        entity_type=request.entity_type,
        status=sync_record.status.value,
        total_records=sync_record.total_records,
        processed_records=sync_record.processed_records,
        created_records=sync_record.created_records,
        updated_records=sync_record.updated_records,
        failed_records=sync_record.failed_records,
        duration_ms=sync_record.duration_ms,
        errors=sync_record.errors[:5]  # Limit errors in response
    )


@router.get("/hotels/{hotel_id}/sync/history")
async def get_sync_history(
    hotel_id: str,
    connector_name: Optional[str] = None,
    limit: int = Query(default=20, le=100)
):
    """Get sync history for a hotel"""
    history = _sync_history.get(hotel_id, [])
    
    # Filter by connector if specified
    if connector_name:
        # We'd need to store connector_name in SyncRecord for proper filtering
        pass
    
    # Return most recent first
    history = sorted(history, key=lambda x: x.started_at, reverse=True)[:limit]
    
    return {
        "hotel_id": hotel_id,
        "syncs": [
            {
                "sync_id": s.sync_id,
                "entity_type": s.entity_type,
                "status": s.status.value,
                "total_records": s.total_records,
                "processed_records": s.processed_records,
                "failed_records": s.failed_records,
                "started_at": s.started_at.isoformat(),
                "duration_ms": s.duration_ms,
            }
            for s in history
        ],
        "total": len(history)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RESERVATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/reservations")
async def list_reservations(
    hotel_id: str,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100)
):
    """List reservations from the Data Hub"""
    
    reservations = list(_reservations.get(hotel_id, {}).values())
    
    # Apply filters
    if status:
        reservations = [r for r in reservations if r.status.value == status]
    
    if channel:
        reservations = [r for r in reservations if r.channel.value == channel]
    
    if from_date:
        reservations = [r for r in reservations if r.check_in_date >= from_date]
    
    if to_date:
        reservations = [r for r in reservations if r.check_out_date <= to_date]
    
    # Sort by check_in_date
    reservations = sorted(reservations, key=lambda x: x.check_in_date)
    
    # Pagination
    total = len(reservations)
    start = (page - 1) * page_size
    end = start + page_size
    reservations = reservations[start:end]
    
    return {
        "data": [
            {
                "id": r.id,
                "confirmation_number": r.confirmation_number,
                "channel": r.channel.value,
                "status": r.status.value,
                "check_in_date": r.check_in_date,
                "check_out_date": r.check_out_date,
                "nights": r.nights,
                "total_adults": r.total_adults,
                "total_children": r.total_children,
                "total_amount": r.total_amount,
                "currency": r.currency,
                "source_system": r.source_system.value,
                "guest_name": f"{r.guests[0].first_name} {r.guests[0].last_name}" if r.guests else "N/A",
                "created_at": r.created_at.isoformat(),
            }
            for r in reservations
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total
    }


@router.get("/hotels/{hotel_id}/reservations/{reservation_id}")
async def get_reservation(hotel_id: str, reservation_id: str):
    """Get a single reservation with full details"""
    
    reservations = _reservations.get(hotel_id, {})
    reservation = reservations.get(reservation_id)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return reservation.model_dump()


# ═══════════════════════════════════════════════════════════════════════════════
# GUEST ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/guests")
async def list_guests(
    hotel_id: str,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100)
):
    """List guests from the Data Hub"""
    
    guests = list(_guests.get(hotel_id, {}).values())
    
    # Search filter
    if search:
        search_lower = search.lower()
        guests = [
            g for g in guests
            if search_lower in g.full_name.lower() or
               (g.contact.email and search_lower in g.contact.email.lower())
        ]
    
    # Sort by name
    guests = sorted(guests, key=lambda x: x.full_name)
    
    # Pagination
    total = len(guests)
    start = (page - 1) * page_size
    end = start + page_size
    guests = guests[start:end]
    
    return {
        "data": [
            {
                "id": g.id,
                "full_name": g.full_name,
                "email": g.contact.email,
                "phone": g.contact.phone,
                "country": g.contact.country,
                "guest_type": g.guest_type.value,
                "total_stays": g.total_stays,
                "total_revenue": g.total_revenue,
                "source_system": g.source_system.value,
            }
            for g in guests
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total
    }


# ═══════════════════════════════════════════════════════════════════════════════
# STATS & DASHBOARD ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/stats")
async def get_datahub_stats(hotel_id: str):
    """Get Data Hub statistics for a hotel"""
    
    reservations = _reservations.get(hotel_id, {})
    guests = _guests.get(hotel_id, {})
    connectors = _connector_configs.get(hotel_id, {})
    sync_history = _sync_history.get(hotel_id, [])
    
    # Count active connectors
    active_connectors = sum(
        1 for c in connectors.values()
        if c.status == ConnectorStatus.CONNECTED
    )
    
    # Count recent syncs
    now = datetime.utcnow()
    syncs_24h = [s for s in sync_history if (now - s.started_at).total_seconds() < 86400]
    failed_24h = [s for s in syncs_24h if s.status == SyncStatus.FAILED]
    
    # Last sync
    last_sync = max(sync_history, key=lambda x: x.started_at) if sync_history else None
    
    return {
        "hotel_id": hotel_id,
        "total_reservations": len(reservations),
        "total_guests": len(guests),
        "active_connectors": active_connectors,
        "total_connectors": len(connectors),
        "syncs_last_24h": len(syncs_24h),
        "failed_syncs_last_24h": len(failed_24h),
        "last_sync_at": last_sync.started_at.isoformat() if last_sync else None,
        "reservations_by_channel": _count_by_channel(reservations),
        "reservations_by_status": _count_by_status(reservations),
    }


def _count_by_channel(reservations: Dict[str, UniversalReservation]) -> Dict[str, int]:
    """Count reservations by channel"""
    counts = {}
    for r in reservations.values():
        channel = r.channel.value
        counts[channel] = counts.get(channel, 0) + 1
    return counts


def _count_by_status(reservations: Dict[str, UniversalReservation]) -> Dict[str, int]:
    """Count reservations by status"""
    counts = {}
    for r in reservations.values():
        status = r.status.value
        counts[status] = counts.get(status, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════════
# EVENTS ENDPOINTS (Preview for Phase 2)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/events")
async def list_events(
    hotel_id: str,
    event_type: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """List recent events (preview for Event Bus)"""
    
    events = _events.get(hotel_id, [])
    
    if event_type:
        events = [e for e in events if e.event_type.value == event_type]
    
    # Most recent first
    events = sorted(events, key=lambda x: x.created_at, reverse=True)[:limit]
    
    return {
        "hotel_id": hotel_id,
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type.value,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "priority": e.priority.value,
                "status": e.status.value,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ],
        "total": len(events)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MARKET DATA ENDPOINTS (from Lighthouse)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/market/competitors")
async def get_competitor_rates(
    hotel_id: str,
    from_date: str,
    to_date: str
):
    """Get competitor rates from rate shopping"""
    
    connector = get_connector_instance(hotel_id, "lighthouse")
    await connector.connect()
    
    result = await connector.fetch_competitor_rates(from_date, to_date)
    return result


@router.get("/hotels/{hotel_id}/market/demand")
async def get_market_demand(
    hotel_id: str,
    from_date: str,
    to_date: str
):
    """Get market demand forecast"""
    
    connector = get_connector_instance(hotel_id, "lighthouse")
    await connector.connect()
    
    result = await connector.fetch_market_demand(from_date, to_date)
    return result


@router.get("/hotels/{hotel_id}/market/parity")
async def get_rate_parity(hotel_id: str):
    """Get rate parity status across channels"""
    
    connector = get_connector_instance(hotel_id, "lighthouse")
    await connector.connect()
    
    result = await connector.fetch_rate_parity()
    return result



# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION INTEGRATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/config-integration")
async def get_config_integration_data(hotel_id: str):
    """
    Get configuration data from the central Configuration module.
    
    This provides Data Hub with:
    - Room types (for OTA mapping)
    - Rate plans (for distribution)
    - Hotel profile (name, timezone, currency)
    - Check-in/out times
    
    Use this data when:
    - Setting up connector mappings
    - Normalizing external reservations
    - Distributing rates to channels
    """
    if not HAS_CONFIG_SERVICE:
        raise HTTPException(
            status_code=501, 
            detail="Configuration service not available"
        )
    
    try:
        config_service = get_config_service()
        
        # Get configuration data needed for Data Hub
        hotel_profile = await config_service.get_hotel_profile(hotel_id)
        room_types = await config_service.get_room_types(hotel_id)
        rate_plans = await config_service.get_rate_plans(hotel_id)
        check_times = await config_service.get_check_times(hotel_id)
        
        return {
            "hotel_id": hotel_id,
            "source": "configuration_module",
            "hotel": {
                "name": hotel_profile.get("name") if hotel_profile else None,
                "currency": hotel_profile.get("currency", "EUR") if hotel_profile else "EUR",
                "timezone": hotel_profile.get("timezone", "Europe/Paris") if hotel_profile else "Europe/Paris"
            },
            "check_times": check_times,
            "room_types": [
                {
                    "id": rt["id"],
                    "code": rt["code"],
                    "name": rt["name"],
                    "name_en": rt.get("name_en"),
                    "category": rt.get("category"),
                    "max_occupancy": rt.get("max_occupancy", 2),
                    "base_price": rt.get("base_price", 100),
                    "ota_mappings": rt.get("ota_mappings", {})
                }
                for rt in room_types
            ],
            "rate_plans": [
                {
                    "id": rp["id"],
                    "code": rp["code"],
                    "name": rp["name"],
                    "rate_type": rp.get("rate_type"),
                    "meal_plan": rp.get("meal_plan"),
                    "channels": rp.get("channels", []),
                    "is_public": rp.get("is_public", True),
                    "ota_mappings": rp.get("ota_mappings", {})
                }
                for rp in rate_plans
            ],
            "synced_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@router.get("/hotels/{hotel_id}/room-type-mapping/{ota_code}")
async def get_room_type_ota_mapping(hotel_id: str, ota_code: str):
    """
    Get room type mappings for a specific OTA/connector.
    
    Args:
        hotel_id: Hotel tenant ID
        ota_code: OTA identifier (e.g., 'booking_com', 'expedia', 'mews')
    
    Returns:
        Mapping of internal room type IDs to OTA room type codes
    """
    if not HAS_CONFIG_SERVICE:
        # Return empty mapping if service not available
        return {
            "hotel_id": hotel_id,
            "ota_code": ota_code,
            "source": "fallback",
            "mapping": {}
        }
    
    try:
        config_service = get_config_service()
        mapping = await config_service.get_ota_room_type_mapping(hotel_id, ota_code)
        
        return {
            "hotel_id": hotel_id,
            "ota_code": ota_code,
            "source": "configuration_module",
            "mapping": mapping
        }
    except Exception as e:
        logger.error(f"Failed to get OTA mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotels/{hotel_id}/rate-plan-mapping/{ota_code}")
async def get_rate_plan_ota_mapping(hotel_id: str, ota_code: str):
    """
    Get rate plan mappings for a specific OTA/connector.
    
    Args:
        hotel_id: Hotel tenant ID
        ota_code: OTA identifier
    
    Returns:
        Mapping of internal rate plan IDs to OTA rate codes
    """
    if not HAS_CONFIG_SERVICE:
        return {
            "hotel_id": hotel_id,
            "ota_code": ota_code,
            "source": "fallback",
            "mapping": {}
        }
    
    try:
        config_service = get_config_service()
        mapping = await config_service.get_ota_rate_plan_mapping(hotel_id, ota_code)
        
        return {
            "hotel_id": hotel_id,
            "ota_code": ota_code,
            "source": "configuration_module",
            "mapping": mapping
        }
    except Exception as e:
        logger.error(f"Failed to get rate plan mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hotels/{hotel_id}/sync-room-type-mapping")
async def sync_room_type_mapping(
    hotel_id: str,
    ota_code: str,
    mapping: Dict[str, str]
):
    """
    Sync room type OTA mapping back to Configuration module.
    
    This allows Data Hub to update the room type OTA mappings
    after configuring a connector.
    
    Args:
        hotel_id: Hotel tenant ID
        ota_code: OTA identifier
        mapping: {room_type_id: ota_room_code}
    """
    if not HAS_CONFIG_SERVICE:
        raise HTTPException(status_code=501, detail="Configuration service not available")
    
    try:
        config_service = get_config_service()
        
        # Update each room type's OTA mapping
        for room_type_id, ota_room_code in mapping.items():
            await config_service.db.config_room_types.update_one(
                {"id": room_type_id, "tenant_id": hotel_id},
                {"$set": {f"ota_mappings.{ota_code}": ota_room_code}}
            )
        
        return {
            "status": "success",
            "hotel_id": hotel_id,
            "ota_code": ota_code,
            "mappings_updated": len(mapping)
        }
    except Exception as e:
        logger.error(f"Failed to sync mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotels/{hotel_id}/pricing-for-distribution")
async def get_pricing_for_distribution(hotel_id: str):
    """
    Get complete pricing data for channel distribution.
    
    This combines Configuration data with the pricing matrix
    to provide all information needed for pushing rates to OTAs.
    
    Returns:
        Room types, rate plans, and calculated prices per room type/rate
    """
    if not HAS_CONFIG_SERVICE:
        raise HTTPException(status_code=501, detail="Configuration service not available")
    
    try:
        config_service = get_config_service()
        
        room_types = await config_service.get_room_types(hotel_id)
        rate_plans = await config_service.get_rate_plans(hotel_id)
        pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
        hotel_profile = await config_service.get_hotel_profile(hotel_id)
        
        # Build distribution-ready data
        distribution_data = []
        
        for rt in room_types:
            rt_data = {
                "room_type_id": rt["id"],
                "room_type_code": rt["code"],
                "room_type_name": rt["name"],
                "base_price": rt.get("base_price", 100),
                "rates": []
            }
            
            for rp in rate_plans:
                # Only include public rates for distribution
                if not rp.get("is_public", True):
                    continue
                
                price = pricing_matrix.get(rp["code"], {}).get(rt["code"], rt.get("base_price", 100))
                
                rt_data["rates"].append({
                    "rate_plan_id": rp["id"],
                    "rate_plan_code": rp["code"],
                    "rate_plan_name": rp["name"],
                    "meal_plan": rp.get("meal_plan", "room_only"),
                    "price": price,
                    "currency": hotel_profile.get("currency", "EUR") if hotel_profile else "EUR"
                })
            
            distribution_data.append(rt_data)
        
        return {
            "hotel_id": hotel_id,
            "currency": hotel_profile.get("currency", "EUR") if hotel_profile else "EUR",
            "room_types_count": len(room_types),
            "rate_plans_count": len(rate_plans),
            "distribution_data": distribution_data,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get pricing for distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# DATA HUB PHASE 2 — Priority Engine, Quality Engine, Smart Cache, Event Bus
# Branchement des engines existants dans les routes du Data Hub
# ═══════════════════════════════════════════════════════════════════════════════

# Initialisation lazy des engines (singleton par application)
_quality_engine = None
_priority_engine = None
_smart_cache = None

def _get_quality_engine():
    global _quality_engine
    if _quality_engine is None:
        from .engines.quality import DataQualityEngine
        _quality_engine = DataQualityEngine()
    return _quality_engine

def _get_priority_engine():
    global _priority_engine
    if _priority_engine is None:
        from .engines.priority import SourcePriorityEngine
        _priority_engine = SourcePriorityEngine()
    return _priority_engine

def _get_smart_cache():
    global _smart_cache
    if _smart_cache is None:
        from .engines.cache import SmartCache
        _smart_cache = SmartCache(max_size=5000)
    return _smart_cache


# ─── 1. QUALITY ENGINE ───────────────────────────────────────────────────────

@router.post("/hotels/{hotel_id}/quality/assess")
async def assess_data_quality(
    hotel_id: str,
    entity_type: str = Query(..., description="reservation | guest | rate"),
    entity_id: Optional[str] = Query(None, description="ID spécifique ou None pour tout évaluer"),
):
    """
    Évalue la qualité des données d'un hôtel pour un type d'entité donné.
    Retourne un rapport avec score 0-1, problèmes détectés et suggestions.
    """
    engine = _get_quality_engine()

    if entity_type == "reservation":
        entities = list(_reservations.get(hotel_id, {}).values())
        if entity_id:
            entities = [e for e in entities if e.id == entity_id]
    elif entity_type == "guest":
        entities = list(_guests.get(hotel_id, {}).values())
        if entity_id:
            entities = [e for e in entities if e.id == entity_id]
    else:
        raise HTTPException(status_code=400, detail="entity_type doit être 'reservation' ou 'guest'")

    if not entities:
        return {
            "hotel_id": hotel_id,
            "entity_type": entity_type,
            "assessed_count": 0,
            "average_quality_score": 1.0,
            "reports": [],
            "message": "Aucune entité à évaluer. Lancez une synchronisation d'abord."
        }

    reports = []
    total_score = 0.0

    for entity in entities[:100]:  # Limite 100 pour la performance
        data = entity.model_dump() if hasattr(entity, "model_dump") else dict(entity)

        required_fields = {
            "reservation": ["id", "check_in_date", "check_out_date", "guest_id", "channel"],
            "guest": ["id", "email", "first_name", "last_name"],
        }.get(entity_type, [])

        report = engine.assess_quality(
            data=data,
            entity_type=entity_type,
            entity_id=data.get("id", "unknown"),
            tenant_id=hotel_id,
            required_fields=required_fields,
        )

        total_score += report.quality_score
        reports.append({
            "entity_id": data.get("id"),
            "quality_score": round(report.quality_score, 3),
            "issues_count": len(report.issues),
            "critical_issues": [
                {"field": i.field, "message": i.message}
                for i in report.issues
                if i.severity.value in ("critical", "error")
            ][:5],
            "requires_review": report.requires_review,
        })

    avg_score = total_score / len(entities) if entities else 1.0

    return {
        "hotel_id": hotel_id,
        "entity_type": entity_type,
        "assessed_count": len(entities),
        "average_quality_score": round(avg_score, 3),
        "quality_grade": "A" if avg_score >= 0.9 else "B" if avg_score >= 0.75 else "C" if avg_score >= 0.5 else "D",
        "reports": reports[:20],
    }


@router.get("/hotels/{hotel_id}/quality/score")
async def get_quality_score(hotel_id: str):
    """
    Score de qualité globale des données d'un hôtel — dashboard rapide.
    """
    reservations = list(_reservations.get(hotel_id, {}).values())
    guests = list(_guests.get(hotel_id, {}).values())
    engine = _get_quality_engine()

    scores = {"reservation": None, "guest": None}

    for entity_type, entities in [("reservation", reservations), ("guest", guests)]:
        if not entities:
            continue
        sample = entities[:50]
        total = 0.0
        req = {"reservation": ["id", "check_in_date", "check_out_date"], "guest": ["id", "email"]}
        for e in sample:
            data = e.model_dump() if hasattr(e, "model_dump") else dict(e)
            r = engine.assess_quality(data, entity_type, data.get("id", ""), hotel_id, req[entity_type])
            total += r.quality_score
        scores[entity_type] = round(total / len(sample), 3)

    overall = round(
        sum(v for v in scores.values() if v is not None) / max(len([v for v in scores.values() if v is not None]), 1),
        3
    )

    return {
        "hotel_id": hotel_id,
        "overall_quality_score": overall,
        "by_entity_type": scores,
        "reservations_count": len(reservations),
        "guests_count": len(guests),
        "quality_grade": "A" if overall >= 0.9 else "B" if overall >= 0.75 else "C" if overall >= 0.5 else "D",
        "assessed_at": datetime.utcnow().isoformat(),
    }


# ─── 2. PRIORITY ENGINE ──────────────────────────────────────────────────────

@router.post("/hotels/{hotel_id}/priority/resolve-conflict")
async def resolve_data_conflict(
    hotel_id: str,
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    source_a: str = Query(..., description="Ex: mews, booking_com, pms"),
    source_b: str = Query(..., description="Ex: dedge, channel_manager"),
    strategy: str = Query("highest_priority", description="highest_priority | most_recent | merge"),
):
    """
    Résout un conflit de données entre deux sources pour une entité.
    Utilise le Priority Engine (hiérarchie PMS > Direct > RMS > Channel > OTA).
    """
    engine = _get_priority_engine()

    # Récupérer les données des deux sources
    all_entities = {
        "reservation": _reservations.get(hotel_id, {}),
        "guest": _guests.get(hotel_id, {}),
    }.get(entity_type, {})

    entity = all_entities.get(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Entité {entity_id} non trouvée")

    data = entity.model_dump() if hasattr(entity, "model_dump") else dict(entity)

    # Construire deux variantes simulées depuis les sources
    variant_a = {**data, "_source": source_a, "_updated_at": datetime.utcnow().isoformat()}
    variant_b = {**data, "_source": source_b, "_updated_at": datetime.utcnow().isoformat()}

    from .engines.priority import ConflictResolutionStrategy
    strat_map = {
        "highest_priority": ConflictResolutionStrategy.HIGHEST_PRIORITY,
        "most_recent": ConflictResolutionStrategy.MOST_RECENT,
        "merge": ConflictResolutionStrategy.MERGE,
    }

    resolution = engine.resolve_conflict(
        entity_type=entity_type,
        entity_id=entity_id,
        data_a=variant_a,
        data_b=variant_b,
        source_a=source_a,
        source_b=source_b,
        strategy=strat_map.get(strategy, ConflictResolutionStrategy.HIGHEST_PRIORITY),
    )

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "winning_source": source_a if resolution.auto_resolved else source_b,
        "strategy_used": strategy,
        "conflicts_found": len(resolution.conflicts),
        "auto_resolved": resolution.auto_resolved,
        "requires_review": resolution.requires_review,
        "merged_fields_count": len(resolution.merged_data),
        "resolution_timestamp": resolution.resolution_timestamp.isoformat(),
    }


@router.get("/hotels/{hotel_id}/priority/source-hierarchy")
async def get_source_hierarchy(hotel_id: str):
    """
    Retourne la hiérarchie de priorité des sources de données configurée.
    """
    from .config import SOURCE_PRIORITY
    return {
        "hotel_id": hotel_id,
        "source_hierarchy": [
            {"source": k, "priority": v, "rank": i + 1}
            for i, (k, v) in enumerate(sorted(SOURCE_PRIORITY.items(), key=lambda x: -x[1]))
        ],
        "description": "Plus la priorité est élevée, plus la source fait autorité en cas de conflit."
    }


# ─── 3. SMART CACHE ──────────────────────────────────────────────────────────

@router.get("/hotels/{hotel_id}/cache/stats")
async def get_cache_stats(hotel_id: str):
    """
    Statistiques du cache intelligent du Data Hub (hits, misses, taux, taille).
    """
    cache = _get_smart_cache()
    stats = cache.get_stats()

    return {
        "hotel_id": hotel_id,
        "cache_stats": {
            "total_entries": stats.total_entries,
            "total_size_bytes": stats.total_size_bytes,
            "hit_count": stats.hit_count,
            "miss_count": stats.miss_count,
            "hit_rate": round(stats.hit_rate, 3),
            "eviction_count": stats.eviction_count,
            "oldest_entry_age_seconds": stats.oldest_entry_age_seconds,
        },
        "tenant_entries": len([
            k for k in cache._entries
            if hotel_id in k
        ]),
        "performance_grade": (
            "Excellent" if stats.hit_rate >= 0.8
            else "Bon" if stats.hit_rate >= 0.6
            else "À optimiser"
        ),
    }


@router.post("/hotels/{hotel_id}/cache/invalidate")
async def invalidate_cache(
    hotel_id: str,
    entity_type: Optional[str] = Query(None, description="reservation | guest | rate | None=tout"),
):
    """
    Invalide le cache pour un hôtel (optionnellement filtré par type d'entité).
    Déclencher après une synchronisation forcée ou une mise à jour manuelle.
    """
    cache = _get_smart_cache()

    if entity_type:
        count = cache.invalidate_entity_type(entity_type, hotel_id)
        message = f"Cache invalidé pour {entity_type} (hôtel {hotel_id})"
    else:
        count = cache.invalidate_tenant(hotel_id)
        message = f"Cache entièrement invalidé pour l'hôtel {hotel_id}"

    return {
        "hotel_id": hotel_id,
        "entity_type": entity_type,
        "entries_invalidated": count,
        "message": message,
        "invalidated_at": datetime.utcnow().isoformat(),
    }


@router.post("/hotels/{hotel_id}/cache/warm-up")
async def warm_up_cache(hotel_id: str):
    """
    Pré-charge le cache avec les données fréquemment accédées :
    réservations en cours + 30j, clients actifs.
    """
    cache = _get_smart_cache()
    warmed = 0

    # Warm-up réservations
    reservations = list(_reservations.get(hotel_id, {}).values())
    for res in reservations[:500]:
        key_data = {"hotel_id": hotel_id, "entity_type": "reservation", "id": res.id}
        data = res.model_dump() if hasattr(res, "model_dump") else dict(res)
        cache.set(key_data, data, entity_type="reservation", tenant_id=hotel_id)
        warmed += 1

    # Warm-up guests
    guests = list(_guests.get(hotel_id, {}).values())
    for guest in guests[:200]:
        key_data = {"hotel_id": hotel_id, "entity_type": "guest", "id": guest.id}
        data = guest.model_dump() if hasattr(guest, "model_dump") else dict(guest)
        cache.set(key_data, data, entity_type="guest", tenant_id=hotel_id)
        warmed += 1

    return {
        "hotel_id": hotel_id,
        "entries_warmed": warmed,
        "reservations_cached": len(reservations[:500]),
        "guests_cached": len(guests[:200]),
        "message": f"Cache préchauffé avec {warmed} entrées",
        "warmed_at": datetime.utcnow().isoformat(),
    }


# ─── 4. EVENT BUS & ORCHESTRATION ────────────────────────────────────────────

@router.get("/hotels/{hotel_id}/events/stream")
async def get_event_stream(
    hotel_id: str,
    event_type: Optional[str] = Query(None),
    source_system: Optional[str] = Query(None),
    since: Optional[str] = Query(None, description="ISO datetime - événements depuis cette date"),
    limit: int = Query(50, le=500),
):
    """
    Récupère le flux d'événements du Data Hub avec filtres avancés.
    Phase 2 : filtrage par source + fenêtre temporelle.
    """
    events = _events.get(hotel_id, [])

    if event_type:
        events = [e for e in events if e.event_type.value == event_type]
    if source_system:
        events = [e for e in events if e.source_system == source_system]
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            events = [e for e in events if datetime.fromisoformat(
                e.occurred_at.replace("Z", "+00:00") if isinstance(e.occurred_at, str) else e.occurred_at.isoformat()
            ) >= since_dt]
        except (ValueError, AttributeError):
            pass

    # Tri chronologique inverse
    events = sorted(events, key=lambda e: e.occurred_at if isinstance(e.occurred_at, str) else e.occurred_at.isoformat(), reverse=True)

    # Statistiques
    type_counts: Dict[str, int] = {}
    for e in events:
        t = e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type)
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "hotel_id": hotel_id,
        "total_events": len(events),
        "events": [
            {
                "id": e.event_id,
                "type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                "source": e.source_system,
                "occurred_at": e.occurred_at if isinstance(e.occurred_at, str) else e.occurred_at.isoformat(),
                "entity_id": e.entity_id,
                "entity_type": e.entity_type,
            }
            for e in events[:limit]
        ],
        "event_type_distribution": type_counts,
        "filters_applied": {
            "event_type": event_type,
            "source_system": source_system,
            "since": since,
        },
    }


@router.post("/hotels/{hotel_id}/events/replay")
async def replay_events(
    hotel_id: str,
    from_event_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
):
    """
    Re-émet les événements du Data Hub (Event Replay pour récupération après panne).
    Utile pour re-synchroniser un module qui aurait raté des événements.
    """
    events = _events.get(hotel_id, [])

    if from_event_id:
        idx = next((i for i, e in enumerate(events) if e.event_id == from_event_id), None)
        if idx is not None:
            events = events[idx:]

    if entity_type:
        events = [e for e in events if e.entity_type == entity_type]

    replayed = 0
    for event in events[:limit]:
        emit_event(event)
        replayed += 1

    return {
        "hotel_id": hotel_id,
        "events_replayed": replayed,
        "from_event_id": from_event_id,
        "entity_type": entity_type,
        "message": f"{replayed} événements re-émis avec succès",
        "replayed_at": datetime.utcnow().isoformat(),
    }


# ─── 5. DASHBOARD PHASE 2 ────────────────────────────────────────────────────

@router.get("/hotels/{hotel_id}/phase2/dashboard")
async def get_phase2_dashboard(hotel_id: str):
    """
    Tableau de bord Data Hub Phase 2 — vue consolidée :
    qualité des données, cache, événements, priorités sources.
    """
    cache = _get_smart_cache()
    engine_q = _get_quality_engine()

    # Données en mémoire
    reservations = list(_reservations.get(hotel_id, {}).values())
    guests = list(_guests.get(hotel_id, {}).values())
    events = _events.get(hotel_id, [])
    cache_stats = cache.get_stats()

    # Score qualité rapide (échantillon 20)
    q_scores = []
    for e in (reservations + guests)[:20]:
        data = e.model_dump() if hasattr(e, "model_dump") else dict(e)
        r = engine_q.assess_quality(data, "reservation" if e in reservations else "guest", data.get("id", ""), hotel_id, [])
        q_scores.append(r.quality_score)
    avg_q = round(sum(q_scores) / len(q_scores), 3) if q_scores else 1.0

    # Derniers événements
    recent_events = sorted(events, key=lambda e: str(e.occurred_at), reverse=True)[:5]

    from .config import SOURCE_PRIORITY
    top_sources = sorted(SOURCE_PRIORITY.items(), key=lambda x: -x[1])[:3]

    return {
        "hotel_id": hotel_id,
        "phase": "2",
        "engines_active": {
            "quality_engine": True,
            "priority_engine": True,
            "smart_cache": True,
            "event_bus": True,
        },
        "data_summary": {
            "reservations": len(reservations),
            "guests": len(guests),
            "events_total": len(events),
        },
        "quality": {
            "average_score": avg_q,
            "grade": "A" if avg_q >= 0.9 else "B" if avg_q >= 0.75 else "C" if avg_q >= 0.5 else "D",
        },
        "cache": {
            "total_entries": cache_stats.total_entries,
            "hit_rate": round(cache_stats.hit_rate, 3),
            "performance": "Excellent" if cache_stats.hit_rate >= 0.8 else "Bon" if cache_stats.hit_rate >= 0.6 else "À optimiser",
        },
        "top_priority_sources": [{"source": s, "priority": p} for s, p in top_sources],
        "recent_events": [
            {
                "type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                "source": e.source_system,
                "occurred_at": str(e.occurred_at),
            }
            for e in recent_events
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }
