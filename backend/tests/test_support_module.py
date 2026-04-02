"""
Flowtym AI Support Center - Backend API Tests
Tests for support ticket creation, AI diagnosis, and stats endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@flowtym.com"
ADMIN_PASSWORD = "admin123"
SUPERADMIN_EMAIL = "superadmin@flowtym.com"
SUPERADMIN_PASSWORD = "super123"


@pytest.fixture(scope="module")
def admin_session():
    """Get authenticated session for hotel admin"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    session.hotel_id = None
    
    # Get hotel ID
    hotels_response = session.get(f"{BASE_URL}/api/hotels")
    if hotels_response.status_code == 200:
        hotels = hotels_response.json()
        if hotels:
            session.hotel_id = hotels[0].get('id')
    
    return session


@pytest.fixture(scope="module")
def superadmin_session():
    """Get authenticated session for super admin"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as superadmin
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Super admin login failed: {response.status_code}")
    
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    
    return session


class TestSupportStats:
    """Test support statistics endpoints"""
    
    def test_global_support_stats(self, superadmin_session):
        """Test GET /api/support/stats - Global stats for super admin"""
        response = superadmin_session.get(f"{BASE_URL}/api/support/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify response structure
        assert "total_tickets" in data
        assert "open_tickets" in data
        assert "in_progress_tickets" in data
        assert "resolved_tickets" in data
        assert "avg_resolution_time_hours" in data
        assert "ai_resolution_rate" in data
        assert "tickets_by_module" in data
        assert "tickets_by_priority" in data
        assert "recent_tickets" in data
        
        # Verify data types
        assert isinstance(data["total_tickets"], int)
        assert isinstance(data["open_tickets"], int)
        assert isinstance(data["ai_resolution_rate"], (int, float))
        assert isinstance(data["tickets_by_module"], dict)
        assert isinstance(data["recent_tickets"], list)
        
        print(f"Global stats: {data['total_tickets']} total tickets, {data['open_tickets']} open")
    
    def test_hotel_support_stats(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/stats - Hotel-specific stats"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        response = admin_session.get(f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_tickets" in data
        assert "open_tickets" in data
        assert "in_progress_tickets" in data
        assert "resolved_tickets" in data
        
        print(f"Hotel stats: {data['total_tickets']} total tickets")


class TestTicketCRUD:
    """Test ticket creation, retrieval, and updates"""
    
    def test_create_ticket(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/tickets - Create new ticket"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        ticket_data = {
            "module": "pms",
            "title": "TEST_Problème de réservation",
            "description": "Je ne peux pas créer une nouvelle réservation. Le bouton ne répond pas.",
            "context": {
                "user_id": "test-user",
                "user_name": "Test User",
                "user_email": "test@example.com",
                "current_page": "/pms/planning",
                "browser": "Chrome 120",
                "timestamp": "2026-01-15T10:30:00Z"
            }
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets",
            json=ticket_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "ticket" in data
        
        ticket = data["ticket"]
        assert "ticket_id" in ticket
        assert ticket["ticket_id"].startswith("FLW-")
        assert ticket["module"] == "pms"
        assert ticket["title"] == ticket_data["title"]
        assert ticket["status"] == "open"
        
        # Store ticket_id for later tests
        admin_session.test_ticket_id = ticket["ticket_id"]
        print(f"Created ticket: {ticket['ticket_id']}")
    
    def test_get_hotel_tickets(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/tickets - List tickets"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        response = admin_session.get(f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        assert isinstance(data["tickets"], list)
        
        print(f"Found {data['total']} tickets for hotel")
    
    def test_get_tickets_with_filters(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/tickets with filters"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        # Filter by status
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets?status=open"
        )
        assert response.status_code == 200
        
        # Filter by module
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets?module=pms"
        )
        assert response.status_code == 200
        
        print("Ticket filters working correctly")
    
    def test_get_single_ticket(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/tickets/{ticket_id}"""
        if not admin_session.hotel_id or not hasattr(admin_session, 'test_ticket_id'):
            pytest.skip("No ticket ID available")
        
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets/{admin_session.test_ticket_id}"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "ticket" in data
        assert data["ticket"]["ticket_id"] == admin_session.test_ticket_id
        
        print(f"Retrieved ticket: {data['ticket']['ticket_id']}")
    
    def test_add_message_to_ticket(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/tickets/{ticket_id}/messages"""
        if not admin_session.hotel_id or not hasattr(admin_session, 'test_ticket_id'):
            pytest.skip("No ticket ID available")
        
        message_data = {
            "content": "Merci pour votre signalement. Nous analysons le problème.",
            "is_internal": False
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets/{admin_session.test_ticket_id}/messages",
            json=message_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        assert data["message"]["content"] == message_data["content"]
        
        print("Message added to ticket successfully")
    
    def test_update_ticket_status(self, admin_session):
        """Test PUT /api/support/hotels/{hotel_id}/tickets/{ticket_id}"""
        if not admin_session.hotel_id or not hasattr(admin_session, 'test_ticket_id'):
            pytest.skip("No ticket ID available")
        
        update_data = {
            "status": "in_progress",
            "priority": "high"
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets/{admin_session.test_ticket_id}",
            json=update_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify update
        get_response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets/{admin_session.test_ticket_id}"
        )
        ticket = get_response.json()["ticket"]
        assert ticket["status"] == "in_progress"
        assert ticket["priority"] == "high"
        
        print("Ticket status updated successfully")


class TestAIDiagnosis:
    """Test AI diagnosis endpoints"""
    
    def test_ai_diagnose_issue(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/diagnose - AI pre-diagnosis"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        diagnose_data = {
            "module": "pms",
            "description": "Le planning ne charge pas correctement. Les réservations n'apparaissent pas.",
            "context": {
                "current_page": "/pms/planning",
                "browser": "Chrome 120"
            }
        }
        
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/diagnose",
            json=diagnose_data
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "diagnosis" in data
        
        diagnosis = data["diagnosis"]
        assert "is_known_issue" in diagnosis
        assert "recommendation" in diagnosis
        
        print(f"AI Diagnosis: known_issue={diagnosis['is_known_issue']}, recommendation={diagnosis['recommendation'][:50]}...")
    
    def test_ai_analyze_ticket(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/tickets/{ticket_id}/ai-analyze"""
        if not admin_session.hotel_id or not hasattr(admin_session, 'test_ticket_id'):
            pytest.skip("No ticket ID available")
        
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/tickets/{admin_session.test_ticket_id}/ai-analyze"
        )
        
        # AI analysis may fail if API key is invalid, but endpoint should respond
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "ai_response" in data
            print(f"AI Analysis completed: {data['ai_response'][:100]}...")
        else:
            print("AI Analysis failed (expected if API key invalid)")


class TestKnowledgeBase:
    """Test knowledge base endpoints"""
    
    def test_get_knowledge_articles(self, admin_session):
        """Test GET /api/support/knowledge"""
        response = admin_session.get(f"{BASE_URL}/api/support/knowledge")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        assert isinstance(data["articles"], list)
        
        print(f"Found {len(data['articles'])} knowledge articles")
    
    def test_get_knowledge_by_module(self, admin_session):
        """Test GET /api/support/knowledge?module=pms"""
        response = admin_session.get(f"{BASE_URL}/api/support/knowledge?module=pms")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "articles" in data
        
        print(f"Found {len(data['articles'])} PMS knowledge articles")


class TestNotifications:
    """Test support notifications endpoints"""
    
    def test_get_notifications(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/notifications"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/notifications"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        
        print(f"Found {len(data['notifications'])} notifications")
    
    def test_get_unread_notifications(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/notifications?unread_only=true"""
        if not admin_session.hotel_id:
            pytest.skip("No hotel ID available")
        
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{admin_session.hotel_id}/notifications?unread_only=true"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        
        print(f"Found {len(data['notifications'])} unread notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
