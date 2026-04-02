"""
Test Suite for Flowtym Support Agent Interface
Tests: Support Agent Dashboard, Remote Access APIs, Login Redirections
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')

# Test credentials
SUPPORT_CREDENTIALS = {"email": "support@flowtym.com", "password": "Flowtym@Support2026!"}
SUPERADMIN_CREDENTIALS = {"email": "superadmin@flowtym.com", "password": "super123"}
ADMIN_CREDENTIALS = {"email": "admin@flowtym.com", "password": "admin123"}


class TestAuthentication:
    """Test authentication and role-based redirections"""
    
    def test_support_agent_login(self):
        """Test support agent can login and has correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPPORT_CREDENTIALS)
        assert response.status_code == 200, f"Support login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "support", f"Expected role 'support', got '{data['user']['role']}'"
        assert data["user"]["email"] == SUPPORT_CREDENTIALS["email"]
        print(f"✓ Support agent login successful - role: {data['user']['role']}")
    
    def test_superadmin_login(self):
        """Test super admin can login and has correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Superadmin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "super_admin", f"Expected role 'super_admin', got '{data['user']['role']}'"
        print(f"✓ Super admin login successful - role: {data['user']['role']}")
    
    def test_admin_login(self):
        """Test hotel admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Admin login successful - role: {data['user']['role']}")


class TestSupportAgentAPIs:
    """Test Support Agent specific APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get support agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPPORT_CREDENTIALS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_support_stats(self):
        """Test GET /api/support/stats - Support dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/support/stats", headers=self.headers)
        assert response.status_code == 200, f"Support stats failed: {response.text}"
        
        data = response.json()
        assert "total_tickets" in data, "Missing total_tickets"
        assert "open_tickets" in data, "Missing open_tickets"
        assert "in_progress_tickets" in data, "Missing in_progress_tickets"
        assert "resolved_tickets" in data, "Missing resolved_tickets"
        assert "recent_tickets" in data, "Missing recent_tickets"
        print(f"✓ Support stats: {data['total_tickets']} total, {data['open_tickets']} open")
    
    def test_remote_access_stats(self):
        """Test GET /api/support/remote/stats - Remote access statistics"""
        response = requests.get(f"{BASE_URL}/api/support/remote/stats", headers=self.headers)
        assert response.status_code == 200, f"Remote stats failed: {response.text}"
        
        data = response.json()
        assert "total_requests" in data, "Missing total_requests"
        assert "pending" in data, "Missing pending count"
        assert "approved" in data, "Missing approved count"
        assert "active" in data, "Missing active count"
        assert "completed" in data, "Missing completed count"
        print(f"✓ Remote access stats: {data['total_requests']} total, {data['active']} active")
    
    def test_remote_access_requests_list(self):
        """Test GET /api/support/remote/requests - List remote access requests"""
        response = requests.get(f"{BASE_URL}/api/support/remote/requests", headers=self.headers)
        assert response.status_code == 200, f"Remote requests list failed: {response.text}"
        
        data = response.json()
        assert "requests" in data, "Missing requests array"
        assert isinstance(data["requests"], list), "requests should be a list"
        print(f"✓ Remote access requests: {len(data['requests'])} requests")
    
    def test_hotels_list(self):
        """Test GET /api/hotels - List hotels for remote access selection"""
        response = requests.get(f"{BASE_URL}/api/hotels", headers=self.headers)
        assert response.status_code == 200, f"Hotels list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Hotels should be a list"
        assert len(data) > 0, "Should have at least one hotel"
        
        # Verify hotel structure
        hotel = data[0]
        assert "id" in hotel, "Hotel missing id"
        assert "name" in hotel, "Hotel missing name"
        print(f"✓ Hotels list: {len(data)} hotels available")
    
    def test_auth_me_endpoint(self):
        """Test GET /api/auth/me - Verify current user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        
        data = response.json()
        assert data["role"] == "support", f"Expected support role, got {data['role']}"
        assert data["email"] == SUPPORT_CREDENTIALS["email"]
        print(f"✓ Auth me: {data['email']} - {data['role']}")


class TestRemoteAccessWorkflow:
    """Test Remote Access Request workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get tokens for support and admin"""
        # Support token
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPPORT_CREDENTIALS)
        self.support_token = response.json()["token"]
        self.support_headers = {"Authorization": f"Bearer {self.support_token}"}
        
        # Get a hotel ID
        hotels_response = requests.get(f"{BASE_URL}/api/hotels", headers=self.support_headers)
        hotels = hotels_response.json()
        self.hotel_id = hotels[0]["id"] if hotels else None
    
    def test_create_remote_access_request(self):
        """Test POST /api/support/remote/request - Create remote access request"""
        if not self.hotel_id:
            pytest.skip("No hotel available for testing")
        
        request_data = {
            "hotel_id": self.hotel_id,
            "module": "pms",
            "target_role": "admin",
            "reason": "TEST_Remote access for debugging reservation issue",
            "requested_duration_minutes": 15
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support/remote/request",
            json=request_data,
            headers=self.support_headers
        )
        assert response.status_code == 200, f"Create request failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Request creation should succeed"
        assert "request_id" in data, "Missing request_id"
        assert data["status"] == "pending", "Initial status should be pending"
        
        self.request_id = data["request_id"]
        print(f"✓ Remote access request created: {self.request_id}")
        
        # Verify request appears in list
        list_response = requests.get(f"{BASE_URL}/api/support/remote/requests", headers=self.support_headers)
        requests_list = list_response.json()["requests"]
        request_ids = [r["request_id"] for r in requests_list]
        assert self.request_id in request_ids, "Created request should appear in list"
        print(f"✓ Request verified in list")
    
    def test_get_remote_access_request_detail(self):
        """Test GET /api/support/remote/requests/{request_id} - Get request details"""
        # First create a request
        if not self.hotel_id:
            pytest.skip("No hotel available for testing")
        
        request_data = {
            "hotel_id": self.hotel_id,
            "module": "channel_manager",
            "target_role": "reception",
            "reason": "TEST_Check channel sync issue",
            "requested_duration_minutes": 30
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/support/remote/request",
            json=request_data,
            headers=self.support_headers
        )
        request_id = create_response.json()["request_id"]
        
        # Get details
        response = requests.get(
            f"{BASE_URL}/api/support/remote/requests/{request_id}",
            headers=self.support_headers
        )
        assert response.status_code == 200, f"Get request detail failed: {response.text}"
        
        data = response.json()
        assert data["request_id"] == request_id
        assert data["module"] == "channel_manager"
        assert data["target_role"] == "reception"
        assert data["status"] == "pending"
        print(f"✓ Request detail retrieved: {request_id}")


class TestSuperAdminSidebar:
    """Test Super Admin interface"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDENTIALS)
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_superadmin_dashboard(self):
        """Test GET /api/superadmin/dashboard - Super admin dashboard"""
        response = requests.get(f"{BASE_URL}/api/superadmin/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Superadmin dashboard failed: {response.text}"
        
        data = response.json()
        assert "total_hotels" in data, "Missing total_hotels"
        assert "mrr" in data, "Missing MRR"
        assert "arr" in data, "Missing ARR"
        print(f"✓ Superadmin dashboard: {data['total_hotels']} hotels, MRR: {data['mrr']}")
    
    def test_superadmin_hotels_list(self):
        """Test GET /api/superadmin/hotels - List all hotels"""
        response = requests.get(f"{BASE_URL}/api/superadmin/hotels", headers=self.headers)
        assert response.status_code == 200, f"Superadmin hotels list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Hotels should be a list"
        print(f"✓ Superadmin hotels: {len(data)} hotels")


# Cleanup function
def cleanup_test_data():
    """Clean up TEST_ prefixed remote access requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPPORT_CREDENTIALS)
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all requests
        requests_response = requests.get(f"{BASE_URL}/api/support/remote/requests", headers=headers)
        if requests_response.status_code == 200:
            for req in requests_response.json().get("requests", []):
                if req.get("reason", "").startswith("TEST_"):
                    print(f"Note: Test request {req['request_id']} created during testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
