"""
Lighthouse API Integration (MOCKED)
Market data, competitor rates, demand forecasting

Based on: https://api.mylighthouse.com/
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import random
import asyncio
from ..models import (
    CompetitorRate, MarketDemand, MarketData, ConnectorStatus, LighthouseConfig
)


class LighthouseConnector:
    """
    Lighthouse API Connector
    
    Provides:
    - Competitor rate shopping
    - Market demand forecasting
    - Hotel rankings
    - Review scores
    
    NOTE: Currently MOCKED - requires real API token for production
    """
    
    BASE_URL = "https://api.mylighthouse.com/v3"
    
    def __init__(self, config: LighthouseConfig):
        self.config = config
        self.api_token = config.api_token
        self.subscription_id = config.subscription_id
        self.is_mocked = not bool(self.api_token)
    
    async def get_competitor_rates(
        self,
        from_date: str,
        shop_length: int = 90,
        ota: str = "bookingdotcom",
        los: int = 1,
        persons: int = 2
    ) -> List[CompetitorRate]:
        """
        Fetch competitor rates from Lighthouse Rates API
        
        Real API endpoint: GET /v3/rates
        """
        if self.is_mocked:
            return await self._mock_competitor_rates(from_date, shop_length)
        
        # Real API call would go here
        # headers = {"X-Oi-Authorization": self.api_token}
        # params = {
        #     "subscriptionId": self.subscription_id,
        #     "ota": ota,
        #     "fromDate": from_date,
        #     "shopLength": shop_length,
        #     "los": los,
        #     "persons": persons,
        #     "compsetIds": ",".join(map(str, self.config.compset_ids))
        # }
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(f"{self.BASE_URL}/rates", headers=headers, params=params)
        #     data = response.json()
        #     return self._parse_rates(data)
        
        return await self._mock_competitor_rates(from_date, shop_length)
    
    async def get_market_demand(
        self,
        num_days: int = 90
    ) -> List[MarketDemand]:
        """
        Fetch market demand forecasts from Lighthouse Demand API
        
        Real API endpoint: GET /v3/demand
        """
        if self.is_mocked:
            return await self._mock_market_demand(num_days)
        
        # Real API call would go here
        return await self._mock_market_demand(num_days)
    
    async def get_market_insight(
        self
    ) -> List[Dict]:
        """
        Fetch market insight data from Lighthouse Market Insight API
        
        Real API endpoint: GET /v3/marketinsight
        """
        if self.is_mocked:
            return await self._mock_market_insight()
        
        return await self._mock_market_insight()
    
    async def get_ranking(
        self,
        ota: str = "bookingdotcom"
    ) -> Dict:
        """
        Fetch hotel ranking from Lighthouse Ranking API
        
        Real API endpoint: GET /v3/ranking
        """
        if self.is_mocked:
            return {
                "ranking": random.randint(1, 20),
                "available_hotels": random.randint(80, 150),
                "extracted_at": datetime.utcnow().isoformat()
            }
        
        return {}
    
    async def get_reviews(
        self,
        ota: str = "bookingdotcom",
        granularity: str = "monthly"
    ) -> Dict:
        """
        Fetch review scores from Lighthouse Reviews API
        
        Real API endpoint: GET /v3/reviews
        """
        if self.is_mocked:
            return {
                "score": round(random.uniform(7.5, 9.5), 1),
                "review_count": random.randint(500, 2000),
                "max_score": 10
            }
        
        return {}
    
    async def sync_all_data(self, hotel_id: str) -> MarketData:
        """
        Synchronize all market data for a hotel
        """
        from_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        competitor_rates = await self.get_competitor_rates(from_date)
        demand_data = await self.get_market_demand()
        ranking = await self.get_ranking()
        reviews = await self.get_reviews()
        
        return MarketData(
            hotel_id=hotel_id,
            lighthouse_subscription_id=self.subscription_id,
            competitor_rates=competitor_rates,
            demand_data=demand_data,
            ranking_position=ranking.get("ranking"),
            ranking_total_hotels=ranking.get("available_hotels"),
            review_score=reviews.get("score"),
            review_count=reviews.get("review_count"),
            last_sync_at=datetime.utcnow(),
            sync_status=ConnectorStatus.CONNECTED if not self.is_mocked else ConnectorStatus.DISCONNECTED
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MOCK DATA GENERATORS
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def _mock_competitor_rates(self, from_date: str, shop_length: int) -> List[CompetitorRate]:
        """Generate realistic mock competitor rates"""
        competitors = [
            {"id": "comp_1", "name": "Hôtel Mercure Centre", "stars": 4, "base_rate": 175},
            {"id": "comp_2", "name": "Novotel Business", "stars": 4, "base_rate": 165},
            {"id": "comp_3", "name": "Ibis Styles Gare", "stars": 3, "base_rate": 125},
            {"id": "comp_4", "name": "Holiday Inn Express", "stars": 3, "base_rate": 140},
            {"id": "comp_5", "name": "Best Western Plus", "stars": 4, "base_rate": 155},
        ]
        
        rates = []
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        
        for day_offset in range(min(shop_length, 90)):
            current_date = start_date + timedelta(days=day_offset)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Day of week factor
            dow = current_date.weekday()
            dow_factor = {0: 0.9, 1: 0.92, 2: 0.95, 3: 1.0, 4: 1.1, 5: 1.2, 6: 1.05}[dow]
            
            # Seasonality factor
            month_factor = {
                1: 0.8, 2: 0.85, 3: 0.95, 4: 1.0, 5: 1.1, 6: 1.2,
                7: 1.25, 8: 1.25, 9: 1.1, 10: 1.0, 11: 0.9, 12: 1.05
            }[current_date.month]
            
            for comp in competitors:
                # Calculate rate with some randomness
                rate = comp["base_rate"] * dow_factor * month_factor
                rate *= random.uniform(0.95, 1.05)  # ±5% variance
                
                # Sometimes sold out
                if random.random() < 0.05:
                    rate = 0
                
                rates.append(CompetitorRate(
                    competitor_id=comp["id"],
                    competitor_name=comp["name"],
                    stars=comp["stars"],
                    date=date_str,
                    rate=round(rate, 2) if rate > 0 else 0,
                    currency="EUR",
                    room_type="standard",
                    room_name="Chambre Standard",
                    meal_included=1,  # Breakfast
                    cancellable=random.random() > 0.3,
                    ota="bookingdotcom",
                    extracted_at=datetime.utcnow()
                ))
        
        return rates
    
    async def _mock_market_demand(self, num_days: int) -> List[MarketDemand]:
        """Generate realistic mock demand data"""
        demand_data = []
        today = datetime.utcnow()
        
        for day_offset in range(num_days):
            current_date = today + timedelta(days=day_offset)
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Base demand varies by day of week
            dow = current_date.weekday()
            base_demand = {0: 2, 1: 2, 2: 3, 3: 3, 4: 4, 5: 5, 6: 4}[dow]
            
            # Seasonality adjustment
            month = current_date.month
            if month in [7, 8, 12]:
                base_demand = min(6, base_demand + 2)
            elif month in [6, 9]:
                base_demand = min(6, base_demand + 1)
            elif month in [1, 2, 11]:
                base_demand = max(1, base_demand - 1)
            
            # Random events
            if random.random() < 0.05:  # 5% chance of event
                base_demand = min(6, base_demand + 2)
            
            # Add some randomness
            demand_index = max(1, min(6, base_demand + random.randint(-1, 1)))
            
            # Calculate raw demand
            demand_raw = (demand_index - 3.5) / 3  # Normalize to approx -0.8 to 0.8
            demand_raw += random.uniform(-0.1, 0.1)
            
            # Price level (inverse relationship with demand in this mock)
            price_level = max(1, min(6, 7 - demand_index + random.randint(-1, 1)))
            
            demand_data.append(MarketDemand(
                date=date_str,
                demand_index=demand_index,
                demand_raw=round(demand_raw, 4),
                price_level=price_level,
                extracted_at=datetime.utcnow()
            ))
        
        return demand_data
    
    async def _mock_market_insight(self) -> List[Dict]:
        """Generate mock market insight data"""
        insights = []
        today = datetime.utcnow()
        
        for day_offset in range(90):
            current_date = today + timedelta(days=day_offset)
            date_str = current_date.strftime("%Y-%m-%d")
            
            insights.append({
                "stay_date": date_str,
                "price_level": random.randint(1, 6),
                "demand_index": random.randint(1, 6),
                "demand_raw": round(random.uniform(-0.5, 0.5), 4),
                "message": ""
            })
        
        return insights


def create_lighthouse_connector(config: LighthouseConfig) -> LighthouseConnector:
    """Factory function to create Lighthouse connector"""
    return LighthouseConnector(config)
