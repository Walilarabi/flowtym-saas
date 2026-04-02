"""
Flowtym Shared Configuration API

This provides a unified API endpoint for all modules to access configuration data.
Endpoint: /api/shared/config
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
import logging

from .config_service import get_config_service, ConfigService

logger = logging.getLogger(__name__)

shared_router = APIRouter(prefix="/shared", tags=["Shared Configuration"])


def get_service() -> ConfigService:
    """Dependency to get ConfigService"""
    return get_config_service()


# ═══════════════════════════════════════════════════════════════════════════════
# FULL CONFIG (SINGLE CALL)
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/all")
async def get_full_configuration(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Get complete hotel configuration in a single API call.
    
    This is the recommended endpoint for modules to initialize with all
    configuration data they need.
    
    Returns:
        - hotel: Hotel profile
        - room_types: All room types with counts
        - rooms_summary: Inventory summary by type and floor
        - rate_plans: All rate plans with derivation rules
        - pricing_matrix: Pre-calculated prices per rate/room type
        - cancellation_policies: All cancellation policies
        - payment_policies: All payment policies
        - taxes: Tax rules
        - settings: Advanced settings
    """
    try:
        config = await service.get_full_config(hotel_id)
        return config
    except Exception as e:
        logger.error(f"Failed to get full config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# HOTEL PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/hotel")
async def get_hotel_profile(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """Get hotel profile (name, address, timezone, currency, etc.)"""
    profile = await service.get_hotel_profile(hotel_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return profile


@shared_router.get("/config/{hotel_id}/timezone")
async def get_hotel_timezone(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, str]:
    """Get hotel timezone"""
    tz = await service.get_hotel_timezone(hotel_id)
    return {"timezone": tz}


@shared_router.get("/config/{hotel_id}/currency")
async def get_hotel_currency(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, str]:
    """Get hotel default currency"""
    currency = await service.get_hotel_currency(hotel_id)
    return {"currency": currency}


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM TYPES
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/room-types")
async def get_room_types(
    hotel_id: str,
    include_room_count: bool = Query(False),
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get all active room types"""
    return await service.get_room_types(hotel_id, include_room_count=include_room_count)


@shared_router.get("/config/{hotel_id}/room-types/mapping")
async def get_room_type_mapping(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Dict[str, Any]]:
    """Get room type mapping (code -> full data)"""
    return await service.get_room_type_mapping(hotel_id)


@shared_router.get("/config/{hotel_id}/room-types/prices")
async def get_room_type_prices(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, float]:
    """Get base prices for all room types (code -> price)"""
    return await service.get_room_type_prices(hotel_id)


# ═══════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/inventory")
async def get_inventory_summary(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """Get inventory summary (total rooms, by type, by floor)"""
    return await service.get_inventory_summary(hotel_id)


@shared_router.get("/config/{hotel_id}/rooms")
async def get_rooms(
    hotel_id: str,
    room_type_id: Optional[str] = None,
    floor: Optional[int] = None,
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get physical rooms with optional filters"""
    return await service.get_rooms(
        hotel_id, 
        room_type_id=room_type_id, 
        floor=floor
    )


@shared_router.get("/config/{hotel_id}/rooms/count")
async def get_room_count(
    hotel_id: str,
    room_type_id: Optional[str] = None,
    service: ConfigService = Depends(get_service)
) -> Dict[str, int]:
    """Get total room count"""
    count = await service.get_room_count(hotel_id, room_type_id)
    return {"count": count}


# ═══════════════════════════════════════════════════════════════════════════════
# RATE PLANS
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/rate-plans")
async def get_rate_plans(
    hotel_id: str,
    include_derived: bool = Query(True),
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get all rate plans"""
    return await service.get_rate_plans(hotel_id, include_derived=include_derived)


@shared_router.get("/config/{hotel_id}/rate-plans/base")
async def get_base_rate_plans(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get only base (non-derived) rate plans"""
    return await service.get_base_rate_plans(hotel_id)


@shared_router.get("/config/{hotel_id}/pricing-matrix")
async def get_pricing_matrix(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Dict[str, float]]:
    """
    Get full pricing matrix.
    
    Returns: {rate_code: {room_type_code: price}}
    """
    return await service.get_pricing_matrix(hotel_id)


# ═══════════════════════════════════════════════════════════════════════════════
# POLICIES
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/policies/cancellation")
async def get_cancellation_policies(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get all cancellation policies"""
    return await service.get_cancellation_policies(hotel_id)


@shared_router.get("/config/{hotel_id}/policies/payment")
async def get_payment_policies(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get all payment policies"""
    return await service.get_payment_policies(hotel_id)


@shared_router.get("/config/{hotel_id}/policies/defaults")
async def get_default_policies(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """Get default cancellation and payment policies"""
    return await service.get_default_policies(hotel_id)


# ═══════════════════════════════════════════════════════════════════════════════
# TAXES & PRICING
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/taxes")
async def get_taxes(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> List[Dict[str, Any]]:
    """Get all tax rules"""
    return await service.get_taxes(hotel_id)


@shared_router.get("/config/{hotel_id}/calculate-price")
async def calculate_price_with_tax(
    hotel_id: str,
    base_price: float = Query(..., description="Base price to calculate"),
    service_type: str = Query("room", description="Service type: room, breakfast, restaurant, spa"),
    service: ConfigService = Depends(get_service)
) -> Dict[str, float]:
    """
    Calculate price with applicable tax.
    
    Returns: {base_price, tax_rate, tax_amount, total_price, is_included}
    """
    return await service.calculate_price_with_tax(hotel_id, base_price, service_type)


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/settings")
async def get_advanced_settings(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """Get advanced settings (booking rules, overbooking, price rounding)"""
    return await service.get_advanced_settings(hotel_id)


# ═══════════════════════════════════════════════════════════════════════════════
# OTA MAPPINGS (For Data Hub / Channel Manager)
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/ota-mapping/room-types/{ota_code}")
async def get_ota_room_type_mapping(
    hotel_id: str,
    ota_code: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, str]:
    """
    Get room type mappings for a specific OTA.
    
    Returns: {internal_room_type_id: ota_room_type_code}
    """
    return await service.get_ota_room_type_mapping(hotel_id, ota_code)


@shared_router.get("/config/{hotel_id}/ota-mapping/rate-plans/{ota_code}")
async def get_ota_rate_plan_mapping(
    hotel_id: str,
    ota_code: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, str]:
    """
    Get rate plan mappings for a specific OTA.
    
    Returns: {internal_rate_id: ota_rate_code}
    """
    return await service.get_ota_rate_plan_mapping(hotel_id, ota_code)


# ═══════════════════════════════════════════════════════════════════════════════
# FOR RMS MODULE
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/rms-data")
async def get_rms_config_data(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Get configuration data specifically for RMS module.
    
    Returns:
        - room_types: With base prices
        - inventory: Room counts by type
        - rate_plans: All active rate plans
        - pricing_matrix: Calculated prices
        - settings: Overbooking rules, price floors
    """
    room_types = await service.get_room_types(hotel_id, include_room_count=True)
    inventory = await service.get_inventory_summary(hotel_id)
    rate_plans = await service.get_rate_plans(hotel_id)
    pricing_matrix = await service.get_pricing_matrix(hotel_id)
    settings = await service.get_advanced_settings(hotel_id)
    
    return {
        "hotel_id": hotel_id,
        "room_types": room_types,
        "inventory": inventory,
        "rate_plans": rate_plans,
        "pricing_matrix": pricing_matrix,
        "overbooking_allowed": settings.get("overbooking_allowed", False),
        "overbooking_percentage": settings.get("overbooking_percentage", 0),
        "min_price_floor": settings.get("min_price_floor", 0),
        "round_prices_to": settings.get("round_prices_to", 1)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# FOR DATA HUB MODULE
# ═══════════════════════════════════════════════════════════════════════════════

@shared_router.get("/config/{hotel_id}/datahub-data")
async def get_datahub_config_data(
    hotel_id: str,
    service: ConfigService = Depends(get_service)
) -> Dict[str, Any]:
    """
    Get configuration data specifically for Data Hub module.
    
    Returns:
        - hotel: Basic info (name, timezone, currency)
        - room_types: With OTA mappings
        - rate_plans: With OTA mappings
        - check_times: Check-in/out times
    """
    hotel = await service.get_hotel_profile(hotel_id)
    room_types = await service.get_room_types(hotel_id)
    rate_plans = await service.get_rate_plans(hotel_id)
    check_times = await service.get_check_times(hotel_id)
    
    return {
        "hotel_id": hotel_id,
        "hotel_name": hotel.get("name") if hotel else None,
        "timezone": hotel.get("timezone", "Europe/Paris") if hotel else "Europe/Paris",
        "currency": hotel.get("currency", "EUR") if hotel else "EUR",
        "room_types": room_types,
        "rate_plans": rate_plans,
        "check_in_time": check_times["check_in"],
        "check_out_time": check_times["check_out"]
    }
