"""
Channel Manager API Routes
Manages OTA connections, inventory, rates, and reservations
Designed for future D-EDGE / SiteMinder integration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import os

from .models import (
    ChannelProvider, ChannelStatus, SyncStatus, RateType,
    ChannelConnectionCreate, ChannelConnectionUpdate, ChannelConnection,
    RoomMappingCreate, RoomMappingUpdate, RoomMapping,
    InventoryUpdate, InventoryBulkUpdate, InventoryRecord,
    RateUpdate, RateBulkUpdate, RateRecord,
    OTAReservation, OTAReservationStatus, OTAGuest,
    SyncLog, CompetitorRate, RateShopperResult
)

channel_router = APIRouter()
security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials):
    """Verify JWT token - simplified for this module"""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Token manquant")
    return credentials.credentials


# ===================== CHANNEL CONNECTIONS =====================

@channel_router.get("/connections")
async def list_channel_connections(
    db,
    hotel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all channel connections for a hotel"""
    verify_token(credentials)
    
    connections = await db.channel_connections.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).to_list(100)
    
    return connections


@channel_router.post("/connections")
async def create_channel_connection(
    hotel_id: str,
    connection: ChannelConnectionCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new channel connection"""
    verify_token(credentials)
    
    # Check if connection already exists for this provider
    existing = await db.channel_connections.find_one({
        "hotel_id": hotel_id,
        "provider": connection.provider.value
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Une connexion {connection.provider.value} existe deja"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    connection_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "provider": connection.provider.value,
        "name": connection.name,
        "credentials": connection.credentials.dict() if connection.credentials else {},
        "status": ChannelStatus.PENDING.value,
        "is_active": connection.is_active,
        "sync_inventory": connection.sync_inventory,
        "sync_rates": connection.sync_rates,
        "sync_reservations": connection.sync_reservations,
        "commission_rate": connection.commission_rate,
        "last_sync": None,
        "last_sync_status": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.channel_connections.insert_one(connection_doc)
    
    # Remove credentials and _id from response
    connection_doc.pop("credentials", None)
    connection_doc.pop("_id", None)
    
    return connection_doc


@channel_router.put("/connections/{connection_id}")
async def update_channel_connection(
    connection_id: str,
    update: ChannelConnectionUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a channel connection"""
    verify_token(credentials)
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if update.credentials:
        update_data["credentials"] = update.credentials.dict()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.channel_connections.find_one_and_update(
        {"id": connection_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Connexion non trouvee")
    
    # Remove credentials and _id from response
    result.pop("_id", None)
    result.pop("credentials", None)
    
    return result


@channel_router.delete("/connections/{connection_id}")
async def delete_channel_connection(
    connection_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a channel connection"""
    verify_token(credentials)
    
    result = await db.channel_connections.delete_one({"id": connection_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Connexion non trouvee")
    
    # Also delete related mappings
    await db.channel_mappings.delete_many({"channel_id": connection_id})
    
    return {"message": "Connexion supprimee"}


@channel_router.post("/connections/{connection_id}/test")
async def test_channel_connection(
    connection_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Test a channel connection (simulate API call to OTA)"""
    verify_token(credentials)
    
    connection = await db.channel_connections.find_one(
        {"id": connection_id},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Connexion non trouvee")
    
    # Simulate connection test based on provider
    # In production, this would make actual API calls to D-EDGE/SiteMinder
    provider = connection["provider"]
    
    # Simulate success/failure based on credentials presence
    has_credentials = bool(connection.get("credentials", {}).get("api_key"))
    
    if has_credentials:
        # Update status to active
        await db.channel_connections.update_one(
            {"id": connection_id},
            {"$set": {
                "status": ChannelStatus.ACTIVE.value,
                "error_message": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "message": f"Connexion {provider} testee avec succes",
            "status": "active"
        }
    else:
        # Update status to error
        await db.channel_connections.update_one(
            {"id": connection_id},
            {"$set": {
                "status": ChannelStatus.ERROR.value,
                "error_message": "Credentials manquants ou invalides",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": False,
            "message": "Credentials manquants ou invalides",
            "status": "error"
        }


# ===================== ROOM MAPPINGS =====================

@channel_router.get("/mappings")
async def list_room_mappings(
    db,
    hotel_id: str,
    channel_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List room mappings"""
    verify_token(credentials)
    
    query = {"hotel_id": hotel_id}
    if channel_id:
        query["channel_id"] = channel_id
    
    mappings = await db.channel_mappings.find(query, {"_id": 0}).to_list(500)
    
    return mappings


@channel_router.post("/mappings")
async def create_room_mapping(
    hotel_id: str,
    mapping: RoomMappingCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a room mapping"""
    verify_token(credentials)
    
    # Get channel info
    channel = await db.channel_connections.find_one(
        {"id": mapping.channel_id},
        {"_id": 0}
    )
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canal non trouve")
    
    # Get room type info — Phase 17: ConfigService en priorité
    internal_room_name = "Unknown"
    try:
        from shared.config_service import get_config_service
        config = get_config_service()
        rt_detail = await config.get_room_type_by_id(hotel_id, mapping.internal_room_type_id)
        if rt_detail:
            internal_room_name = rt_detail.get("name", "Unknown")
    except Exception:
        pass

    if internal_room_name == "Unknown":
        room_type = await db.room_types.find_one(
            {"id": mapping.internal_room_type_id},
            {"_id": 0}
        )
        internal_room_name = room_type.get("name", "Unknown") if room_type else "Unknown"
    
    mapping_doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "channel_id": mapping.channel_id,
        "channel_provider": channel["provider"],
        "internal_room_type_id": mapping.internal_room_type_id,
        "internal_room_name": internal_room_name,
        "external_room_code": mapping.external_room_code,
        "external_room_name": mapping.external_room_name,
        "is_active": mapping.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.channel_mappings.insert_one(mapping_doc)
    
    return mapping_doc


@channel_router.delete("/mappings/{mapping_id}")
async def delete_room_mapping(
    mapping_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a room mapping"""
    verify_token(credentials)
    
    result = await db.channel_mappings.delete_one({"id": mapping_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mapping non trouve")
    
    return {"message": "Mapping supprime"}


# ===================== INVENTORY =====================

@channel_router.get("/inventory")
async def get_inventory(
    db,
    hotel_id: str,
    start_date: str,
    end_date: str,
    room_type_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get inventory for date range"""
    verify_token(credentials)
    
    query = {
        "hotel_id": hotel_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if room_type_id:
        query["room_type_id"] = room_type_id
    if channel_id:
        query["channel_id"] = channel_id
    
    inventory = await db.channel_inventory.find(query, {"_id": 0}).to_list(10000)
    
    # If no inventory exists, generate default from room types
    if not inventory:
        # ── Phase 17 : utiliser ConfigService (config_room_types) ────────────
        # Fallback sur db.room_types pour compatibilité ascendante
        room_types = []
        try:
            from shared.config_service import get_config_service
            config = get_config_service()
            room_types = await config.get_room_types(hotel_id, include_room_count=True)
            # Normaliser les champs vers le format attendu
            for rt in room_types:
                if "total_rooms" not in rt:
                    rt["total_rooms"] = rt.get("room_count", 10)
        except Exception:
            pass

        if not room_types:
            room_types = await db.room_types.find(
                {"hotel_id": hotel_id},
                {"_id": 0}
            ).to_list(100)
        # ─────────────────────────────────────────────────────────────────────

        channels = await db.channel_connections.find(
            {"hotel_id": hotel_id, "is_active": True},
            {"_id": 0}
        ).to_list(20)
        
        # Generate default inventory
        from datetime import datetime as dt
        current = dt.strptime(start_date, "%Y-%m-%d")
        end = dt.strptime(end_date, "%Y-%m-%d")
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            for rt in room_types:
                total_rooms = rt.get("total_rooms", 10)
                
                # Base inventory (all channels)
                inventory.append({
                    "id": str(uuid.uuid4()),
                    "hotel_id": hotel_id,
                    "date": date_str,
                    "room_type_id": rt["id"],
                    "room_type_name": rt.get("name", "Room"),
                    "channel_id": None,
                    "channel_name": "All Channels",
                    "total_rooms": total_rooms,
                    "sold": 0,
                    "available": total_rooms,
                    "blocked": 0,
                    "min_stay": 1,
                    "max_stay": 30,
                    "closed_to_arrival": False,
                    "closed_to_departure": False,
                    "stop_sell": False,
                    "sync_status": "synced",
                    "last_updated": datetime.now(timezone.utc).isoformat()
                })
                
                # Per-channel inventory
                for ch in channels:
                    inventory.append({
                        "id": str(uuid.uuid4()),
                        "hotel_id": hotel_id,
                        "date": date_str,
                        "room_type_id": rt["id"],
                        "room_type_name": rt.get("name", "Room"),
                        "channel_id": ch["id"],
                        "channel_name": ch["name"],
                        "total_rooms": total_rooms,
                        "sold": 0,
                        "available": total_rooms,
                        "blocked": 0,
                        "min_stay": 1,
                        "max_stay": 30,
                        "closed_to_arrival": False,
                        "closed_to_departure": False,
                        "stop_sell": False,
                        "sync_status": "synced",
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    })
            
            current += timedelta(days=1)
    
    return inventory


@channel_router.post("/inventory/update")
async def update_inventory(
    hotel_id: str,
    update: InventoryUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update inventory for a specific date/room"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "hotel_id": hotel_id,
        "date": update.date,
        "room_type_id": update.room_type_id
    }
    
    if update.channel_id:
        query["channel_id"] = update.channel_id
    
    update_data = {
        "available": update.available,
        "min_stay": update.min_stay,
        "max_stay": update.max_stay,
        "closed_to_arrival": update.closed_to_arrival,
        "closed_to_departure": update.closed_to_departure,
        "stop_sell": update.stop_sell,
        "sync_status": SyncStatus.PENDING.value,
        "last_updated": now
    }
    
    result = await db.channel_inventory.update_one(
        query,
        {"$set": update_data},
        upsert=True
    )
    
    # Log sync operation
    await db.channel_sync_logs.insert_one({
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "channel_id": update.channel_id,
        "channel_name": "Manual Update",
        "operation": "inventory",
        "status": SyncStatus.PENDING.value,
        "items_processed": 1,
        "items_success": 1,
        "items_failed": 0,
        "started_at": now,
        "completed_at": now
    })
    
    return {"message": "Inventaire mis a jour", "sync_status": "pending"}


@channel_router.post("/inventory/bulk-update")
async def bulk_update_inventory(
    hotel_id: str,
    bulk: InventoryBulkUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk update inventory"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    
    for update in bulk.updates:
        query = {
            "hotel_id": hotel_id,
            "date": update.date,
            "room_type_id": update.room_type_id
        }
        
        if not bulk.apply_to_all_channels and update.channel_id:
            query["channel_id"] = update.channel_id
        
        update_data = {
            "available": update.available,
            "min_stay": update.min_stay,
            "max_stay": update.max_stay,
            "closed_to_arrival": update.closed_to_arrival,
            "closed_to_departure": update.closed_to_departure,
            "stop_sell": update.stop_sell,
            "sync_status": SyncStatus.PENDING.value,
            "last_updated": now
        }
        
        if bulk.apply_to_all_channels:
            result = await db.channel_inventory.update_many(
                query,
                {"$set": update_data}
            )
            updated += result.modified_count
        else:
            result = await db.channel_inventory.update_one(
                query,
                {"$set": update_data},
                upsert=True
            )
            updated += 1
    
    return {
        "message": f"{updated} enregistrements mis a jour",
        "updated_count": updated,
        "sync_status": "pending"
    }


# ===================== RATES =====================

@channel_router.get("/rates")
async def get_rates(
    db,
    hotel_id: str,
    start_date: str,
    end_date: str,
    room_type_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get rates for date range"""
    verify_token(credentials)
    
    query = {
        "hotel_id": hotel_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if room_type_id:
        query["room_type_id"] = room_type_id
    if channel_id:
        query["channel_id"] = channel_id
    
    rates = await db.channel_rates.find(query, {"_id": 0}).to_list(10000)
    
    # Generate default rates if none exist
    if not rates:
        # ── Phase 17 : utiliser ConfigService pour les types + prix de base ──
        room_types = []
        pricing_matrix: dict = {}
        try:
            from shared.config_service import get_config_service
            config = get_config_service()
            room_types = await config.get_room_types(hotel_id)
            pricing_matrix = await config.get_pricing_matrix(hotel_id)
            # Injecter les prix ConfigService dans les room_types
            for rt in room_types:
                code = rt.get("code", "")
                bar_price = (pricing_matrix.get("BAR") or {}).get(code)
                if bar_price:
                    rt["base_price"] = bar_price
        except Exception:
            pass

        if not room_types:
            room_types = await db.room_types.find(
                {"hotel_id": hotel_id},
                {"_id": 0}
            ).to_list(100)
        # ─────────────────────────────────────────────────────────────────────

        channels = await db.channel_connections.find(
            {"hotel_id": hotel_id, "is_active": True},
            {"_id": 0}
        ).to_list(20)
        
        from datetime import datetime as dt
        current = dt.strptime(start_date, "%Y-%m-%d")
        end = dt.strptime(end_date, "%Y-%m-%d")
        
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            is_weekend = current.weekday() >= 5
            
            for rt in room_types:
                base_price = rt.get("base_price", 100)
                price = base_price * 1.15 if is_weekend else base_price
                
                # Base rate (all channels)
                rates.append({
                    "id": str(uuid.uuid4()),
                    "hotel_id": hotel_id,
                    "date": date_str,
                    "room_type_id": rt["id"],
                    "room_type_name": rt.get("name", "Room"),
                    "channel_id": None,
                    "channel_name": "All Channels",
                    "rate_type": "bar",
                    "price": round(price, 2),
                    "currency": "EUR",
                    "sync_status": "synced",
                    "last_updated": datetime.now(timezone.utc).isoformat()
                })
                
                # Per-channel rates
                for ch in channels:
                    # Apply commission markup for OTAs
                    commission = ch.get("commission_rate", 0) / 100
                    channel_price = price * (1 + commission * 0.5)  # Split commission
                    
                    rates.append({
                        "id": str(uuid.uuid4()),
                        "hotel_id": hotel_id,
                        "date": date_str,
                        "room_type_id": rt["id"],
                        "room_type_name": rt.get("name", "Room"),
                        "channel_id": ch["id"],
                        "channel_name": ch["name"],
                        "rate_type": "bar",
                        "price": round(channel_price, 2),
                        "currency": "EUR",
                        "sync_status": "synced",
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    })
            
            current += timedelta(days=1)
    
    return rates


@channel_router.post("/rates/update")
async def update_rate(
    hotel_id: str,
    update: RateUpdate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update rate for a specific date/room"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "hotel_id": hotel_id,
        "date": update.date,
        "room_type_id": update.room_type_id,
        "rate_type": update.rate_type.value
    }
    
    if update.channel_id:
        query["channel_id"] = update.channel_id
    
    update_data = {
        "price": update.price,
        "currency": update.currency,
        "single_use_price": update.single_use_price,
        "extra_adult_price": update.extra_adult_price,
        "extra_child_price": update.extra_child_price,
        "sync_status": SyncStatus.PENDING.value,
        "last_updated": now
    }
    
    result = await db.channel_rates.update_one(
        query,
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Tarif mis a jour", "sync_status": "pending"}


# ===================== OTA RESERVATIONS =====================

@channel_router.get("/reservations")
async def list_ota_reservations(
    db,
    hotel_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    channel_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List OTA reservations"""
    verify_token(credentials)
    
    query = {"hotel_id": hotel_id}
    
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    if channel_id:
        query["channel_id"] = channel_id
    if status:
        query["status"] = status
    
    total = await db.channel_reservations.count_documents(query)
    
    reservations = await db.channel_reservations.find(
        query,
        {"_id": 0}
    ).sort("received_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "reservations": reservations,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@channel_router.post("/reservations/sync")
async def sync_reservations(
    hotel_id: str,
    channel_id: Optional[str] = None,
    db = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Trigger reservation sync from OTAs (simulated)"""
    verify_token(credentials)
    
    now = datetime.now(timezone.utc)
    
    # In production, this would call D-EDGE/SiteMinder API
    # For now, we simulate receiving new reservations
    
    query = {"hotel_id": hotel_id, "is_active": True}
    if channel_id:
        query["id"] = channel_id
    
    channels = await db.channel_connections.find(query, {"_id": 0}).to_list(20)
    
    synced_count = 0
    
    for channel in channels:
        # Simulate receiving 0-2 new reservations per channel
        import random
        new_reservations = random.randint(0, 2)
        
        for _ in range(new_reservations):
            # Create simulated reservation
            check_in = now + timedelta(days=random.randint(1, 30))
            nights = random.randint(1, 5)
            
            reservation = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "channel_id": channel["id"],
                "channel_provider": channel["provider"],
                "external_reservation_id": f"{channel['provider'].upper()}-{uuid.uuid4().hex[:8]}",
                "status": OTAReservationStatus.CONFIRMED.value,
                "guest": {
                    "first_name": random.choice(["Jean", "Marie", "Pierre", "Sophie", "Thomas"]),
                    "last_name": random.choice(["Dupont", "Martin", "Bernard", "Durand", "Moreau"]),
                    "email": f"guest{random.randint(100, 999)}@email.com",
                    "phone": f"+33 6 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
                    "country": "FR"
                },
                "room_type_id": "",  # Would be mapped from channel
                "room_type_name": random.choice(["Double Standard", "Suite Vue Mer", "Twin Classic"]),
                "check_in": check_in.strftime("%Y-%m-%d"),
                "check_out": (check_in + timedelta(days=nights)).strftime("%Y-%m-%d"),
                "nights": nights,
                "adults": random.randint(1, 2),
                "children": random.randint(0, 2),
                "total_amount": round(random.uniform(150, 500) * nights, 2),
                "currency": "EUR",
                "commission_amount": 0,
                "net_amount": 0,
                "rate_plan": "BAR",
                "is_synced_to_pms": False,
                "pms_reservation_id": None,
                "received_at": now.isoformat(),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            # Calculate commission
            commission_rate = channel.get("commission_rate", 15) / 100
            reservation["commission_amount"] = round(reservation["total_amount"] * commission_rate, 2)
            reservation["net_amount"] = round(reservation["total_amount"] - reservation["commission_amount"], 2)
            
            await db.channel_reservations.insert_one(reservation)
            synced_count += 1
        
        # Update channel last sync
        await db.channel_connections.update_one(
            {"id": channel["id"]},
            {"$set": {
                "last_sync": now.isoformat(),
                "last_sync_status": SyncStatus.SYNCED.value
            }}
        )
    
    return {
        "message": f"Synchronisation terminee: {synced_count} nouvelles reservations",
        "synced_count": synced_count,
        "channels_synced": len(channels)
    }


@channel_router.post("/reservations/{reservation_id}/sync-to-pms")
async def sync_reservation_to_pms(
    reservation_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Sync an OTA reservation to PMS"""
    verify_token(credentials)
    
    reservation = await db.channel_reservations.find_one(
        {"id": reservation_id},
        {"_id": 0}
    )
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation non trouvee")
    
    if reservation.get("is_synced_to_pms"):
        return {"message": "Deja synchronise avec le PMS", "pms_id": reservation.get("pms_reservation_id")}
    
    # Create PMS reservation
    now = datetime.now(timezone.utc).isoformat()
    
    pms_reservation = {
        "id": str(uuid.uuid4()),
        "hotel_id": reservation["hotel_id"],
        "guest_name": f"{reservation['guest']['first_name']} {reservation['guest']['last_name']}",
        "guest_email": reservation["guest"].get("email"),
        "guest_phone": reservation["guest"].get("phone"),
        "room_type": reservation["room_type_name"],
        "check_in": reservation["check_in"],
        "check_out": reservation["check_out"],
        "nights": reservation["nights"],
        "adults": reservation["adults"],
        "children": reservation.get("children", 0),
        "total_amount": reservation["total_amount"],
        "currency": reservation.get("currency", "EUR"),
        "status": "confirmed",
        "source": reservation["channel_provider"],
        "external_id": reservation["external_reservation_id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.reservations.insert_one(pms_reservation)
    
    # Update OTA reservation
    await db.channel_reservations.update_one(
        {"id": reservation_id},
        {"$set": {
            "is_synced_to_pms": True,
            "pms_reservation_id": pms_reservation["id"],
            "updated_at": now
        }}
    )
    
    # Also sync to CRM
    await sync_guest_to_crm(db, reservation)
    
    return {
        "message": "Reservation synchronisee avec le PMS",
        "pms_reservation_id": pms_reservation["id"]
    }


# ===================== SYNC LOGS =====================

@channel_router.get("/sync-logs")
async def get_sync_logs(
    db,
    hotel_id: str,
    channel_id: Optional[str] = None,
    operation: Optional[str] = None,
    limit: int = Query(50, le=200),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get sync operation logs"""
    verify_token(credentials)
    
    query = {"hotel_id": hotel_id}
    if channel_id:
        query["channel_id"] = channel_id
    if operation:
        query["operation"] = operation
    
    logs = await db.channel_sync_logs.find(
        query,
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    
    return logs


# ===================== RATE SHOPPER =====================

@channel_router.get("/rate-shopper")
async def get_rate_shopper_data(
    db,
    hotel_id: str,
    date: str,
    room_type_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get rate shopper data (simulated competitor rates)"""
    verify_token(credentials)
    
    import random
    
    # Get our rates
    our_rates = await db.channel_rates.find(
        {"hotel_id": hotel_id, "date": date, "channel_id": None},
        {"_id": 0}
    ).to_list(100)
    
    our_avg_rate = sum(r.get("price", 150) for r in our_rates) / len(our_rates) if our_rates else 150
    
    # Simulate competitor rates
    competitors = [
        {"name": "Hotel Le Majestic", "variance": random.uniform(-0.1, 0.2)},
        {"name": "Boutique Hotel Azur", "variance": random.uniform(-0.15, 0.1)},
        {"name": "Grand Hotel Rivage", "variance": random.uniform(-0.05, 0.15)},
        {"name": "Palace Mediterranean", "variance": random.uniform(0, 0.25)},
    ]
    
    competitor_rates = []
    for comp in competitors:
        price = round(our_avg_rate * (1 + comp["variance"]), 2)
        competitor_rates.append({
            "competitor_name": comp["name"],
            "room_type": "Standard Double",
            "date": date,
            "price": price,
            "currency": "EUR",
            "source": "rate_shopper",
            "scraped_at": datetime.now(timezone.utc).isoformat()
        })
    
    prices = [c["price"] for c in competitor_rates]
    
    # Calculate position
    all_prices = sorted(prices + [our_avg_rate])
    position = all_prices.index(our_avg_rate) + 1
    
    # Generate recommendation
    avg_comp = sum(prices) / len(prices)
    if our_avg_rate < avg_comp * 0.9:
        recommendation = "Vos tarifs sont inferieurs a la moyenne. Envisagez une augmentation."
        recommended_price = round(avg_comp * 0.95, 2)
    elif our_avg_rate > avg_comp * 1.1:
        recommendation = "Vos tarifs sont superieurs a la moyenne. Surveillez votre taux d'occupation."
        recommended_price = round(avg_comp * 1.05, 2)
    else:
        recommendation = "Vos tarifs sont bien positionnes par rapport au marche."
        recommended_price = None
    
    return {
        "hotel_id": hotel_id,
        "date": date,
        "our_rate": our_avg_rate,
        "competitor_rates": competitor_rates,
        "avg_competitor_rate": round(avg_comp, 2),
        "min_competitor_rate": min(prices),
        "max_competitor_rate": max(prices),
        "position": position,
        "recommendation": recommendation,
        "recommended_price": recommended_price
    }


# ===================== HELPER FUNCTIONS =====================

async def sync_guest_to_crm(db, reservation: dict):
    """Sync guest from OTA reservation to CRM"""
    guest = reservation.get("guest", {})
    email = guest.get("email")
    
    if not email:
        return
    
    # Check if client exists
    existing = await db.crm_clients.find_one({"email": email})
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing client
        await db.crm_clients.update_one(
            {"email": email},
            {"$set": {
                "last_stay": reservation.get("check_out"),
                "updated_at": now
            },
            "$inc": {
                "total_stays": 1,
                "total_spent": reservation.get("total_amount", 0)
            }}
        )
    else:
        # Create new CRM client
        client = {
            "id": str(uuid.uuid4()),
            "hotel_id": reservation["hotel_id"],
            "first_name": guest.get("first_name", ""),
            "last_name": guest.get("last_name", ""),
            "email": email,
            "phone": guest.get("phone"),
            "country": guest.get("country", ""),
            "language": guest.get("language", "fr"),
            "client_type": "regular",
            "status": "active",
            "tags": [f"OTA-{reservation.get('channel_provider', 'unknown')}"],
            "preferences": {},
            "loyalty_score": 50,
            "total_stays": 1,
            "total_spent": reservation.get("total_amount", 0),
            "last_stay": reservation.get("check_out"),
            "notes": f"Client acquis via {reservation.get('channel_provider', 'OTA')}",
            "segment_ids": [],
            "created_at": now,
            "updated_at": now,
            "created_by": "channel_manager_sync"
        }
        
        await db.crm_clients.insert_one(client)


# ═══════════════════════════════════════════════════════════════════════════════
# Channel Manager → ConfigService Sync (Phase 17)
# Synchronisation tarifaire depuis la configuration centrale vers les canaux OTA
# ═══════════════════════════════════════════════════════════════════════════════

@channel_router.post("/hotels/{hotel_id}/sync-rates-from-config")
async def sync_rates_from_config(
    hotel_id: str,
    db,
    start_date: str = Query(..., description="Date début YYYY-MM-DD"),
    end_date: str = Query(..., description="Date fin YYYY-MM-DD"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Synchronise la grille tarifaire ConfigService → channel_rates.
    Pour chaque (date, type_chambre, canal) :
      - lit le prix depuis la matrice ConfigService (BAR / plans dérivés)
      - applique le taux de commission OTA
      - crée ou met à jour l'entrée dans channel_rates
    """
    verify_token(credentials)

    try:
        from shared.config_service import get_config_service
        config = get_config_service()

        room_types = await config.get_room_types(hotel_id)
        pricing_matrix = await config.get_pricing_matrix(hotel_id)
        rate_plans = await config.get_rate_plans(hotel_id)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ConfigService indisponible: {e}")

    if not room_types or not pricing_matrix:
        raise HTTPException(
            status_code=400,
            detail="Aucun type de chambre ou grille tarifaire configuré"
        )

    channels = await db.channel_connections.find(
        {"hotel_id": hotel_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)

    # Construire la liste des dates
    from datetime import datetime as _dt
    try:
        current = _dt.strptime(start_date, "%Y-%m-%d")
        end = _dt.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD)")

    if (end - current).days > 365:
        raise HTTPException(status_code=400, detail="Période max 365 jours")

    created_count = 0
    updated_count = 0
    now = datetime.now(timezone.utc).isoformat()

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        is_weekend = current.weekday() >= 5

        for rt in room_types:
            rt_code = rt.get("code", "")
            rt_id = rt.get("id", "")

            # Prix BAR depuis matrice ConfigService
            bar_price = (pricing_matrix.get("BAR") or {}).get(rt_code)
            if bar_price is None:
                bar_price = rt.get("base_price", 100)

            # Majoration week-end si pas dans la matrice
            base_price = float(bar_price) * (1.15 if is_weekend else 1.0)

            # Rate "All Channels"
            rate_doc_base = {
                "hotel_id": hotel_id,
                "date": date_str,
                "room_type_id": rt_id,
                "room_type_code": rt_code,
                "room_type_name": rt.get("name", rt_code),
                "channel_id": None,
                "channel_name": "All Channels",
                "rate_type": "bar",
                "price": round(base_price, 2),
                "currency": "EUR",
                "sync_status": "synced",
                "synced_from_config": True,
                "last_updated": now,
            }

            result = await db.channel_rates.update_one(
                {
                    "hotel_id": hotel_id,
                    "date": date_str,
                    "room_type_id": rt_id,
                    "channel_id": None,
                },
                {"$set": rate_doc_base},
                upsert=True
            )
            if result.upserted_id:
                created_count += 1
            else:
                updated_count += result.modified_count

            # Rate par canal OTA
            for ch in channels:
                commission = float(ch.get("commission_rate", 0)) / 100
                # On passe le prix NET (hôtel reçoit base_price, OTA ajoute sa commission)
                channel_price = round(base_price / max(1 - commission, 0.01), 2)

                rate_doc_ch = {
                    **rate_doc_base,
                    "channel_id": ch["id"],
                    "channel_name": ch.get("name", ch.get("provider", "OTA")),
                    "price": channel_price,
                    "commission_rate": ch.get("commission_rate", 0),
                }

                result_ch = await db.channel_rates.update_one(
                    {
                        "hotel_id": hotel_id,
                        "date": date_str,
                        "room_type_id": rt_id,
                        "channel_id": ch["id"],
                    },
                    {"$set": rate_doc_ch},
                    upsert=True
                )
                if result_ch.upserted_id:
                    created_count += 1
                else:
                    updated_count += result_ch.modified_count

        current += timedelta(days=1)

    # Log de synchronisation
    await db.channel_sync_logs.insert_one({
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "operation": "sync_rates_from_config",
        "start_date": start_date,
        "end_date": end_date,
        "room_types_count": len(room_types),
        "channels_count": len(channels),
        "rates_created": created_count,
        "rates_updated": updated_count,
        "status": "success",
        "created_at": now,
    })

    return {
        "message": "Synchronisation tarifaire ConfigService → Channel Manager terminée",
        "hotel_id": hotel_id,
        "period": {"start": start_date, "end": end_date},
        "room_types_synced": len(room_types),
        "channels_synced": len(channels),
        "rates_created": created_count,
        "rates_updated": updated_count,
    }


@channel_router.get("/hotels/{hotel_id}/room-types-from-config")
async def get_room_types_from_config(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Retourne les types de chambres depuis ConfigService (config_room_types),
    fusionnés avec les informations de mapping canal existantes.
    Remplace l'ancien endpoint qui lisait db.room_types.
    """
    verify_token(credentials)

    # Types depuis ConfigService
    config_room_types = []
    try:
        from shared.config_service import get_config_service
        config = get_config_service()
        config_room_types = await config.get_room_types(hotel_id, include_room_count=True)
    except Exception:
        pass

    # Fallback legacy
    if not config_room_types:
        config_room_types = await db.room_types.find(
            {"hotel_id": hotel_id}, {"_id": 0}
        ).to_list(100)

    # Récupérer les mappings existants
    mappings = await db.channel_room_mappings.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).to_list(500)

    mappings_by_rt = {}
    for m in mappings:
        rt_id = m.get("internal_room_type_id")
        if rt_id not in mappings_by_rt:
            mappings_by_rt[rt_id] = []
        mappings_by_rt[rt_id].append({
            "channel_id": m.get("channel_id"),
            "channel_name": m.get("channel_name"),
            "external_room_code": m.get("external_room_code"),
        })

    # Fusionner
    result = []
    for rt in config_room_types:
        rt_id = rt.get("id", "")
        result.append({
            **rt,
            "source": "config_service",
            "channel_mappings": mappings_by_rt.get(rt_id, []),
            "mapped_channels_count": len(mappings_by_rt.get(rt_id, [])),
        })

    return {
        "hotel_id": hotel_id,
        "room_types": result,
        "total": len(result),
        "source": "config_service" if config_room_types else "legacy",
    }
