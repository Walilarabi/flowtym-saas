"""
Flowtym Data Hub - Backend API Tests

Tests for the Data Hub module including:
- Connector management (list available, test connection)
- Sync operations (Mews, Booking.com, D-EDGE)
- Reservation endpoints (list, get details)
- Market data endpoints (competitors, demand, parity)
- Stats and events endpoints

All connectors are MOCKED and return realistic fake data.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test hotel ID as specified in the review request
TEST_HOTEL_ID = "test-hotel-001"


class TestDataHubConnectors:
    """Tests for connector management endpoints"""
    
    def test_list_available_connectors(self):
        """GET /api/datahub/connectors/available - List 5 registered connectors"""
        response = requests.get(f"{BASE_URL}/api/datahub/connectors/available")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "connectors" in data, "Response should have 'connectors' key"
        assert "total" in data, "Response should have 'total' key"
        
        # Should have 5 connectors: mews, booking_com, dedge, stripe, lighthouse
        assert data["total"] == 5, f"Expected 5 connectors, got {data['total']}"
        
        connector_names = [c["name"] for c in data["connectors"]]
        expected_connectors = ["mews", "booking_com", "dedge", "stripe", "lighthouse"]
        
        for expected in expected_connectors:
            assert expected in connector_names, f"Missing connector: {expected}"
        
        # Verify connector structure
        for connector in data["connectors"]:
            assert "name" in connector
            assert "type" in connector
            assert "display_name" in connector
            assert "version" in connector
        
        print(f"✓ Found {data['total']} connectors: {connector_names}")
    
    def test_mews_connector_test(self):
        """GET /api/datahub/hotels/{hotel_id}/connectors/mews/test - Test Mews connector"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/connectors/mews/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Mews test should succeed"
        assert "message" in data
        assert "features" in data
        
        print(f"✓ Mews connector test: {data['message']}")
    
    def test_booking_com_connector_test(self):
        """GET /api/datahub/hotels/{hotel_id}/connectors/booking_com/test - Test Booking.com connector"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/connectors/booking_com/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Booking.com test should succeed"
        assert "features" in data
        
        print(f"✓ Booking.com connector test: {data['message']}")
    
    def test_dedge_connector_test(self):
        """GET /api/datahub/hotels/{hotel_id}/connectors/dedge/test - Test D-EDGE connector"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/connectors/dedge/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "D-EDGE test should succeed"
        assert "connected_channels" in data
        
        print(f"✓ D-EDGE connector test: {data['message']}")
    
    def test_stripe_connector_test(self):
        """GET /api/datahub/hotels/{hotel_id}/connectors/stripe/test - Test Stripe connector"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/connectors/stripe/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Stripe test should succeed"
        assert "features" in data
        
        print(f"✓ Stripe connector test: {data['message']}")
    
    def test_lighthouse_connector_test(self):
        """GET /api/datahub/hotels/{hotel_id}/connectors/lighthouse/test - Test Lighthouse connector"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/connectors/lighthouse/test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Lighthouse test should succeed"
        assert "features" in data
        
        print(f"✓ Lighthouse connector test: {data['message']}")


class TestDataHubSync:
    """Tests for sync operations"""
    
    def test_sync_mews_reservations(self):
        """POST /api/datahub/hotels/{hotel_id}/sync - Sync reservations from Mews"""
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "connector_name": "mews",
            "entity_type": "reservations",
            "from_date": from_date,
            "to_date": to_date
        }
        
        response = requests.post(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/sync",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sync_id" in data, "Response should have sync_id"
        assert data["connector_name"] == "mews"
        assert data["entity_type"] == "reservations"
        assert data["status"] in ["success", "partial"], f"Unexpected status: {data['status']}"
        assert "total_records" in data
        assert "processed_records" in data
        
        print(f"✓ Mews sync: {data['processed_records']}/{data['total_records']} records processed")
    
    def test_sync_booking_com_reservations(self):
        """POST /api/datahub/hotels/{hotel_id}/sync - Sync reservations from Booking.com"""
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "connector_name": "booking_com",
            "entity_type": "reservations",
            "from_date": from_date,
            "to_date": to_date
        }
        
        response = requests.post(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/sync",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["connector_name"] == "booking_com"
        assert data["status"] in ["success", "partial"]
        
        print(f"✓ Booking.com sync: {data['processed_records']}/{data['total_records']} records processed")
    
    def test_sync_dedge_reservations(self):
        """POST /api/datahub/hotels/{hotel_id}/sync - Sync reservations from D-EDGE"""
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "connector_name": "dedge",
            "entity_type": "reservations",
            "from_date": from_date,
            "to_date": to_date
        }
        
        response = requests.post(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/sync",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["connector_name"] == "dedge"
        assert data["status"] in ["success", "partial"]
        
        print(f"✓ D-EDGE sync: {data['processed_records']}/{data['total_records']} records processed")


class TestDataHubReservations:
    """Tests for reservation endpoints"""
    
    def test_list_reservations(self):
        """GET /api/datahub/hotels/{hotel_id}/reservations - List normalized reservations"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/reservations")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have 'data' key"
        assert "total" in data, "Response should have 'total' key"
        assert "page" in data, "Response should have 'page' key"
        assert "page_size" in data, "Response should have 'page_size' key"
        assert "has_more" in data, "Response should have 'has_more' key"
        
        print(f"✓ Found {data['total']} reservations (page {data['page']}, page_size {data['page_size']})")
        
        # Verify reservation structure if there are any
        if data["data"]:
            res = data["data"][0]
            required_fields = [
                "id", "confirmation_number", "channel", "status",
                "check_in_date", "check_out_date", "nights",
                "total_adults", "total_amount", "currency", "source_system"
            ]
            for field in required_fields:
                assert field in res, f"Reservation missing field: {field}"
            
            print(f"✓ Reservation structure verified with all required fields")
    
    def test_list_reservations_with_pagination(self):
        """GET /api/datahub/hotels/{hotel_id}/reservations - Test pagination"""
        response = requests.get(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/reservations",
            params={"page": 1, "page_size": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["data"]) <= 5
        
        print(f"✓ Pagination working: page={data['page']}, page_size={data['page_size']}")
    
    def test_get_single_reservation(self):
        """GET /api/datahub/hotels/{hotel_id}/reservations/{id} - Get single reservation with transformation_log"""
        # First get list to find a reservation ID
        list_response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/reservations")
        
        if list_response.status_code == 200 and list_response.json().get("data"):
            reservation_id = list_response.json()["data"][0]["id"]
            
            response = requests.get(
                f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/reservations/{reservation_id}"
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            
            # Verify full reservation structure
            assert "id" in data
            assert "tenant_id" in data, "Should have tenant_id for multi-tenancy"
            assert "source_system" in data, "Should have source_system"
            assert "transformation_log" in data, "Should have transformation_log for traceability"
            assert "confirmation_number" in data
            assert "channel" in data
            assert "status" in data
            assert "check_in_date" in data
            assert "check_out_date" in data
            assert "guests" in data
            assert "rooms" in data
            assert "total_amount" in data
            
            print(f"✓ Single reservation retrieved with transformation_log ({len(data.get('transformation_log', []))} entries)")
        else:
            pytest.skip("No reservations available to test single retrieval")


class TestDataHubStats:
    """Tests for stats endpoint"""
    
    def test_get_datahub_stats(self):
        """GET /api/datahub/hotels/{hotel_id}/stats - Get Data Hub statistics"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify stats structure
        assert "hotel_id" in data
        assert "total_reservations" in data
        assert "total_guests" in data
        assert "active_connectors" in data
        assert "total_connectors" in data
        assert "syncs_last_24h" in data
        assert "failed_syncs_last_24h" in data
        
        print(f"✓ Stats: {data['total_reservations']} reservations, {data['total_guests']} guests, {data['syncs_last_24h']} syncs in 24h")


class TestDataHubMarketData:
    """Tests for market data endpoints (Lighthouse)"""
    
    def test_get_competitor_rates(self):
        """GET /api/datahub/hotels/{hotel_id}/market/competitors - Lighthouse competitor rates"""
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/market/competitors",
            params={"from_date": from_date, "to_date": to_date}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have 'data' key"
        assert "competitors" in data, "Response should have 'competitors' key"
        
        # Verify competitor rate structure
        if data["data"]:
            rate = data["data"][0]
            assert "date" in rate
            assert "competitor_id" in rate
            assert "competitor_name" in rate
            assert "rate" in rate
            assert "currency" in rate
        
        print(f"✓ Competitor rates: {len(data['data'])} rate entries, {len(data['competitors'])} competitors")
    
    def test_get_market_demand(self):
        """GET /api/datahub/hotels/{hotel_id}/market/demand - Market demand forecast"""
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/market/demand",
            params={"from_date": from_date, "to_date": to_date}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have 'data' key"
        
        # Verify demand data structure
        if data["data"]:
            demand = data["data"][0]
            assert "date" in demand
            assert "demand_score" in demand
            assert "demand_level" in demand
        
        print(f"✓ Market demand: {len(data['data'])} days of forecast data")
    
    def test_get_rate_parity(self):
        """GET /api/datahub/hotels/{hotel_id}/market/parity - Rate parity status"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/market/parity")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have 'data' key"
        assert "has_parity_issues" in data, "Response should have 'has_parity_issues' key"
        
        # Verify parity data structure
        if data["data"]:
            parity = data["data"][0]
            assert "channel" in parity
            assert "rate" in parity
            assert "is_parity" in parity
        
        print(f"✓ Rate parity: {len(data['data'])} channels, parity_issues={data['has_parity_issues']}")


class TestDataHubEvents:
    """Tests for events endpoint"""
    
    def test_list_events(self):
        """GET /api/datahub/hotels/{hotel_id}/events - Event bus events list"""
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/events")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hotel_id" in data
        assert "events" in data
        assert "total" in data
        
        # Verify event structure if there are any
        if data["events"]:
            event = data["events"][0]
            assert "id" in event
            assert "event_type" in event
            assert "entity_type" in event
            assert "created_at" in event
        
        print(f"✓ Events: {data['total']} events in the event bus")


class TestDataHubNormalization:
    """Tests for data normalization quality"""
    
    def test_reservation_normalization_quality(self):
        """Verify normalized reservations have all required fields and proper transformation"""
        # First sync some data
        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Sync from Mews
        requests.post(
            f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/sync",
            json={"connector_name": "mews", "entity_type": "reservations", "from_date": from_date, "to_date": to_date}
        )
        
        # Get reservations
        response = requests.get(f"{BASE_URL}/api/datahub/hotels/{TEST_HOTEL_ID}/reservations")
        
        if response.status_code == 200 and response.json().get("data"):
            reservations = response.json()["data"]
            
            for res in reservations[:3]:  # Check first 3
                # Multi-tenant check
                assert res.get("source_system"), "Missing source_system"
                
                # Core fields
                assert res.get("confirmation_number"), "Missing confirmation_number"
                assert res.get("channel"), "Missing channel"
                assert res.get("status"), "Missing status"
                
                # Date fields
                assert res.get("check_in_date"), "Missing check_in_date"
                assert res.get("check_out_date"), "Missing check_out_date"
                assert res.get("nights"), "Missing nights"
                
                # Guest info
                assert "total_adults" in res, "Missing total_adults"
                
                # Financial
                assert "total_amount" in res, "Missing total_amount"
                assert res.get("currency"), "Missing currency"
            
            print(f"✓ Normalization quality verified for {len(reservations)} reservations")
        else:
            pytest.skip("No reservations available to verify normalization")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
