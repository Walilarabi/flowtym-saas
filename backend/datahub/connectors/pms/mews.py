"""
Flowtym Data Hub - Mews PMS Connector (MOCKED)

This connector integrates with Mews PMS (Property Management System).
Currently returns mocked data for development and testing.

Real implementation would use: https://mews-systems.gitbook.io/connector-api/
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import uuid

from ..base import BaseConnector, register_connector, ConnectorError
from ...models import (
    ConnectorConfig,
    ConnectorType,
    ConnectorStatus,
    SourceSystem,
    UniversalReservation,
    UniversalGuest,
    UniversalRoom,
    ReservationStatus,
    ChannelType,
    RateType,
    MealPlan,
    RoomStatus,
    GuestType,
    ReservationGuest,
    ReservationRoom,
    ContactInfo,
)


@register_connector
class MewsConnector(BaseConnector):
    """
    Mews PMS Connector
    
    Mews is a cloud-based property management system used by hotels.
    This connector handles:
    - Reservations (bookings, modifications, cancellations)
    - Guests (customer profiles)
    - Rooms (inventory)
    - Rates and availability
    
    STATUS: MOCKED - Returns realistic fake data
    """
    
    CONNECTOR_NAME = "mews"
    CONNECTOR_TYPE = ConnectorType.PMS
    DISPLAY_NAME = "Mews PMS"
    SOURCE_SYSTEM = SourceSystem.MEWS
    VERSION = "1.0.0"
    
    # Mock data for realistic responses
    MOCK_ROOM_TYPES = [
        {"code": "STD", "name": "Standard", "base_price": 120},
        {"code": "SUP", "name": "Superieure", "base_price": 160},
        {"code": "DLX", "name": "Deluxe", "base_price": 220},
        {"code": "STE", "name": "Suite", "base_price": 350},
        {"code": "FAM", "name": "Familiale", "base_price": 280},
    ]
    
    MOCK_GUEST_NAMES = [
        ("Jean", "Dupont"), ("Marie", "Martin"), ("Pierre", "Bernard"),
        ("Sophie", "Petit"), ("Thomas", "Robert"), ("Camille", "Richard"),
        ("Lucas", "Durand"), ("Emma", "Leroy"), ("Hugo", "Moreau"), ("Lea", "Simon"),
    ]
    
    async def connect(self) -> bool:
        """Connect to Mews API (mocked)."""
        # In real implementation: authenticate with Mews API
        self.logger.info(f"[MOCK] Connecting to Mews PMS for hotel {self.config.external_hotel_id}")
        
        # Simulate connection check
        if not self.config.auth.api_key:
            self._last_error = "API key not configured"
            return False
        
        self._is_connected = True
        self.logger.info("[MOCK] Connected to Mews PMS successfully")
        return True
    
    async def disconnect(self) -> bool:
        """Disconnect from Mews API."""
        self._is_connected = False
        self.logger.info("[MOCK] Disconnected from Mews PMS")
        return True
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Mews connection."""
        return {
            "success": True,
            "message": "[MOCK] Mews PMS connection test successful",
            "hotel_id": self.config.external_hotel_id or "MOCK-HOTEL-001",
            "api_version": "2.0",
            "features": ["reservations", "guests", "rooms", "rates"]
        }
    
    async def fetch_reservations(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch reservations from Mews (mocked)."""
        self.logger.info(f"[MOCK] Fetching reservations: {from_date} to {to_date}")
        
        # Generate mock reservations
        reservations = []
        
        start = datetime.strptime(from_date, "%Y-%m-%d") if from_date else datetime.now()
        end = datetime.strptime(to_date, "%Y-%m-%d") if to_date else start + timedelta(days=30)
        
        num_reservations = min(limit, random.randint(5, 20))
        
        for i in range(num_reservations):
            check_in = start + timedelta(days=random.randint(0, (end - start).days))
            nights = random.randint(1, 7)
            room_type = random.choice(self.MOCK_ROOM_TYPES)
            guest = random.choice(self.MOCK_GUEST_NAMES)
            
            reservations.append({
                "Id": f"mews-res-{uuid.uuid4().hex[:8]}",
                "Number": f"MEWS{random.randint(100000, 999999)}",
                "State": random.choice(["Confirmed", "Started", "Processed"]),
                "StartUtc": check_in.isoformat() + "Z",
                "EndUtc": (check_in + timedelta(days=nights)).isoformat() + "Z",
                "CreatedUtc": (check_in - timedelta(days=random.randint(1, 30))).isoformat() + "Z",
                "UpdatedUtc": datetime.utcnow().isoformat() + "Z",
                "Customer": {
                    "Id": f"mews-guest-{uuid.uuid4().hex[:8]}",
                    "FirstName": guest[0],
                    "LastName": guest[1],
                    "Email": f"{guest[0].lower()}.{guest[1].lower()}@email.com",
                    "Phone": f"+33 6 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}"
                },
                "RequestedResourceCategoryId": room_type["code"],
                "RoomCategory": {
                    "Id": room_type["code"],
                    "Name": room_type["name"]
                },
                "AssignedResourceId": f"room-{random.randint(101, 450)}",
                "AssignedRoom": f"{random.randint(1, 4)}{random.randint(0, 9)}{random.randint(1, 9)}",
                "AdultCount": random.randint(1, 2),
                "ChildCount": random.randint(0, 2),
                "TotalAmount": {
                    "Value": room_type["base_price"] * nights,
                    "Currency": "EUR"
                },
                "Origin": random.choice(["Mews", "ChannelManager", "BookingEngine"]),
                "Notes": random.choice([None, "Early check-in requested", "Late checkout", "VIP guest"]),
            })
        
        return {
            "data": reservations,
            "cursor": None,  # No pagination in mock
            "total": len(reservations)
        }
    
    async def fetch_guests(
        self,
        modified_since: Optional[datetime] = None,
        limit: int = 100,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch guests from Mews (mocked)."""
        guests = []
        
        for first_name, last_name in self.MOCK_GUEST_NAMES[:limit]:
            guests.append({
                "Id": f"mews-guest-{uuid.uuid4().hex[:8]}",
                "FirstName": first_name,
                "LastName": last_name,
                "Email": f"{first_name.lower()}.{last_name.lower()}@email.com",
                "Phone": f"+33 6 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
                "NationalityCode": "FRA",
                "LanguageCode": "fr",
                "Address": {
                    "Line1": f"{random.randint(1, 100)} Rue de Paris",
                    "City": random.choice(["Paris", "Lyon", "Marseille", "Bordeaux"]),
                    "PostalCode": f"{random.randint(10, 99)}000",
                    "CountryCode": "FR"
                },
                "CreatedUtc": datetime.utcnow().isoformat() + "Z",
            })
        
        return {
            "data": guests,
            "cursor": None,
            "total": len(guests)
        }
    
    async def fetch_rooms(self) -> Dict[str, Any]:
        """Fetch room inventory from Mews (mocked)."""
        rooms = []
        
        for floor in range(1, 5):
            for room_num in range(1, 11):
                room_type = self.MOCK_ROOM_TYPES[room_num % len(self.MOCK_ROOM_TYPES)]
                rooms.append({
                    "Id": f"mews-room-{floor}{room_num:02d}",
                    "Number": f"{floor}{room_num:02d}",
                    "FloorNumber": floor,
                    "Category": room_type,
                    "State": random.choice(["Clean", "Dirty", "Inspected", "OutOfService"]),
                    "IsActive": True
                })
        
        return {
            "data": rooms,
            "total": len(rooms)
        }
    
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> UniversalReservation:
        """Transform Mews reservation to universal format."""
        
        # Map Mews states to universal statuses
        status_map = {
            "Enquired": ReservationStatus.PENDING,
            "Requested": ReservationStatus.PENDING,
            "Optional": ReservationStatus.PENDING,
            "Confirmed": ReservationStatus.CONFIRMED,
            "Started": ReservationStatus.CHECKED_IN,
            "Processed": ReservationStatus.CHECKED_OUT,
            "Canceled": ReservationStatus.CANCELLED,
        }
        
        customer = raw_data.get("Customer", {})
        room_cat = raw_data.get("RoomCategory", {})
        total = raw_data.get("TotalAmount", {})
        
        # Calculate nights
        check_in = datetime.fromisoformat(raw_data["StartUtc"].replace("Z", "+00:00"))
        check_out = datetime.fromisoformat(raw_data["EndUtc"].replace("Z", "+00:00"))
        nights = (check_out.date() - check_in.date()).days
        
        # Build transformation log
        transformation_log = [
            self.create_transformation_log(
                "State", raw_data.get("State"), status_map.get(raw_data.get("State"), ReservationStatus.CONFIRMED).value,
                "mews_state_to_universal_status"
            )
        ]
        
        # Build guest
        guest = ReservationGuest(
            guest_id=customer.get("Id", ""),
            is_primary=True,
            is_payer=True,
            first_name=customer.get("FirstName", ""),
            last_name=customer.get("LastName", ""),
            email=customer.get("Email"),
            phone=customer.get("Phone")
        )
        
        # Build room
        room = ReservationRoom(
            room_type_code=room_cat.get("Id", ""),
            room_type_name=room_cat.get("Name", ""),
            room_number=raw_data.get("AssignedRoom"),
            adults=raw_data.get("AdultCount", 1),
            children=raw_data.get("ChildCount", 0),
            rate_code="STANDARD",
            rate_name="Tarif Standard",
            daily_rate=total.get("Value", 0) / max(nights, 1),
            currency=total.get("Currency", "EUR")
        )
        
        return UniversalReservation(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=raw_data["Id"],
            source_raw_data=raw_data,
            transformation_log=transformation_log,
            
            confirmation_number=raw_data.get("Number", ""),
            pms_confirmation_number=raw_data.get("Number"),
            
            channel=ChannelType.DIRECT if raw_data.get("Origin") == "Mews" else ChannelType.CHANNEL_MANAGER,
            
            status=status_map.get(raw_data.get("State"), ReservationStatus.CONFIRMED),
            
            check_in_date=check_in.strftime("%Y-%m-%d"),
            check_out_date=check_out.strftime("%Y-%m-%d"),
            nights=nights,
            
            guests=[guest],
            primary_guest_id=customer.get("Id"),
            total_adults=raw_data.get("AdultCount", 1),
            total_children=raw_data.get("ChildCount", 0),
            
            rooms=[room],
            
            total_amount=total.get("Value", 0),
            currency=total.get("Currency", "EUR"),
            room_charges=total.get("Value", 0),
            
            guest_notes=raw_data.get("Notes"),
        )
    
    def normalize_guest(self, raw_data: Dict[str, Any]) -> UniversalGuest:
        """Transform Mews guest to universal format."""
        address = raw_data.get("Address", {})
        
        return UniversalGuest(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=raw_data["Id"],
            source_raw_data=raw_data,
            
            first_name=raw_data.get("FirstName", ""),
            last_name=raw_data.get("LastName", ""),
            full_name=f"{raw_data.get('FirstName', '')} {raw_data.get('LastName', '')}".strip(),
            guest_type=GuestType.INDIVIDUAL,
            
            contact=ContactInfo(
                email=raw_data.get("Email"),
                phone=raw_data.get("Phone"),
                address_line1=address.get("Line1"),
                city=address.get("City"),
                postal_code=address.get("PostalCode"),
                country=address.get("CountryCode", "FR")
            ),
            
            nationality=raw_data.get("NationalityCode"),
            preferred_language=raw_data.get("LanguageCode", "fr"),
        )
