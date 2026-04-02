"""
Flowtym Data Hub - Lighthouse Rate Shopper Connector (MOCKED)

This connector integrates with Lighthouse (formerly OTA Insight) for
competitive intelligence and market data.

Real implementation would use: https://www.otainsight.com/api
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
    UniversalMarketData,
    CompetitorPrice,
    MealPlan,
)


@register_connector
class LighthouseConnector(BaseConnector):
    """
    Lighthouse Rate Shopper Connector
    
    Lighthouse (formerly OTA Insight) provides competitive intelligence
    including competitor rates, market demand, and revenue insights.
    
    This connector handles:
    - Competitor rate shopping
    - Market demand forecasting
    - Rate parity monitoring
    - Hotel rankings
    
    STATUS: MOCKED - Returns realistic fake data
    """
    
    CONNECTOR_NAME = "lighthouse"
    CONNECTOR_TYPE = ConnectorType.RATE_SHOPPER
    DISPLAY_NAME = "Lighthouse (OTA Insight)"
    SOURCE_SYSTEM = SourceSystem.LIGHTHOUSE
    VERSION = "1.0.0"
    
    MOCK_COMPETITORS = [
        {"id": "comp-1", "name": "Hotel Eiffel Plaza", "stars": 4, "distance_km": 0.5},
        {"id": "comp-2", "name": "Grand Hotel Paris", "stars": 4, "distance_km": 0.8},
        {"id": "comp-3", "name": "Le Petit Palace", "stars": 3, "distance_km": 0.3},
        {"id": "comp-4", "name": "Boutique Hotel Central", "stars": 4, "distance_km": 1.2},
        {"id": "comp-5", "name": "Hotel Saint-Germain", "stars": 4, "distance_km": 0.6},
    ]
    
    MOCK_EVENTS = [
        {"name": "Roland Garros", "impact": 1.4, "months": [5, 6]},
        {"name": "Fashion Week", "impact": 1.5, "months": [1, 2, 9, 10]},
        {"name": "Salon de l'Agriculture", "impact": 1.2, "months": [2, 3]},
        {"name": "14 Juillet", "impact": 1.3, "months": [7]},
        {"name": "Nuit Blanche", "impact": 1.15, "months": [10]},
    ]
    
    async def connect(self) -> bool:
        """Connect to Lighthouse API (mocked)."""
        self.logger.info(f"[MOCK] Connecting to Lighthouse")
        
        if not self.config.auth.api_key:
            self._last_error = "Lighthouse API token not configured"
            return False
        
        self._is_connected = True
        self.logger.info("[MOCK] Connected to Lighthouse successfully")
        return True
    
    async def disconnect(self) -> bool:
        """Disconnect from Lighthouse API."""
        self._is_connected = False
        return True
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Lighthouse connection."""
        return {
            "success": True,
            "message": "[MOCK] Lighthouse connection test successful",
            "subscription_id": self.config.external_hotel_id or "LH-SUB-001",
            "compset_count": len(self.MOCK_COMPETITORS),
            "features": ["rate_shopping", "demand_forecast", "parity", "rankings"]
        }
    
    async def fetch_competitor_rates(
        self,
        from_date: str,
        to_date: str,
        room_type: str = "standard"
    ) -> Dict[str, Any]:
        """Fetch competitor rates (mocked)."""
        self.logger.info(f"[MOCK] Fetching competitor rates: {from_date} to {to_date}")
        
        rates = []
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d")
        
        current = start
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            
            # Check for events
            event = None
            event_multiplier = 1.0
            for e in self.MOCK_EVENTS:
                if current.month in e["months"]:
                    event = e["name"]
                    event_multiplier = e["impact"]
                    break
            
            # Weekend multiplier
            if current.weekday() in [4, 5]:
                event_multiplier *= 1.15
            
            for competitor in self.MOCK_COMPETITORS:
                base_price = 100 + (competitor["stars"] * 30)
                price = round(base_price * event_multiplier * random.uniform(0.9, 1.1), 2)
                
                rates.append({
                    "date": date_str,
                    "competitor_id": competitor["id"],
                    "competitor_name": competitor["name"],
                    "stars": competitor["stars"],
                    "room_type": room_type,
                    "rate": price,
                    "currency": "EUR",
                    "meal_plan": random.choice(["room_only", "breakfast"]),
                    "is_available": random.random() > 0.1,
                    "ota": "booking_com",
                    "extracted_at": datetime.utcnow().isoformat()
                })
            
            current += timedelta(days=1)
        
        return {
            "data": rates,
            "competitors": self.MOCK_COMPETITORS,
            "total_dates": (end - start).days + 1
        }
    
    async def fetch_market_demand(
        self,
        from_date: str,
        to_date: str
    ) -> Dict[str, Any]:
        """Fetch market demand forecast (mocked)."""
        self.logger.info(f"[MOCK] Fetching market demand: {from_date} to {to_date}")
        
        demand_data = []
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d")
        
        current = start
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            
            # Base demand
            base_demand = 50
            
            # Seasonal adjustments
            if current.month in [6, 7, 8]:  # Summer
                base_demand += 20
            elif current.month == 12:  # December
                base_demand += 15
            
            # Weekend adjustment
            if current.weekday() in [4, 5]:
                base_demand += 15
            
            # Event adjustment
            for e in self.MOCK_EVENTS:
                if current.month in e["months"]:
                    base_demand += int(20 * (e["impact"] - 1))
                    break
            
            demand_score = min(100, base_demand + random.randint(-10, 10))
            
            demand_level = "low"
            if demand_score > 80:
                demand_level = "peak"
            elif demand_score > 60:
                demand_level = "high"
            elif demand_score > 40:
                demand_level = "medium"
            
            demand_data.append({
                "date": date_str,
                "demand_score": demand_score,
                "demand_level": demand_level,
                "price_recommendation": round(100 * (1 + (demand_score - 50) / 100), 2),
                "compression_events": [],
                "extracted_at": datetime.utcnow().isoformat()
            })
            
            current += timedelta(days=1)
        
        return {
            "data": demand_data,
            "average_demand": sum(d["demand_score"] for d in demand_data) / len(demand_data)
        }
    
    async def fetch_rate_parity(self) -> Dict[str, Any]:
        """Fetch rate parity status (mocked)."""
        channels = ["Booking.com", "Expedia", "HRS", "Hotels.com", "Direct"]
        base_rate = 150
        
        parity_data = []
        for channel in channels:
            variance = random.uniform(-0.05, 0.05) if channel != "Direct" else 0
            rate = round(base_rate * (1 + variance), 2)
            
            parity_data.append({
                "channel": channel,
                "rate": rate,
                "base_rate": base_rate,
                "variance_pct": round(variance * 100, 2),
                "is_parity": abs(variance) < 0.02,
                "checked_at": datetime.utcnow().isoformat()
            })
        
        return {
            "data": parity_data,
            "has_parity_issues": any(not p["is_parity"] for p in parity_data)
        }
    
    async def fetch_rankings(self) -> Dict[str, Any]:
        """Fetch hotel rankings (mocked)."""
        return {
            "booking_com": {
                "position": random.randint(5, 20),
                "total_hotels": random.randint(150, 300),
                "score": round(random.uniform(8.0, 9.5), 1)
            },
            "expedia": {
                "position": random.randint(8, 25),
                "total_hotels": random.randint(120, 250),
                "score": round(random.uniform(7.5, 9.0), 1)
            },
            "tripadvisor": {
                "position": random.randint(10, 30),
                "total_hotels": random.randint(200, 400),
                "score": round(random.uniform(4.0, 4.8), 1)
            },
            "updated_at": datetime.utcnow().isoformat()
        }
    
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> None:
        """Lighthouse doesn't have reservations."""
        raise NotImplementedError("Lighthouse connector doesn't handle reservations")
    
    def normalize_market_data(self, date: str, competitor_rates: List[Dict], demand: Dict) -> UniversalMarketData:
        """Transform Lighthouse data to universal market data format."""
        
        competitor_prices = [
            CompetitorPrice(
                competitor_id=r["competitor_id"],
                competitor_name=r["competitor_name"],
                date=date,
                price=r["rate"],
                currency=r["currency"],
                room_type=r.get("room_type"),
                meal_plan=MealPlan.BREAKFAST if r.get("meal_plan") == "breakfast" else MealPlan.ROOM_ONLY,
                is_available=r.get("is_available", True),
                source="lighthouse"
            )
            for r in competitor_rates if r["date"] == date
        ]
        
        prices = [p.price for p in competitor_prices if p.is_available]
        
        return UniversalMarketData(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=f"market-{date}",
            
            date=date,
            
            demand_level=demand.get("demand_level", "medium"),
            demand_score=demand.get("demand_score", 50),
            
            competitor_prices=competitor_prices,
            market_average_price=sum(prices) / len(prices) if prices else None,
            market_min_price=min(prices) if prices else None,
            market_max_price=max(prices) if prices else None,
        )
