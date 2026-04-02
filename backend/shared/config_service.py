"""
Flowtym Shared Configuration Service

This service provides centralized access to hotel configuration data
for all modules (RMS, Data Hub, PMS, CRM, Booking Engine, Channel Manager).

It acts as the "source of truth" for:
- Hotel profile (name, timezone, currency)
- Room types and inventory
- Rate plans and pricing
- Policies (cancellation, payment)
- Taxes and business rules
- User access and permissions

Usage:
    from shared.config_service import ConfigService
    
    config_service = ConfigService(db)
    hotel_config = await config_service.get_full_config(hotel_id)
    room_types = await config_service.get_room_types(hotel_id)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class ConfigService:
    """
    Central service for accessing hotel configuration data.
    All modules should use this service to get configuration.
    """
    
    def __init__(self, db):
        """Initialize with database connection"""
        self.db = db
        self._cache = {}  # Simple in-memory cache
        self._cache_ttl = 300  # 5 minutes cache
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # HOTEL PROFILE
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_hotel_profile(self, hotel_id: str) -> Dict[str, Any]:
        """
        Get hotel profile with all basic information.
        
        Returns:
            - name, stars, description
            - address, contact info
            - currency, timezone, language
            - check-in/out times
            - tax info (SIRET, VAT)
        """
        profile = await self.db.config_hotels.find_one(
            {"tenant_id": hotel_id}, 
            {"_id": 0}
        )
        
        if not profile:
            # Fall back to main hotels collection
            hotel = await self.db.hotels.find_one({"id": hotel_id}, {"_id": 0})
            if hotel:
                return {
                    "tenant_id": hotel_id,
                    "name": hotel.get("name", ""),
                    "stars": hotel.get("stars", 3),
                    "currency": "EUR",
                    "timezone": "Europe/Paris",
                    "default_language": "fr",
                    "check_in_time": "15:00",
                    "check_out_time": "11:00",
                    "is_configured": False
                }
            return None
        
        profile["is_configured"] = True
        return profile
    
    async def get_hotel_timezone(self, hotel_id: str) -> str:
        """Get hotel timezone for date calculations"""
        profile = await self.get_hotel_profile(hotel_id)
        return profile.get("timezone", "Europe/Paris") if profile else "Europe/Paris"
    
    async def get_hotel_currency(self, hotel_id: str) -> str:
        """Get hotel default currency"""
        profile = await self.get_hotel_profile(hotel_id)
        return profile.get("currency", "EUR") if profile else "EUR"
    
    async def get_check_times(self, hotel_id: str) -> Dict[str, str]:
        """Get check-in and check-out times"""
        profile = await self.get_hotel_profile(hotel_id)
        return {
            "check_in": profile.get("check_in_time", "15:00") if profile else "15:00",
            "check_out": profile.get("check_out_time", "11:00") if profile else "11:00"
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # ROOM TYPES
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_room_types(
        self, 
        hotel_id: str, 
        active_only: bool = True,
        include_room_count: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all room types for a hotel.
        
        Returns:
            List of room types with:
            - id, code, name, name_en
            - category, max_occupancy, max_adults, max_children
            - base_price, size_sqm
            - view, bathroom, equipment
            - ota_mappings (for channel distribution)
        """
        query = {"tenant_id": hotel_id}
        if active_only:
            query["is_active"] = True
        
        room_types = await self.db.config_room_types.find(
            query, {"_id": 0}
        ).sort("sort_order", 1).to_list(100)
        
        if include_room_count:
            for rt in room_types:
                count = await self.db.config_rooms.count_documents({
                    "tenant_id": hotel_id,
                    "room_type_id": rt["id"],
                    "is_active": True
                })
                rt["room_count"] = count
        
        return room_types
    
    async def get_room_type_by_id(self, hotel_id: str, type_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific room type by ID"""
        return await self.db.config_room_types.find_one(
            {"id": type_id, "tenant_id": hotel_id},
            {"_id": 0}
        )
    
    async def get_room_type_by_code(self, hotel_id: str, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific room type by code (e.g., 'STD', 'DLX')"""
        return await self.db.config_room_types.find_one(
            {"code": code.upper(), "tenant_id": hotel_id, "is_active": True},
            {"_id": 0}
        )
    
    async def get_room_type_mapping(self, hotel_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Get a mapping of room type codes to their full data.
        Useful for quick lookups in other modules.
        
        Returns: {"STD": {...}, "DLX": {...}, ...}
        """
        room_types = await self.get_room_types(hotel_id)
        return {rt["code"]: rt for rt in room_types}
    
    async def get_room_type_prices(self, hotel_id: str) -> Dict[str, float]:
        """
        Get base prices for all room types.
        
        Returns: {"STD": 120.0, "DLX": 180.0, ...}
        """
        room_types = await self.get_room_types(hotel_id)
        return {rt["code"]: rt.get("base_price", 0) for rt in room_types}
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # ROOMS (INVENTORY)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_rooms(
        self, 
        hotel_id: str,
        room_type_id: Optional[str] = None,
        floor: Optional[int] = None,
        status: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get physical room inventory.
        
        Returns:
            List of rooms with:
            - room_number, room_type_id, room_type_code
            - floor, view, bathroom
            - status, is_accessible
        """
        query = {"tenant_id": hotel_id}
        if room_type_id:
            query["room_type_id"] = room_type_id
        if floor is not None:
            query["floor"] = floor
        if status:
            query["status"] = status
        if active_only:
            query["is_active"] = True
        
        rooms = await self.db.config_rooms.find(
            query, {"_id": 0}
        ).sort([("floor", 1), ("room_number", 1)]).to_list(500)
        
        return rooms
    
    async def get_room_count(self, hotel_id: str, room_type_id: Optional[str] = None) -> int:
        """Get total room count, optionally filtered by room type"""
        query = {"tenant_id": hotel_id, "is_active": True}
        if room_type_id:
            query["room_type_id"] = room_type_id
        return await self.db.config_rooms.count_documents(query)
    
    async def get_inventory_summary(self, hotel_id: str) -> Dict[str, Any]:
        """
        Get inventory summary for RMS/Data Hub.
        
        Returns:
            {
                "total_rooms": 50,
                "by_type": {"STD": 20, "DLX": 15, "STE": 5, ...},
                "by_floor": {1: 10, 2: 15, 3: 15, ...}
            }
        """
        rooms = await self.get_rooms(hotel_id)
        
        by_type = {}
        by_floor = {}
        
        for room in rooms:
            type_code = room.get("room_type_code", "UNKNOWN")
            floor = room.get("floor", 1)
            
            by_type[type_code] = by_type.get(type_code, 0) + 1
            by_floor[floor] = by_floor.get(floor, 0) + 1
        
        return {
            "total_rooms": len(rooms),
            "by_type": by_type,
            "by_floor": dict(sorted(by_floor.items()))
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # RATE PLANS
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_rate_plans(
        self, 
        hotel_id: str,
        active_only: bool = True,
        include_derived: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get all rate plans.
        
        Returns:
            List of rate plans with:
            - id, code, name
            - rate_type, meal_plan
            - is_derived, parent_rate_id, derivation_rule
            - reference_price, room_prices
            - restrictions, channels
        """
        query = {"tenant_id": hotel_id}
        if active_only:
            query["is_active"] = True
        if not include_derived:
            query["is_derived"] = False
        
        rate_plans = await self.db.config_rate_plans.find(
            query, {"_id": 0}
        ).sort("sort_order", 1).to_list(100)
        
        return rate_plans
    
    async def get_base_rate_plans(self, hotel_id: str) -> List[Dict[str, Any]]:
        """Get only base (non-derived) rate plans"""
        return await self.get_rate_plans(hotel_id, include_derived=False)
    
    async def get_derived_rate_plans(self, hotel_id: str, parent_rate_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get derived rate plans, optionally filtered by parent"""
        query = {"tenant_id": hotel_id, "is_derived": True, "is_active": True}
        if parent_rate_id:
            query["parent_rate_id"] = parent_rate_id
        
        return await self.db.config_rate_plans.find(
            query, {"_id": 0}
        ).sort("sort_order", 1).to_list(100)
    
    async def get_rate_plan_by_code(self, hotel_id: str, code: str) -> Optional[Dict[str, Any]]:
        """Get rate plan by code (e.g., 'BAR', 'NRF')"""
        return await self.db.config_rate_plans.find_one(
            {"code": code.upper(), "tenant_id": hotel_id, "is_active": True},
            {"_id": 0}
        )
    
    async def calculate_derived_price(
        self, 
        base_price: float, 
        derivation_rule: Dict[str, Any]
    ) -> float:
        """
        Calculate derived price based on derivation rule.
        
        Args:
            base_price: The base/parent rate price
            derivation_rule: {method: "percentage"|"fixed_amount", value: -10, round_to: 1}
        
        Returns:
            Calculated derived price
        """
        if not derivation_rule:
            return base_price
        
        method = derivation_rule.get("method", "percentage")
        value = derivation_rule.get("value", 0)
        round_to = derivation_rule.get("round_to", 1)
        min_price = derivation_rule.get("min_price")
        max_price = derivation_rule.get("max_price")
        
        if method == "percentage":
            calculated = base_price * (1 + value / 100)
        else:  # fixed_amount
            calculated = base_price + value
        
        # Apply rounding
        if round_to > 0:
            calculated = round(calculated / round_to) * round_to
        
        # Apply min/max constraints
        if min_price and calculated < min_price:
            calculated = min_price
        if max_price and calculated > max_price:
            calculated = max_price
        
        return round(calculated, 2)
    
    async def get_pricing_matrix(self, hotel_id: str) -> Dict[str, Dict[str, float]]:
        """
        Get full pricing matrix for RMS.
        
        Returns:
            {
                "rate_code": {
                    "room_type_code": price,
                    ...
                },
                ...
            }
        """
        rate_plans = await self.get_rate_plans(hotel_id)
        room_types = await self.get_room_types(hotel_id)
        
        # Build base prices by room type
        room_prices = {rt["code"]: rt.get("base_price", 100) for rt in room_types}
        
        matrix = {}
        base_rate_prices = {}  # Store for derived calculations
        
        # First pass: base rates
        for rate in rate_plans:
            if not rate.get("is_derived"):
                rate_prices = {}
                for rt_code, base_price in room_prices.items():
                    # Check if rate has specific room prices
                    room_type = next((rt for rt in room_types if rt["code"] == rt_code), None)
                    if room_type and rate.get("room_prices", {}).get(room_type["id"]):
                        rate_prices[rt_code] = rate["room_prices"][room_type["id"]]
                    else:
                        rate_prices[rt_code] = rate.get("reference_price", base_price)
                
                matrix[rate["code"]] = rate_prices
                base_rate_prices[rate["id"]] = rate_prices
        
        # Second pass: derived rates
        for rate in rate_plans:
            if rate.get("is_derived") and rate.get("parent_rate_id"):
                parent_prices = base_rate_prices.get(rate["parent_rate_id"], {})
                if parent_prices:
                    rate_prices = {}
                    for rt_code, base_price in parent_prices.items():
                        derived = await self.calculate_derived_price(
                            base_price, 
                            rate.get("derivation_rule", {})
                        )
                        rate_prices[rt_code] = derived
                    matrix[rate["code"]] = rate_prices
        
        return matrix
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # POLICIES
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_cancellation_policies(self, hotel_id: str) -> List[Dict[str, Any]]:
        """Get all cancellation policies"""
        return await self.db.config_cancellation_policies.find(
            {"tenant_id": hotel_id, "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(50)
    
    async def get_cancellation_policy_by_id(self, hotel_id: str, policy_id: str) -> Optional[Dict[str, Any]]:
        """Get specific cancellation policy"""
        return await self.db.config_cancellation_policies.find_one(
            {"id": policy_id, "tenant_id": hotel_id},
            {"_id": 0}
        )
    
    async def get_payment_policies(self, hotel_id: str) -> List[Dict[str, Any]]:
        """Get all payment policies"""
        return await self.db.config_payment_policies.find(
            {"tenant_id": hotel_id, "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(50)
    
    async def get_default_policies(self, hotel_id: str) -> Dict[str, Any]:
        """Get default cancellation and payment policies"""
        cancel_policy = await self.db.config_cancellation_policies.find_one(
            {"tenant_id": hotel_id, "is_active": True, "is_default": True},
            {"_id": 0}
        )
        payment_policy = await self.db.config_payment_policies.find_one(
            {"tenant_id": hotel_id, "is_active": True, "is_default": True},
            {"_id": 0}
        )
        
        # If no default, use first active
        if not cancel_policy:
            cancel_policy = await self.db.config_cancellation_policies.find_one(
                {"tenant_id": hotel_id, "is_active": True},
                {"_id": 0}
            )
        if not payment_policy:
            payment_policy = await self.db.config_payment_policies.find_one(
                {"tenant_id": hotel_id, "is_active": True},
                {"_id": 0}
            )
        
        return {
            "cancellation": cancel_policy,
            "payment": payment_policy
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # TAXES & SETTINGS
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_advanced_settings(self, hotel_id: str) -> Dict[str, Any]:
        """Get advanced settings (taxes, booking rules, etc.)"""
        settings = await self.db.config_settings.find_one(
            {"tenant_id": hotel_id},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "tenant_id": hotel_id,
                "taxes": [],
                "min_booking_advance_hours": 0,
                "max_booking_advance_days": 365,
                "default_arrival_time": "15:00",
                "default_departure_time": "11:00",
                "allow_same_day_booking": True,
                "overbooking_allowed": False,
                "overbooking_percentage": 0,
                "round_prices_to": 1
            }
        
        return settings
    
    async def get_taxes(self, hotel_id: str) -> List[Dict[str, Any]]:
        """Get tax rules for the hotel"""
        settings = await self.get_advanced_settings(hotel_id)
        return settings.get("taxes", [])
    
    async def get_tax_for_service(self, hotel_id: str, service_type: str = "room") -> Optional[Dict[str, Any]]:
        """
        Get applicable tax for a service type (room, breakfast, restaurant, spa).
        
        Returns the first matching tax rule or None.
        """
        taxes = await self.get_taxes(hotel_id)
        for tax in taxes:
            applies_to = tax.get("applies_to", "all")
            if applies_to == "all" or applies_to == service_type:
                return tax
        return None
    
    async def calculate_price_with_tax(
        self, 
        hotel_id: str, 
        base_price: float, 
        service_type: str = "room"
    ) -> Dict[str, float]:
        """
        Calculate price with applicable tax.
        
        Returns:
            {
                "base_price": 100.0,
                "tax_rate": 10.0,
                "tax_amount": 10.0,
                "total_price": 110.0,
                "is_included": True
            }
        """
        tax = await self.get_tax_for_service(hotel_id, service_type)
        
        if not tax:
            return {
                "base_price": base_price,
                "tax_rate": 0,
                "tax_amount": 0,
                "total_price": base_price,
                "is_included": False
            }
        
        tax_rate = tax.get("rate", 0)
        is_included = tax.get("is_included", True)
        
        if is_included:
            # Price already includes tax
            tax_amount = base_price - (base_price / (1 + tax_rate / 100))
            total_price = base_price
        else:
            # Tax needs to be added
            tax_amount = base_price * tax_rate / 100
            total_price = base_price + tax_amount
        
        return {
            "base_price": base_price,
            "tax_rate": tax_rate,
            "tax_amount": round(tax_amount, 2),
            "total_price": round(total_price, 2),
            "is_included": is_included
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # USERS & PERMISSIONS
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_users(self, hotel_id: str, role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get users for a hotel, optionally filtered by role"""
        query = {"tenant_id": hotel_id, "is_active": True}
        if role:
            query["role"] = role
        
        return await self.db.config_users.find(
            query, {"_id": 0}
        ).to_list(200)
    
    async def get_user_permissions(self, hotel_id: str, user_id: str) -> Dict[str, bool]:
        """Get user permissions based on role"""
        from config.models.users import DEFAULT_ROLES, UserRole
        
        user = await self.db.config_users.find_one(
            {"id": user_id, "tenant_id": hotel_id},
            {"_id": 0}
        )
        
        if not user:
            return {}
        
        role_code = user.get("role", "readonly")
        
        try:
            role_enum = UserRole(role_code)
            role_def = DEFAULT_ROLES.get(role_enum)
            if role_def:
                return {
                    "can_manage_users": role_def.can_manage_users,
                    "can_manage_config": role_def.can_manage_config,
                    "can_manage_rates": role_def.can_manage_rates,
                    "can_manage_inventory": role_def.can_manage_inventory,
                    "can_manage_reservations": role_def.can_manage_reservations,
                    "can_view_financials": role_def.can_view_financials,
                    "can_manage_channels": role_def.can_manage_channels,
                    "can_view_reports": role_def.can_view_reports,
                    "can_manage_crm": role_def.can_manage_crm
                }
        except Exception:
            pass
        
        return {}
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # FULL CONFIG (FOR MODULE INITIALIZATION)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_full_config(self, hotel_id: str) -> Dict[str, Any]:
        """
        Get complete hotel configuration for module initialization.
        This is the main method for modules to get all config in one call.
        
        Returns:
            {
                "hotel": {...},
                "room_types": [...],
                "rooms_summary": {...},
                "rate_plans": [...],
                "pricing_matrix": {...},
                "cancellation_policies": [...],
                "payment_policies": [...],
                "taxes": [...],
                "settings": {...}
            }
        """
        hotel = await self.get_hotel_profile(hotel_id)
        room_types = await self.get_room_types(hotel_id, include_room_count=True)
        rooms_summary = await self.get_inventory_summary(hotel_id)
        rate_plans = await self.get_rate_plans(hotel_id)
        pricing_matrix = await self.get_pricing_matrix(hotel_id)
        cancel_policies = await self.get_cancellation_policies(hotel_id)
        payment_policies = await self.get_payment_policies(hotel_id)
        settings = await self.get_advanced_settings(hotel_id)
        
        return {
            "hotel_id": hotel_id,
            "hotel": hotel,
            "room_types": room_types,
            "rooms_summary": rooms_summary,
            "rate_plans": rate_plans,
            "pricing_matrix": pricing_matrix,
            "cancellation_policies": cancel_policies,
            "payment_policies": payment_policies,
            "taxes": settings.get("taxes", []),
            "settings": settings,
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # OTA MAPPINGS (FOR DATA HUB / CHANNEL MANAGER)
    # ═══════════════════════════════════════════════════════════════════════════════
    
    async def get_ota_room_type_mapping(self, hotel_id: str, ota_code: str) -> Dict[str, str]:
        """
        Get room type mappings for a specific OTA.
        
        Args:
            hotel_id: Hotel tenant ID
            ota_code: OTA identifier (e.g., 'booking_com', 'expedia', 'mews')
        
        Returns:
            {"internal_room_type_id": "ota_room_type_code", ...}
        """
        room_types = await self.get_room_types(hotel_id)
        mapping = {}
        
        for rt in room_types:
            ota_mappings = rt.get("ota_mappings", {})
            if ota_code in ota_mappings:
                mapping[rt["id"]] = ota_mappings[ota_code]
            else:
                # Use code as fallback
                mapping[rt["id"]] = rt["code"]
        
        return mapping
    
    async def get_ota_rate_plan_mapping(self, hotel_id: str, ota_code: str) -> Dict[str, str]:
        """
        Get rate plan mappings for a specific OTA.
        
        Args:
            hotel_id: Hotel tenant ID  
            ota_code: OTA identifier
        
        Returns:
            {"internal_rate_id": "ota_rate_code", ...}
        """
        rate_plans = await self.get_rate_plans(hotel_id)
        mapping = {}
        
        for rp in rate_plans:
            ota_mappings = rp.get("ota_mappings", {})
            if ota_code in ota_mappings:
                mapping[rp["id"]] = ota_mappings[ota_code]
            else:
                mapping[rp["id"]] = rp["code"]
        
        return mapping


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_config_service_instance: Optional[ConfigService] = None


def get_config_service() -> ConfigService:
    """Get the singleton ConfigService instance"""
    global _config_service_instance
    if _config_service_instance is None:
        raise RuntimeError("ConfigService not initialized. Call init_config_service() first.")
    return _config_service_instance


def init_config_service(db) -> ConfigService:
    """Initialize the ConfigService singleton"""
    global _config_service_instance
    _config_service_instance = ConfigService(db)
    logger.info("ConfigService initialized")
    return _config_service_instance
