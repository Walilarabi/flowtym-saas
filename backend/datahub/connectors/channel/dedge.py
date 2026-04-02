"""
Flowtym Data Hub - D-EDGE Channel Manager Connector (MOCKED)

This connector integrates with D-EDGE channel manager.
Currently returns mocked data for development and testing.

Real implementation would use: https://www.d-edge.com/api/
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import uuid

from ..base import BaseConnector, register_connector
from ...models import (
    ConnectorConfig,
    ConnectorType,
    SourceSystem,
    UniversalReservation,
    UniversalRate,
    UniversalAvailability,
    ReservationStatus,
    ChannelType,
    RateType,
    MealPlan,
    DailyRate,
    DailyAvailability,
    ReservationGuest,
    ReservationRoom,
)


@register_connector
class DEdgeConnector(BaseConnector):
    """
    D-EDGE Channel Manager Connector
    
    D-EDGE is a leading hospitality technology company providing
    channel management, booking engine, and CRS solutions.
    
    This connector handles:
    - Multi-channel reservation aggregation
    - Rate distribution across channels
    - Availability synchronization
    - Channel performance analytics
    
    STATUS: MOCKED - Returns realistic fake data
    """
    
    CONNECTOR_NAME = "dedge"
    CONNECTOR_TYPE = ConnectorType.CHANNEL_MANAGER
    DISPLAY_NAME = "D-EDGE Channel Manager"
    SOURCE_SYSTEM = SourceSystem.DEDGE
    VERSION = "1.0.0"
    
    SUPPORTED_CHANNELS = [
        {"code": "BKG", "name": "Booking.com", "commission": 15},
        {"code": "EXP", "name": "Expedia", "commission": 18},
        {"code": "HRS", "name": "HRS", "commission": 12},
        {"code": "AIR", "name": "Airbnb", "commission": 3},
        {"code": "DIR", "name": "Direct/Website", "commission": 0},
    ]
    
    MOCK_ROOM_TYPES = [
        {"code": "STD", "name": "Standard", "base_price": 120, "inventory": 15},
        {"code": "SUP", "name": "Superior", "base_price": 160, "inventory": 10},
        {"code": "DLX", "name": "Deluxe", "base_price": 220, "inventory": 8},
        {"code": "STE", "name": "Suite", "base_price": 350, "inventory": 4},
    ]
    
    async def connect(self) -> bool:
        """Connect to D-EDGE API (mocked)."""
        self.logger.info(f"[MOCK] Connecting to D-EDGE for hotel {self.config.external_hotel_id}")
        
        if not self.config.auth.api_key:
            self._last_error = "D-EDGE API credentials not configured"
            return False
        
        self._is_connected = True
        self.logger.info("[MOCK] Connected to D-EDGE successfully")
        return True
    
    async def disconnect(self) -> bool:
        """Disconnect from D-EDGE API."""
        self._is_connected = False
        return True
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test D-EDGE connection."""
        return {
            "success": True,
            "message": "[MOCK] D-EDGE connection test successful",
            "hotel_code": self.config.external_hotel_id or "DEDGE-001",
            "connected_channels": [ch["code"] for ch in self.SUPPORTED_CHANNELS],
            "features": ["reservations", "rates", "availability", "analytics"]
        }
    
    async def fetch_reservations(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch aggregated reservations from all channels (mocked)."""
        self.logger.info(f"[MOCK] Fetching D-EDGE reservations from all channels")
        
        reservations = []
        
        start = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now()
        end = datetime.strptime(to_date, "%Y-%m-%d") if to_date else start + timedelta(days=30)
        
        num_reservations = min(limit, random.randint(5, 20))
        
        for i in range(num_reservations):
            check_in = start + timedelta(days=random.randint(0, (end - start).days))
            nights = random.randint(1, 5)
            room_type = random.choice(self.MOCK_ROOM_TYPES)
            channel = random.choice(self.SUPPORTED_CHANNELS)
            total_price = room_type["base_price"] * nights
            
            reservations.append({
                "reservationId": f"DE-{uuid.uuid4().hex[:10].upper()}",
                "channelCode": channel["code"],
                "channelName": channel["name"],
                "channelReservationId": f"{channel['code']}{random.randint(100000, 999999)}",
                "status": random.choice(["confirmed", "modified", "cancelled"]),
                "guest": {
                    "firstName": random.choice(["Jean", "Marie", "Pierre", "Sophie", "Thomas"]),
                    "lastName": random.choice(["Dupont", "Martin", "Bernard", "Petit", "Robert"]),
                    "email": f"guest{random.randint(100, 999)}@email.com",
                    "phone": f"+33 6 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
                    "country": random.choice(["FR", "DE", "GB", "ES", "IT"])
                },
                "roomType": {
                    "code": room_type["code"],
                    "name": room_type["name"]
                },
                "arrival": check_in.strftime("%Y-%m-%d"),
                "departure": (check_in + timedelta(days=nights)).strftime("%Y-%m-%d"),
                "adults": random.randint(1, 2),
                "children": random.randint(0, 2),
                "rateCode": "BAR",
                "rateName": "Best Available Rate",
                "totalAmount": total_price,
                "currency": "EUR",
                "commission": {
                    "percentage": channel["commission"],
                    "amount": round(total_price * channel["commission"] / 100, 2)
                },
                "mealPlan": random.choice(["RO", "BB", "HB"]),
                "specialRequests": random.choice([None, "Non fumeur", "Vue mer", "Etage eleve"]),
                "createdAt": (check_in - timedelta(days=random.randint(3, 30))).isoformat(),
                "updatedAt": datetime.utcnow().isoformat()
            })
        
        return {
            "data": reservations,
            "cursor": None,
            "total": len(reservations)
        }
    
    async def fetch_rates(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        room_type_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Fetch rates from D-EDGE (mocked)."""
        self.logger.info(f"[MOCK] Fetching D-EDGE rates")
        
        rates = []
        start = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now()
        end = datetime.strptime(to_date, "%Y-%m-%d") if to_date else start + timedelta(days=90)
        
        for room_type in self.MOCK_ROOM_TYPES:
            if room_type_codes and room_type["code"] not in room_type_codes:
                continue
            
            daily_rates = {}
            current = start
            while current <= end:
                date_str = current.strftime("%Y-%m-%d")
                # Simulate price variations
                multiplier = 1.0
                if current.weekday() in [4, 5]:  # Friday, Saturday
                    multiplier = 1.2
                if current.month in [7, 8, 12]:  # Peak season
                    multiplier *= 1.3
                
                daily_rates[date_str] = {
                    "date": date_str,
                    "price": round(room_type["base_price"] * multiplier, 2),
                    "currency": "EUR",
                    "isOpen": random.random() > 0.05,
                    "minStay": 1 if random.random() > 0.3 else 2,
                }
                current += timedelta(days=1)
            
            rates.append({
                "roomTypeCode": room_type["code"],
                "roomTypeName": room_type["name"],
                "rateCode": "BAR",
                "rateName": "Best Available Rate",
                "dailyRates": daily_rates
            })
        
        return {
            "data": rates,
            "total": len(rates)
        }
    
    async def fetch_availability(
        self,
        from_date: str,
        to_date: str,
        room_type_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Fetch availability from D-EDGE (mocked)."""
        self.logger.info(f"[MOCK] Fetching D-EDGE availability")
        
        availability = []
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d")
        
        for room_type in self.MOCK_ROOM_TYPES:
            if room_type_codes and room_type["code"] not in room_type_codes:
                continue
            
            daily_avail = {}
            current = start
            while current <= end:
                date_str = current.strftime("%Y-%m-%d")
                sold = random.randint(0, room_type["inventory"])
                
                daily_avail[date_str] = {
                    "date": date_str,
                    "totalRooms": room_type["inventory"],
                    "availableRooms": room_type["inventory"] - sold,
                    "soldRooms": sold,
                    "isOpen": random.random() > 0.05,
                    "stopSell": random.random() < 0.02
                }
                current += timedelta(days=1)
            
            availability.append({
                "roomTypeCode": room_type["code"],
                "roomTypeName": room_type["name"],
                "dailyAvailability": daily_avail
            })
        
        return {
            "data": availability,
            "total": len(availability)
        }
    
    async def push_rates(self, rates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push rates to D-EDGE for distribution (mocked)."""
        self.logger.info(f"[MOCK] Pushing {len(rates)} rates to D-EDGE")
        
        return {
            "success": True,
            "processed": len(rates),
            "distributedTo": [ch["name"] for ch in self.SUPPORTED_CHANNELS],
            "message": "[MOCK] Rates pushed and distributed to all channels"
        }
    
    async def push_availability(self, availability: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push availability to D-EDGE for distribution (mocked)."""
        self.logger.info(f"[MOCK] Pushing {len(availability)} availability updates to D-EDGE")
        
        return {
            "success": True,
            "processed": len(availability),
            "distributedTo": [ch["name"] for ch in self.SUPPORTED_CHANNELS],
            "message": "[MOCK] Availability pushed and distributed to all channels"
        }
    
    async def get_channel_performance(self, from_date: str, to_date: str) -> Dict[str, Any]:
        """Get channel performance analytics (mocked)."""
        performance = []
        
        for channel in self.SUPPORTED_CHANNELS:
            reservations = random.randint(5, 50)
            revenue = reservations * random.randint(200, 500)
            
            performance.append({
                "channelCode": channel["code"],
                "channelName": channel["name"],
                "reservations": reservations,
                "roomNights": reservations * random.randint(1, 3),
                "revenue": revenue,
                "commission": round(revenue * channel["commission"] / 100, 2),
                "netRevenue": round(revenue * (1 - channel["commission"] / 100), 2),
                "adr": round(revenue / reservations, 2),
                "cancellationRate": round(random.uniform(5, 25), 1)
            })
        
        return {
            "fromDate": from_date,
            "toDate": to_date,
            "channels": performance,
            "totalRevenue": sum(p["revenue"] for p in performance),
            "totalReservations": sum(p["reservations"] for p in performance)
        }
    
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> UniversalReservation:
        """Transform D-EDGE reservation to universal format."""
        
        status_map = {
            "confirmed": ReservationStatus.CONFIRMED,
            "modified": ReservationStatus.MODIFIED,
            "cancelled": ReservationStatus.CANCELLED,
        }
        
        channel_map = {
            "BKG": ChannelType.BOOKING_COM,
            "EXP": ChannelType.EXPEDIA,
            "AIR": ChannelType.AIRBNB,
            "HRS": ChannelType.HRS,
            "DIR": ChannelType.DIRECT,
        }
        
        meal_plan_map = {
            "RO": MealPlan.ROOM_ONLY,
            "BB": MealPlan.BREAKFAST,
            "HB": MealPlan.HALF_BOARD,
            "FB": MealPlan.FULL_BOARD,
        }
        
        guest_data = raw_data.get("guest", {})
        room_type = raw_data.get("roomType", {})
        commission = raw_data.get("commission", {})
        
        check_in = datetime.strptime(raw_data["arrival"], "%Y-%m-%d")
        check_out = datetime.strptime(raw_data["departure"], "%Y-%m-%d")
        nights = (check_out - check_in).days
        
        transformation_log = [
            self.create_transformation_log(
                "channelCode", raw_data.get("channelCode"), 
                channel_map.get(raw_data.get("channelCode"), ChannelType.CHANNEL_MANAGER).value,
                "dedge_channel_to_universal"
            )
        ]
        
        guest = ReservationGuest(
            guest_id=f"dedge-guest-{uuid.uuid4().hex[:8]}",
            is_primary=True,
            is_payer=True,
            first_name=guest_data.get("firstName", ""),
            last_name=guest_data.get("lastName", ""),
            email=guest_data.get("email"),
            phone=guest_data.get("phone")
        )
        
        room = ReservationRoom(
            room_type_code=room_type.get("code", ""),
            room_type_name=room_type.get("name", ""),
            adults=raw_data.get("adults", 1),
            children=raw_data.get("children", 0),
            rate_code=raw_data.get("rateCode", ""),
            rate_name=raw_data.get("rateName", ""),
            daily_rate=raw_data.get("totalAmount", 0) / max(nights, 1),
            currency=raw_data.get("currency", "EUR"),
            meal_plan=meal_plan_map.get(raw_data.get("mealPlan"), MealPlan.ROOM_ONLY)
        )
        
        total = raw_data.get("totalAmount", 0)
        commission_amount = commission.get("amount", 0)
        
        return UniversalReservation(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=raw_data["reservationId"],
            source_raw_data=raw_data,
            transformation_log=transformation_log,
            
            confirmation_number=raw_data["reservationId"],
            external_confirmation_number=raw_data.get("channelReservationId"),
            
            channel=channel_map.get(raw_data.get("channelCode"), ChannelType.CHANNEL_MANAGER),
            channel_reference=raw_data.get("channelReservationId"),
            
            status=status_map.get(raw_data.get("status"), ReservationStatus.CONFIRMED),
            
            check_in_date=raw_data["arrival"],
            check_out_date=raw_data["departure"],
            nights=nights,
            
            guests=[guest],
            total_adults=raw_data.get("adults", 1),
            total_children=raw_data.get("children", 0),
            
            rooms=[room],
            
            total_amount=total,
            currency=raw_data.get("currency", "EUR"),
            room_charges=total,
            
            commission_rate=commission.get("percentage"),
            commission_amount=commission_amount,
            net_amount=total - commission_amount,
            
            meal_plan=meal_plan_map.get(raw_data.get("mealPlan"), MealPlan.ROOM_ONLY),
            
            special_requests=[raw_data["specialRequests"]] if raw_data.get("specialRequests") else [],
        )
