"""
Flowtym Data Hub - Booking.com OTA Connector (MOCKED)

This connector integrates with Booking.com via their Connectivity Partner APIs.
Currently returns mocked data for development and testing.

Real implementation would use: https://connect.booking.com/
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
    UniversalGuest,
    ReservationStatus,
    ChannelType,
    RateType,
    MealPlan,
    GuestType,
    ReservationGuest,
    ReservationRoom,
    ContactInfo,
)


@register_connector
class BookingComConnector(BaseConnector):
    """
    Booking.com OTA Connector
    
    Booking.com is the world's leading online travel agency.
    This connector handles:
    - Incoming reservations from Booking.com
    - Modifications and cancellations
    - Rate and availability pushes (to Booking.com)
    
    STATUS: MOCKED - Returns realistic fake data
    """
    
    CONNECTOR_NAME = "booking_com"
    CONNECTOR_TYPE = ConnectorType.OTA
    DISPLAY_NAME = "Booking.com"
    SOURCE_SYSTEM = SourceSystem.BOOKING_COM
    VERSION = "1.0.0"
    
    # Booking.com specific commission rate
    COMMISSION_RATE = 0.15  # 15%
    
    MOCK_ROOM_TYPES = [
        {"code": "DBL", "name": "Double Room", "base_price": 130},
        {"code": "TWN", "name": "Twin Room", "base_price": 130},
        {"code": "SGL", "name": "Single Room", "base_price": 95},
        {"code": "SUI", "name": "Suite", "base_price": 280},
        {"code": "FAM", "name": "Family Room", "base_price": 220},
    ]
    
    MOCK_GUEST_NAMES = [
        ("James", "Smith"), ("Emma", "Johnson"), ("Oliver", "Williams"),
        ("Sophia", "Brown"), ("Liam", "Jones"), ("Ava", "Garcia"),
        ("Noah", "Miller"), ("Isabella", "Davis"), ("William", "Rodriguez"), ("Mia", "Martinez"),
        ("Klaus", "Mueller"), ("Anna", "Schmidt"), ("Lars", "Andersen"),
    ]
    
    async def connect(self) -> bool:
        """Connect to Booking.com API (mocked)."""
        self.logger.info(f"[MOCK] Connecting to Booking.com for hotel {self.config.external_hotel_id}")
        
        if not self.config.auth.api_key:
            self._last_error = "Booking.com API credentials not configured"
            return False
        
        self._is_connected = True
        self.logger.info("[MOCK] Connected to Booking.com successfully")
        return True
    
    async def disconnect(self) -> bool:
        """Disconnect from Booking.com API."""
        self._is_connected = False
        return True
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Booking.com connection."""
        return {
            "success": True,
            "message": "[MOCK] Booking.com connection test successful",
            "hotel_id": self.config.external_hotel_id or "BKG-123456",
            "connectivity_status": "active",
            "features": ["reservations", "modifications", "cancellations", "rates", "availability"]
        }
    
    async def fetch_reservations(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch reservations from Booking.com (mocked)."""
        self.logger.info(f"[MOCK] Fetching Booking.com reservations: {from_date} to {to_date}")
        
        reservations = []
        
        start = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now()
        end = datetime.strptime(to_date, "%Y-%m-%d") if to_date else start + timedelta(days=30)
        
        num_reservations = min(limit, random.randint(3, 15))
        
        for i in range(num_reservations):
            check_in = start + timedelta(days=random.randint(0, (end - start).days))
            nights = random.randint(1, 5)
            room_type = random.choice(self.MOCK_ROOM_TYPES)
            guest = random.choice(self.MOCK_GUEST_NAMES)
            total_price = room_type["base_price"] * nights
            
            reservations.append({
                "reservation_id": f"BKG{random.randint(1000000000, 9999999999)}",
                "hotel_id": self.config.external_hotel_id or "BKG-123456",
                "status": random.choice(["booked", "modified", "cancelled"]),
                "booker": {
                    "booker_id": f"booker-{uuid.uuid4().hex[:8]}",
                    "name": {
                        "first_name": guest[0],
                        "last_name": guest[1]
                    },
                    "email": f"{guest[0].lower()}.{guest[1].lower()}@{random.choice(['gmail.com', 'yahoo.com', 'outlook.com'])}",
                    "telephone": f"+{random.randint(1, 49)} {random.randint(100, 999)} {random.randint(1000000, 9999999)}",
                    "country": random.choice(["FR", "DE", "GB", "ES", "IT", "NL", "BE", "US"]),
                    "language": random.choice(["en", "fr", "de", "es"])
                },
                "room": {
                    "room_id": room_type["code"],
                    "room_name": room_type["name"],
                    "number_of_rooms": 1,
                    "meal_plan": random.choice(["room_only", "breakfast_included"]),
                },
                "checkin": check_in.strftime("%Y-%m-%d"),
                "checkout": (check_in + timedelta(days=nights)).strftime("%Y-%m-%d"),
                "guests": {
                    "adults": random.randint(1, 2),
                    "children": random.randint(0, 2)
                },
                "price": {
                    "total": total_price,
                    "currency": "EUR",
                    "commission": round(total_price * self.COMMISSION_RATE, 2),
                    "commission_percentage": self.COMMISSION_RATE * 100
                },
                "payment_info": {
                    "payment_type": random.choice(["hotel_collect", "booking_com_collect"]),
                    "card_type": random.choice(["visa", "mastercard", "amex"]) if random.random() > 0.3 else None,
                },
                "special_requests": random.choice([
                    None,
                    "Non-smoking room please",
                    "High floor preferred",
                    "Late arrival - around 10pm",
                    "Celebrating anniversary"
                ]),
                "created_on": (check_in - timedelta(days=random.randint(7, 60))).isoformat(),
                "modified_on": datetime.utcnow().isoformat(),
                "cancellation_policy": random.choice(["free_cancellation", "non_refundable"]),
            })
        
        return {
            "data": reservations,
            "cursor": None,
            "total": len(reservations)
        }
    
    async def push_rates(self, rates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push rates to Booking.com (mocked)."""
        self.logger.info(f"[MOCK] Pushing {len(rates)} rates to Booking.com")
        
        return {
            "success": True,
            "processed": len(rates),
            "failed": 0,
            "message": "[MOCK] Rates pushed successfully to Booking.com"
        }
    
    async def push_availability(self, availability: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push availability to Booking.com (mocked)."""
        self.logger.info(f"[MOCK] Pushing {len(availability)} availability updates to Booking.com")
        
        return {
            "success": True,
            "processed": len(availability),
            "failed": 0,
            "message": "[MOCK] Availability pushed successfully to Booking.com"
        }
    
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> UniversalReservation:
        """Transform Booking.com reservation to universal format."""
        
        status_map = {
            "booked": ReservationStatus.CONFIRMED,
            "modified": ReservationStatus.MODIFIED,
            "cancelled": ReservationStatus.CANCELLED,
            "no_show": ReservationStatus.NO_SHOW,
        }
        
        meal_plan_map = {
            "room_only": MealPlan.ROOM_ONLY,
            "breakfast_included": MealPlan.BREAKFAST,
            "half_board": MealPlan.HALF_BOARD,
            "full_board": MealPlan.FULL_BOARD,
        }
        
        booker = raw_data.get("booker", {})
        booker_name = booker.get("name", {})
        room = raw_data.get("room", {})
        price = raw_data.get("price", {})
        guests_info = raw_data.get("guests", {})
        
        check_in = datetime.strptime(raw_data["checkin"], "%Y-%m-%d")
        check_out = datetime.strptime(raw_data["checkout"], "%Y-%m-%d")
        nights = (check_out - check_in).days
        
        # Build transformation log
        transformation_log = [
            self.create_transformation_log(
                "status", raw_data.get("status"), status_map.get(raw_data.get("status"), ReservationStatus.CONFIRMED).value,
                "booking_com_status_to_universal"
            ),
            self.create_transformation_log(
                "meal_plan", room.get("meal_plan"), meal_plan_map.get(room.get("meal_plan"), MealPlan.ROOM_ONLY).value,
                "booking_com_meal_to_universal"
            )
        ]
        
        # Build guest
        guest = ReservationGuest(
            guest_id=booker.get("booker_id", ""),
            is_primary=True,
            is_payer=True,
            first_name=booker_name.get("first_name", ""),
            last_name=booker_name.get("last_name", ""),
            email=booker.get("email"),
            phone=booker.get("telephone")
        )
        
        # Build room
        res_room = ReservationRoom(
            room_type_code=room.get("room_id", ""),
            room_type_name=room.get("room_name", ""),
            adults=guests_info.get("adults", 1),
            children=guests_info.get("children", 0),
            rate_code="BKG_RATE",
            rate_name="Booking.com Rate",
            rate_type=RateType.NON_REFUNDABLE if raw_data.get("cancellation_policy") == "non_refundable" else RateType.FLEXIBLE,
            daily_rate=price.get("total", 0) / max(nights, 1),
            currency=price.get("currency", "EUR"),
            meal_plan=meal_plan_map.get(room.get("meal_plan"), MealPlan.ROOM_ONLY)
        )
        
        total = price.get("total", 0)
        commission = price.get("commission", 0)
        
        return UniversalReservation(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=raw_data["reservation_id"],
            source_raw_data=raw_data,
            transformation_log=transformation_log,
            
            confirmation_number=raw_data["reservation_id"],
            external_confirmation_number=raw_data["reservation_id"],
            
            channel=ChannelType.BOOKING_COM,
            channel_reference=raw_data["reservation_id"],
            
            status=status_map.get(raw_data.get("status"), ReservationStatus.CONFIRMED),
            
            check_in_date=raw_data["checkin"],
            check_out_date=raw_data["checkout"],
            nights=nights,
            
            guests=[guest],
            primary_guest_id=booker.get("booker_id"),
            total_adults=guests_info.get("adults", 1),
            total_children=guests_info.get("children", 0),
            
            rooms=[res_room],
            
            total_amount=total,
            currency=price.get("currency", "EUR"),
            room_charges=total,
            
            commission_rate=price.get("commission_percentage"),
            commission_amount=commission,
            net_amount=total - commission,
            
            meal_plan=meal_plan_map.get(room.get("meal_plan"), MealPlan.ROOM_ONLY),
            
            special_requests=[raw_data["special_requests"]] if raw_data.get("special_requests") else [],
            
            is_refundable=raw_data.get("cancellation_policy") != "non_refundable",
            cancellation_policy=raw_data.get("cancellation_policy"),
        )
