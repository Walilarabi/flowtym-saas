"""
Hoptym RMS Module - Backend API Tests
Tests for Revenue Management System endpoints including:
- Configuration endpoints
- Strategy management
- Weight factors
- Pricing engine
- Recommendations
- Calendar
- Connectors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')
HOTEL_ID = "hotel-test-123"


class TestRMSConfig:
    """Tests for RMS Configuration endpoints"""
    
    def test_get_config_returns_default(self):
        """GET /api/rms/hotels/{hotel_id}/config returns default config"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert data["hotel_id"] == HOTEL_ID
        assert "is_enabled" in data
        assert "strategy_config" in data
        assert "weight_config" in data
        assert "connector_config" in data
        
        # Verify strategy config structure
        strategy_config = data["strategy_config"]
        assert "active_strategy" in strategy_config
        assert "strategies" in strategy_config
        assert "autopilot_enabled" in strategy_config
        assert "autopilot_confidence_threshold" in strategy_config
        
        # Verify weight config structure
        weight_config = data["weight_config"]
        assert "factors" in weight_config
        assert len(weight_config["factors"]) == 5  # 5 weight factors
        
        print(f"✓ Config returned with hotel_id: {data['hotel_id']}")
        print(f"✓ Active strategy: {strategy_config['active_strategy']}")
        print(f"✓ Weight factors count: {len(weight_config['factors'])}")


class TestRMSKPIs:
    """Tests for RMS KPIs endpoints"""
    
    def test_get_kpis_returns_data(self):
        """GET /api/rms/hotels/{hotel_id}/kpis returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/kpis")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert data["hotel_id"] == HOTEL_ID
        assert "current" in data
        assert "targets" in data
        assert "period" in data
        
        # Verify current KPIs
        current = data["current"]
        assert "revpar" in current
        assert "adr" in current
        assert "occupancy_pct" in current
        assert "total_revenue" in current
        assert "rooms_available" in current
        assert "rooms_sold" in current
        
        # Verify targets
        targets = data["targets"]
        assert "revpar" in targets
        assert "adr" in targets
        assert "occupancy" in targets
        
        print(f"✓ KPIs returned for hotel: {data['hotel_id']}")
        print(f"✓ Current RevPAR: {current['revpar']}")
        print(f"✓ Current ADR: {current['adr']}")
        print(f"✓ Current Occupancy: {current['occupancy_pct']}%")


class TestRMSStrategy:
    """Tests for RMS Strategy endpoints"""
    
    def test_get_strategy_returns_4_strategies(self):
        """GET /api/rms/hotels/{hotel_id}/strategy returns strategy with 4 strategies"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert "active_strategy" in data
        assert "strategies" in data
        assert "autopilot_enabled" in data
        assert "autopilot_confidence_threshold" in data
        
        # Verify 4 strategies exist
        strategies = data["strategies"]
        assert len(strategies) == 4, f"Expected 4 strategies, got {len(strategies)}"
        
        # Verify strategy types
        strategy_types = [s["strategy_type"] for s in strategies]
        assert "conservative" in strategy_types
        assert "balanced" in strategy_types
        assert "aggressive" in strategy_types
        assert "dynamic" in strategy_types
        
        # Verify each strategy has required fields
        for strategy in strategies:
            assert "strategy_type" in strategy
            assert "name" in strategy
            assert "description" in strategy
            assert "emoji" in strategy
            assert "tag" in strategy
            assert "parameters" in strategy
            
            # Verify parameters
            params = strategy["parameters"]
            assert "price_elasticity" in params
            assert "min_price_floor_pct" in params
            assert "max_price_ceiling_pct" in params
            assert "competitor_weight" in params
            assert "demand_sensitivity" in params
        
        print(f"✓ Strategy config returned with {len(strategies)} strategies")
        print(f"✓ Active strategy: {data['active_strategy']}")
        print(f"✓ Autopilot enabled: {data['autopilot_enabled']}")
    
    def test_update_active_strategy(self):
        """PUT /api/rms/hotels/{hotel_id}/strategy updates active strategy"""
        # Update to aggressive strategy
        response = requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={"active_strategy": "aggressive"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy")
        verify_data = verify_response.json()
        assert verify_data["active_strategy"] == "aggressive"
        
        # Reset to balanced
        requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={"active_strategy": "balanced"}
        )
        
        print("✓ Strategy updated to aggressive successfully")
        print("✓ Strategy reset to balanced")
    
    def test_update_autopilot_settings(self):
        """PUT /api/rms/hotels/{hotel_id}/strategy updates autopilot settings"""
        # Enable autopilot
        response = requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={
                "autopilot_enabled": True,
                "autopilot_confidence_threshold": 0.80
            }
        )
        
        assert response.status_code == 200
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy")
        verify_data = verify_response.json()
        assert verify_data["autopilot_enabled"] == True
        assert verify_data["autopilot_confidence_threshold"] == 0.80
        
        # Reset autopilot
        requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={"autopilot_enabled": False, "autopilot_confidence_threshold": 0.75}
        )
        
        print("✓ Autopilot enabled successfully")
        print("✓ Confidence threshold updated to 0.80")


class TestRMSWeights:
    """Tests for RMS Weight factors endpoints"""
    
    def test_get_weights_returns_factors(self):
        """GET /api/rms/hotels/{hotel_id}/weights returns weight factors"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert "factors" in data
        
        # Verify 5 factors
        factors = data["factors"]
        assert len(factors) == 5, f"Expected 5 factors, got {len(factors)}"
        
        # Verify factor IDs
        factor_ids = [f["factor_id"] for f in factors]
        assert "demand" in factor_ids
        assert "competition" in factor_ids
        assert "events" in factor_ids
        assert "seasonality" in factor_ids
        assert "historical" in factor_ids
        
        # Verify each factor has required fields
        for factor in factors:
            assert "factor_id" in factor
            assert "label" in factor
            assert "value" in factor
            assert "color" in factor
            assert 0 <= factor["value"] <= 100
        
        # Verify total is 100
        total = sum(f["value"] for f in factors)
        assert total == 100, f"Expected total 100, got {total}"
        
        print(f"✓ Weights returned with {len(factors)} factors")
        print(f"✓ Total weight: {total}%")
    
    def test_update_weights(self):
        """PUT /api/rms/hotels/{hotel_id}/weights updates weight factors"""
        # Get current weights
        current_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights")
        current_data = current_response.json()
        original_factors = current_data["factors"]
        
        # Update weights (must sum to 100)
        new_factors = [
            {"factor_id": "demand", "label": "Demande", "value": 30, "color": "#4f46e5"},
            {"factor_id": "competition", "label": "Concurrence", "value": 25, "color": "#0891b2"},
            {"factor_id": "events", "label": "Événements", "value": 10, "color": "#059669"},
            {"factor_id": "seasonality", "label": "Saisonnalité", "value": 20, "color": "#d97706"},
            {"factor_id": "historical", "label": "Historique", "value": 15, "color": "#dc2626"},
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights",
            json={"factors": new_factors}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights")
        verify_data = verify_response.json()
        
        demand_factor = next(f for f in verify_data["factors"] if f["factor_id"] == "demand")
        assert demand_factor["value"] == 30
        
        # Reset to original
        requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights",
            json={"factors": original_factors}
        )
        
        print("✓ Weights updated successfully")
        print("✓ Demand weight changed to 30%")
    
    def test_weights_validation_sum_100(self):
        """PUT /api/rms/hotels/{hotel_id}/weights validates sum equals 100"""
        # Try to update with invalid sum (not 100)
        invalid_factors = [
            {"factor_id": "demand", "label": "Demande", "value": 30, "color": "#4f46e5"},
            {"factor_id": "competition", "label": "Concurrence", "value": 30, "color": "#0891b2"},
            {"factor_id": "events", "label": "Événements", "value": 30, "color": "#059669"},
            {"factor_id": "seasonality", "label": "Saisonnalité", "value": 30, "color": "#d97706"},
            {"factor_id": "historical", "label": "Historique", "value": 30, "color": "#dc2626"},
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/weights",
            json={"factors": invalid_factors}
        )
        
        # Should return 400 error
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
        print("✓ Validation correctly rejects weights not summing to 100")


class TestRMSEngine:
    """Tests for RMS Pricing Engine endpoints"""
    
    def test_run_engine_generates_recommendations(self):
        """POST /api/rms/hotels/{hotel_id}/engine/run executes pricing engine"""
        response = requests.post(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/engine/run")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["status"] == "success"
        assert "run_id" in data
        assert "recommendations_count" in data
        assert "pricing_updates" in data
        assert "analysis" in data
        assert "kpis" in data
        
        # Verify recommendations were generated
        assert data["recommendations_count"] >= 0
        assert data["pricing_updates"] >= 0
        
        # Verify KPIs in response
        kpis = data["kpis"]
        assert "revpar" in kpis
        assert "adr" in kpis
        assert "occupancy" in kpis
        
        print(f"✓ Engine run completed with run_id: {data['run_id']}")
        print(f"✓ Recommendations generated: {data['recommendations_count']}")
        print(f"✓ Pricing updates: {data['pricing_updates']}")


class TestRMSRecommendations:
    """Tests for RMS Recommendations endpoints"""
    
    def test_get_recommendations(self):
        """GET /api/rms/hotels/{hotel_id}/recommendations returns recommendations"""
        # First run engine to ensure recommendations exist
        requests.post(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/engine/run")
        
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/recommendations")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert data["hotel_id"] == HOTEL_ID
        assert "count" in data
        assert "recommendations" in data
        
        # If recommendations exist, verify structure
        if data["count"] > 0:
            rec = data["recommendations"][0]
            assert "id" in rec
            assert "type" in rec
            assert "priority" in rec
            assert "title" in rec
            assert "description" in rec
            assert "confidence_score" in rec
            assert "target_dates" in rec
            
            print(f"✓ Recommendations returned: {data['count']}")
            print(f"✓ First recommendation: {rec['title']}")
        else:
            print("✓ Recommendations endpoint working (no recommendations currently)")


class TestRMSCalendar:
    """Tests for RMS Pricing Calendar endpoints"""
    
    def test_get_calendar_returns_pricing_data(self):
        """GET /api/rms/hotels/{hotel_id}/calendar returns pricing calendar"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/calendar")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert data["hotel_id"] == HOTEL_ID
        assert "period" in data
        assert "days" in data
        
        # Verify period
        period = data["period"]
        assert "from" in period
        assert "to" in period
        
        # Verify days data
        days = data["days"]
        assert len(days) > 0, "Calendar should have days"
        
        # Verify first day structure
        first_day_key = list(days.keys())[0]
        first_day = days[first_day_key]
        
        assert "date" in first_day
        assert "final_price" in first_day
        assert "occupancy_forecast" in first_day
        assert "demand_level" in first_day
        
        # Verify price is reasonable (final_price should always be > 0)
        assert first_day["final_price"] > 0
        assert 0 <= first_day["occupancy_forecast"] <= 100
        
        print(f"✓ Calendar returned with {len(days)} days")
        print(f"✓ Period: {period['from']} to {period['to']}")
        print(f"✓ First day price: €{first_day['final_price']}")


class TestRMSConnectors:
    """Tests for RMS Connectors endpoints"""
    
    def test_get_connectors_status(self):
        """GET /api/rms/hotels/{hotel_id}/connectors/status returns connector statuses"""
        response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/connectors/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "hotel_id" in data
        assert data["hotel_id"] == HOTEL_ID
        assert "connectors" in data
        
        connectors = data["connectors"]
        
        # Verify all 5 connectors exist
        assert "pms" in connectors
        assert "channel_manager" in connectors
        assert "booking_engine" in connectors
        assert "lighthouse" in connectors
        assert "dedge" in connectors
        
        # Verify PMS connector structure (internal connector)
        pms = connectors["pms"]
        assert "name" in pms
        assert "description" in pms
        assert "enabled" in pms
        assert "status" in pms
        assert pms["enabled"] == True  # PMS should be enabled by default
        assert pms["status"] == "connected"
        
        # Verify Lighthouse connector (external, mocked)
        lighthouse = connectors["lighthouse"]
        assert lighthouse["enabled"] == False  # Disabled by default (no API key)
        assert lighthouse["status"] == "disconnected"
        assert lighthouse.get("requires_api_key") == True
        
        # Verify D-EDGE connector (external, mocked)
        dedge = connectors["dedge"]
        assert dedge["enabled"] == False
        assert dedge["status"] == "disconnected"
        assert dedge.get("requires_api_key") == True
        
        print(f"✓ Connectors status returned for {len(connectors)} connectors")
        print(f"✓ PMS: {pms['status']}")
        print(f"✓ Channel Manager: {connectors['channel_manager']['status']}")
        print(f"✓ Lighthouse: {lighthouse['status']} (MOCKED)")
        print(f"✓ D-EDGE: {dedge['status']} (MOCKED)")


class TestRMSIntegration:
    """Integration tests for RMS workflow"""
    
    def test_full_workflow(self):
        """Test complete RMS workflow: config -> strategy -> engine -> recommendations"""
        # 1. Get config
        config_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/config")
        assert config_response.status_code == 200
        print("✓ Step 1: Config retrieved")
        
        # 2. Update strategy
        strategy_response = requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={"active_strategy": "dynamic"}
        )
        assert strategy_response.status_code == 200
        print("✓ Step 2: Strategy updated to dynamic")
        
        # 3. Run engine
        engine_response = requests.post(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/engine/run")
        assert engine_response.status_code == 200
        engine_data = engine_response.json()
        print(f"✓ Step 3: Engine run completed ({engine_data['recommendations_count']} recommendations)")
        
        # 4. Get recommendations
        recs_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/recommendations")
        assert recs_response.status_code == 200
        recs_data = recs_response.json()
        print(f"✓ Step 4: Recommendations retrieved ({recs_data['count']} total)")
        
        # 5. Get calendar
        calendar_response = requests.get(f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/calendar")
        assert calendar_response.status_code == 200
        calendar_data = calendar_response.json()
        print(f"✓ Step 5: Calendar retrieved ({len(calendar_data['days'])} days)")
        
        # 6. Reset strategy
        requests.put(
            f"{BASE_URL}/api/rms/hotels/{HOTEL_ID}/strategy",
            json={"active_strategy": "balanced"}
        )
        print("✓ Step 6: Strategy reset to balanced")
        
        print("\n✓ Full RMS workflow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
