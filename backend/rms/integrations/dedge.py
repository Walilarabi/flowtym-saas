"""
D-EDGE API Integration (MOCKED)
Distribution and hotel performance data

D-EDGE provides:
- Channel performance analytics
- Rate distribution
- Availability management
- Booking data
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import random
from ..models import DEdgeConfig, ConnectorStatus


class DEdgeConnector:
    """
    D-EDGE API Connector
    
    Provides:
    - Channel distribution analytics
    - Rate parity monitoring
    - Booking performance by channel
    - Availability synchronization
    
    NOTE: Currently MOCKED - requires real API key for production
    """
    
    def __init__(self, config: DEdgeConfig):
        self.config = config
        self.api_key = config.api_key
        self.hotel_code = config.hotel_code
        self.is_mocked = not bool(self.api_key)
    
    async def get_channel_performance(
        self,
        from_date: str,
        to_date: str
    ) -> Dict:
        """
        Get channel performance analytics
        """
        if self.is_mocked:
            return await self._mock_channel_performance(from_date, to_date)
        
        # Real API call would go here
        return await self._mock_channel_performance(from_date, to_date)
    
    async def get_rate_parity(
        self,
        check_date: str
    ) -> Dict:
        """
        Check rate parity across channels
        """
        if self.is_mocked:
            return await self._mock_rate_parity(check_date)
        
        return await self._mock_rate_parity(check_date)
    
    async def get_booking_data(
        self,
        from_date: str,
        to_date: str
    ) -> List[Dict]:
        """
        Get booking data by channel
        """
        if self.is_mocked:
            return await self._mock_booking_data(from_date, to_date)
        
        return await self._mock_booking_data(from_date, to_date)
    
    async def push_rates(
        self,
        rates: List[Dict]
    ) -> Dict:
        """
        Push rate updates to distribution channels
        
        rate format:
        {
            "date": "YYYY-MM-DD",
            "room_type": "standard",
            "rate": 150.00,
            "channels": ["booking", "expedia", "direct"]
        }
        """
        if self.is_mocked:
            return {
                "status": "success",
                "message": "MOCK: Rates would be pushed to channels",
                "rates_count": len(rates),
                "channels_updated": ["booking.com", "expedia", "hotels.com"],
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Real API call would go here
        return {}
    
    async def get_availability(
        self,
        from_date: str,
        to_date: str
    ) -> List[Dict]:
        """
        Get availability by room type and channel
        """
        if self.is_mocked:
            return await self._mock_availability(from_date, to_date)
        
        return await self._mock_availability(from_date, to_date)
    
    async def sync_inventory(
        self,
        hotel_id: str
    ) -> Dict:
        """
        Full inventory sync with D-EDGE
        """
        from_date = datetime.utcnow().strftime("%Y-%m-%d")
        to_date = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        channel_perf = await self.get_channel_performance(from_date, to_date)
        bookings = await self.get_booking_data(from_date, to_date)
        availability = await self.get_availability(from_date, to_date)
        
        return {
            "hotel_id": hotel_id,
            "channel_performance": channel_perf,
            "booking_count": len(bookings),
            "availability_days": len(availability),
            "sync_status": ConnectorStatus.CONNECTED.value if not self.is_mocked else ConnectorStatus.DISCONNECTED.value,
            "last_sync": datetime.utcnow().isoformat(),
            "is_mocked": self.is_mocked
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MOCK DATA GENERATORS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def _mock_channel_performance(self, from_date: str, to_date: str) -> Dict:
        """Generate mock channel performance data"""
        channels = [
            {"name": "Booking.com", "code": "booking", "commission": 15},
            {"name": "Expedia", "code": "expedia", "commission": 18},
            {"name": "Hotels.com", "code": "hotels", "commission": 20},
            {"name": "Direct", "code": "direct", "commission": 0},
            {"name": "HRS", "code": "hrs", "commission": 12},
        ]
        
        total_revenue = random.randint(50000, 150000)
        remaining = 100.0
        
        performance = []
        for i, channel in enumerate(channels):
            if i == len(channels) - 1:
                share = remaining
            else:
                share = round(random.uniform(10, 35), 1)
                remaining -= share
            
            revenue = round(total_revenue * share / 100, 2)
            bookings = random.randint(20, 100)
            
            performance.append({
                "channel": channel["name"],
                "code": channel["code"],
                "revenue": revenue,
                "revenue_share_pct": share,
                "bookings": bookings,
                "avg_daily_rate": round(revenue / max(bookings, 1), 2),
                "commission_pct": channel["commission"],
                "net_revenue": round(revenue * (1 - channel["commission"] / 100), 2),
                "room_nights": bookings * random.randint(1, 3)
            })
        
        return {
            "period": {"from": from_date, "to": to_date},
            "total_revenue": total_revenue,
            "total_bookings": sum(c["bookings"] for c in performance),
            "channels": performance
        }
    
    async def _mock_rate_parity(self, check_date: str) -> Dict:
        """Generate mock rate parity data"""
        base_rate = random.randint(150, 250)
        
        return {
            "date": check_date,
            "base_rate": base_rate,
            "parity_status": random.choice(["in_parity", "disparity_detected", "in_parity"]),
            "channels": [
                {
                    "name": "Booking.com",
                    "rate": base_rate + random.randint(-5, 5),
                    "in_parity": random.random() > 0.2
                },
                {
                    "name": "Expedia",
                    "rate": base_rate + random.randint(-10, 10),
                    "in_parity": random.random() > 0.3
                },
                {
                    "name": "Hotels.com",
                    "rate": base_rate + random.randint(-8, 8),
                    "in_parity": random.random() > 0.25
                },
                {
                    "name": "Direct",
                    "rate": base_rate - 10,  # Direct always best rate
                    "in_parity": True
                }
            ]
        }
    
    async def _mock_booking_data(self, from_date: str, to_date: str) -> List[Dict]:
        """Generate mock booking data"""
        bookings = []
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d")
        days = (end - start).days
        
        channels = ["booking", "expedia", "direct", "hotels", "hrs"]
        statuses = ["confirmed", "confirmed", "confirmed", "cancelled", "modified"]
        
        for _ in range(random.randint(50, 150)):
            booking_date = start + timedelta(days=random.randint(0, days))
            check_in = booking_date + timedelta(days=random.randint(1, 30))
            nights = random.randint(1, 5)
            
            bookings.append({
                "booking_id": f"BK{random.randint(10000, 99999)}",
                "channel": random.choice(channels),
                "booking_date": booking_date.strftime("%Y-%m-%d"),
                "check_in": check_in.strftime("%Y-%m-%d"),
                "check_out": (check_in + timedelta(days=nights)).strftime("%Y-%m-%d"),
                "nights": nights,
                "room_type": random.choice(["standard", "superior", "suite"]),
                "rate": random.randint(120, 300),
                "total_revenue": random.randint(150, 1500),
                "status": random.choice(statuses),
                "guest_country": random.choice(["FR", "DE", "GB", "US", "ES", "IT"])
            })
        
        return bookings
    
    async def _mock_availability(self, from_date: str, to_date: str) -> List[Dict]:
        """Generate mock availability data"""
        availability = []
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d")
        
        room_types = [
            {"code": "standard", "name": "Chambre Standard", "total": 30},
            {"code": "superior", "name": "Chambre Supérieure", "total": 15},
            {"code": "suite", "name": "Suite", "total": 5},
        ]
        
        current = start
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            
            for room in room_types:
                sold = random.randint(0, room["total"])
                availability.append({
                    "date": date_str,
                    "room_type": room["code"],
                    "room_name": room["name"],
                    "total_inventory": room["total"],
                    "sold": sold,
                    "available": room["total"] - sold,
                    "overbooking": max(0, sold - room["total"]),
                    "closed": random.random() < 0.02  # 2% chance closed
                })
            
            current += timedelta(days=1)
        
        return availability


def create_dedge_connector(config: DEdgeConfig) -> DEdgeConnector:
    """Factory function to create D-EDGE connector"""
    return DEdgeConnector(config)
