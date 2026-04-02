"""
Test Flowboard and Integrations Hub APIs
Tests for:
- Flowboard KPIs, Timeline, Alerts, AI Suggestions, Quick Actions
- Integrations Hub - Available integrations, CRUD operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"

# Test credentials
TEST_EMAIL = "admin@flowtym.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestFlowboardAPI:
    """Test Flowboard Dashboard API endpoints"""
    
    def test_get_flowboard_data(self, auth_headers):
        """Test GET /api/flowboard/hotels/{hotel_id}/data - Main dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/data",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "hotel_id" in data, "Missing hotel_id"
        assert "hotel_name" in data, "Missing hotel_name"
        assert "date" in data, "Missing date"
        assert "kpis" in data, "Missing kpis"
        assert "timeline" in data, "Missing timeline"
        assert "alerts" in data, "Missing alerts"
        assert "ai_suggestions" in data, "Missing ai_suggestions"
        
        # Verify KPIs structure - should have pms KPIs
        assert "pms" in data["kpis"], "Missing pms KPIs"
        pms_kpis = data["kpis"]["pms"]
        assert isinstance(pms_kpis, list), "pms KPIs should be a list"
        
        # Verify 6 main KPIs exist (Occupation, ADR, RevPAR, CA Jour, Arrivées, Départs)
        kpi_ids = [kpi["id"] for kpi in pms_kpis]
        expected_kpis = ["occ", "adr", "revpar", "revenue", "arrivals", "departures"]
        for expected in expected_kpis:
            assert expected in kpi_ids, f"Missing KPI: {expected}"
        
        # Verify KPI structure
        for kpi in pms_kpis:
            assert "id" in kpi, "KPI missing id"
            assert "label" in kpi, "KPI missing label"
            assert "value" in kpi, "KPI missing value"
            assert "source_module" in kpi, "KPI missing source_module"
        
        print(f"✓ Flowboard data retrieved successfully with {len(pms_kpis)} PMS KPIs")
        print(f"  - Timeline events: {len(data['timeline'])}")
        print(f"  - Alerts: {len(data['alerts'])}")
        print(f"  - AI Suggestions: {len(data['ai_suggestions'])}")
    
    def test_get_quick_actions(self, auth_headers):
        """Test GET /api/flowboard/hotels/{hotel_id}/quick-actions"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/quick-actions",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "actions" in data, "Missing actions"
        
        actions = data["actions"]
        assert isinstance(actions, list), "Actions should be a list"
        assert len(actions) > 0, "Should have at least one quick action"
        
        # Verify action structure
        for action in actions:
            assert "id" in action, "Action missing id"
            assert "label" in action, "Action missing label"
            assert "icon" in action, "Action missing icon"
            assert "url" in action, "Action missing url"
        
        # Verify expected actions exist
        action_ids = [a["id"] for a in actions]
        expected_actions = ["new-reservation", "check-in", "check-out", "housekeeping"]
        for expected in expected_actions:
            assert expected in action_ids, f"Missing quick action: {expected}"
        
        print(f"✓ Quick actions retrieved: {len(actions)} actions")
        for action in actions:
            print(f"  - {action['id']}: {action['label']}")
    
    def test_get_dashboard_layout(self, auth_headers):
        """Test GET /api/flowboard/hotels/{hotel_id}/layout"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/layout",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing layout id"
        assert "widgets" in data, "Missing widgets"
        assert "hotel_id" in data, "Missing hotel_id"
        
        widgets = data["widgets"]
        assert isinstance(widgets, list), "Widgets should be a list"
        
        print(f"✓ Dashboard layout retrieved with {len(widgets)} widgets")
    
    def test_get_sync_status(self, auth_headers):
        """Test GET /api/flowboard/hotels/{hotel_id}/sync-status"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/sync-status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data, "Missing hotel_id"
        assert "modules" in data, "Missing modules"
        assert "overall_status" in data, "Missing overall_status"
        
        modules = data["modules"]
        assert isinstance(modules, list), "Modules should be a list"
        
        # Verify module structure
        for module in modules:
            assert "module" in module, "Module missing name"
            assert "status" in module, "Module missing status"
        
        print(f"✓ Sync status retrieved: {data['overall_status']}")
        print(f"  - Modules: {len(modules)}")


class TestIntegrationsAPI:
    """Test Integrations Hub API endpoints"""
    
    def test_get_available_integrations(self, auth_headers):
        """Test GET /api/integrations/available - List all available providers"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one available integration"
        
        # Verify expected providers exist
        providers = [i["provider"] for i in data]
        expected_providers = ["mews", "medialog", "d-edge"]
        for expected in expected_providers:
            assert expected in providers, f"Missing provider: {expected}"
        
        # Verify integration structure
        for integration in data:
            assert "provider" in integration, "Missing provider"
            assert "name" in integration, "Missing name"
            assert "description" in integration, "Missing description"
            assert "integration_type" in integration, "Missing integration_type"
            assert "required_credentials" in integration, "Missing required_credentials"
            assert "supported_features" in integration, "Missing supported_features"
        
        # Verify PMS and Channel Manager types
        pms_integrations = [i for i in data if i["integration_type"] == "pms"]
        cm_integrations = [i for i in data if i["integration_type"] == "channel_manager"]
        
        assert len(pms_integrations) > 0, "Should have PMS integrations"
        assert len(cm_integrations) > 0, "Should have Channel Manager integrations"
        
        print(f"✓ Available integrations retrieved: {len(data)} providers")
        print(f"  - PMS: {len(pms_integrations)}")
        print(f"  - Channel Managers: {len(cm_integrations)}")
        for i in data:
            print(f"  - {i['provider']}: {i['name']} ({i['integration_type']})")
    
    def test_get_integration_details(self, auth_headers):
        """Test GET /api/integrations/available/{provider} - Get specific provider details"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/mews",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["provider"] == "mews", "Provider should be mews"
        assert data["name"] == "Mews", "Name should be Mews"
        assert data["integration_type"] == "pms", "Type should be pms"
        assert "client_token" in data["required_credentials"], "Should require client_token"
        assert "access_token" in data["required_credentials"], "Should require access_token"
        
        print(f"✓ Mews integration details retrieved")
        print(f"  - Features: {data['supported_features']}")
        print(f"  - Credentials: {data['required_credentials']}")
    
    def test_get_hotel_integrations(self, auth_headers):
        """Test GET /api/integrations/hotels/{hotel_id} - Get hotel's active integrations"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/hotels/{HOTEL_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Hotel integrations retrieved: {len(data)} active integrations")
        for i in data:
            print(f"  - {i.get('name', 'Unknown')}: {i.get('status', 'unknown')}")
    
    def test_integration_not_found(self, auth_headers):
        """Test GET /api/integrations/available/{provider} - Non-existent provider"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/nonexistent",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent provider returns 404")


class TestFlowboardKPIValidation:
    """Validate Flowboard KPI data values"""
    
    def test_kpi_values_are_valid(self, auth_headers):
        """Verify KPI values are reasonable numbers"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        pms_kpis = data["kpis"]["pms"]
        
        for kpi in pms_kpis:
            value = kpi["value"]
            kpi_id = kpi["id"]
            
            # Verify values are numbers
            assert isinstance(value, (int, float)), f"KPI {kpi_id} value should be a number"
            
            # Verify values are non-negative
            assert value >= 0, f"KPI {kpi_id} value should be non-negative"
            
            # Verify specific KPI ranges
            if kpi_id == "occ":  # Occupation rate
                assert 0 <= value <= 100, f"Occupation rate should be 0-100%, got {value}"
            
            print(f"  ✓ {kpi['label']}: {value}{kpi.get('unit', '')}")
        
        print("✓ All KPI values are valid")
    
    def test_timeline_events_structure(self, auth_headers):
        """Verify timeline events have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        timeline = data["timeline"]
        
        for event in timeline:
            assert "id" in event, "Event missing id"
            assert "time" in event, "Event missing time"
            assert "title" in event, "Event missing title"
            assert "type" in event, "Event missing type"
            assert event["type"] in ["arrival", "departure", "task", "alert", "booking", "payment"], \
                f"Invalid event type: {event['type']}"
        
        print(f"✓ Timeline events structure valid ({len(timeline)} events)")
    
    def test_ai_suggestions_structure(self, auth_headers):
        """Verify AI suggestions have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/flowboard/hotels/{HOTEL_ID}/data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data["ai_suggestions"]
        
        for suggestion in suggestions:
            assert "id" in suggestion, "Suggestion missing id"
            assert "title" in suggestion, "Suggestion missing title"
            assert "description" in suggestion, "Suggestion missing description"
            assert "impact" in suggestion, "Suggestion missing impact"
            assert suggestion["impact"] in ["low", "medium", "high"], \
                f"Invalid impact: {suggestion['impact']}"
            assert "action_items" in suggestion, "Suggestion missing action_items"
            assert isinstance(suggestion["action_items"], list), "action_items should be a list"
        
        print(f"✓ AI suggestions structure valid ({len(suggestions)} suggestions)")


class TestIntegrationsProviderDetails:
    """Test specific integration provider details"""
    
    def test_mews_provider(self, auth_headers):
        """Verify Mews PMS integration details"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/mews",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["provider"] == "mews"
        assert data["integration_type"] == "pms"
        assert data["is_certified"] == True
        assert "reservations" in data["supported_features"]
        assert "guests" in data["supported_features"]
        
        print("✓ Mews provider details verified")
    
    def test_medialog_provider(self, auth_headers):
        """Verify Medialog PMS integration details"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/medialog",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["provider"] == "medialog"
        assert data["integration_type"] == "pms"
        assert data["is_certified"] == True
        
        print("✓ Medialog provider details verified")
    
    def test_dedge_provider(self, auth_headers):
        """Verify D-Edge Channel Manager integration details"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/d-edge",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["provider"] == "d-edge"
        assert data["integration_type"] == "channel_manager"
        assert data["is_certified"] == True
        assert "inventory" in data["supported_features"]
        assert "rates" in data["supported_features"]
        
        print("✓ D-Edge provider details verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
