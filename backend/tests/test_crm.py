"""
CRM Module Backend API Tests
Tests all CRM endpoints: Clients, Segments, Campaigns, Workflows, Conversations, Auto-replies, Alerts, Analytics, PMS Integration
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@flowtym.com"
ADMIN_PASSWORD = "admin123"


class TestCRMAuth:
    """Authentication tests for CRM endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    def test_crm_endpoints_require_auth(self):
        """Test that CRM endpoints require authentication"""
        endpoints = [
            "/api/crm/clients",
            "/api/crm/segments",
            "/api/crm/campaigns",
            "/api/crm/workflows",
            "/api/crm/conversations",
            "/api/crm/auto-replies",
            "/api/crm/alerts",
            "/api/crm/analytics"
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require auth, got {response.status_code}"
        print("✓ All CRM endpoints require authentication")


class TestCRMClients:
    """CRM Clients CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Create a test client and return its ID"""
        unique_email = f"TEST_client_{uuid.uuid4().hex[:8]}@test.com"
        client_data = {
            "first_name": "TEST_John",
            "last_name": "Doe",
            "email": unique_email,
            "phone": "+33612345678",
            "company": "Test Company",
            "client_type": "business",
            "tags": ["vip", "test"],
            "notes": "Test client for CRM testing"
        }
        response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json=client_data)
        assert response.status_code == 200, f"Failed to create test client: {response.text}"
        client = response.json()
        yield client["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/clients/{client['id']}", headers=auth_headers)
    
    def test_list_clients(self, auth_headers):
        """Test GET /api/crm/clients - List all clients"""
        response = requests.get(f"{BASE_URL}/api/crm/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        assert "total" in data
        assert isinstance(data["clients"], list)
        print(f"✓ GET /api/crm/clients - Found {data['total']} clients")
    
    def test_list_clients_with_filters(self, auth_headers):
        """Test GET /api/crm/clients with filters"""
        response = requests.get(f"{BASE_URL}/api/crm/clients?client_type=business&limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        print(f"✓ GET /api/crm/clients with filters - Found {len(data['clients'])} business clients")
    
    def test_create_client(self, auth_headers):
        """Test POST /api/crm/clients - Create a new client"""
        unique_email = f"TEST_create_{uuid.uuid4().hex[:8]}@test.com"
        client_data = {
            "first_name": "TEST_Jane",
            "last_name": "Smith",
            "email": unique_email,
            "phone": "+33698765432",
            "client_type": "vip",
            "tags": ["premium"],
            "notes": "Created via test"
        }
        response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json=client_data)
        assert response.status_code == 200, f"Create failed: {response.text}"
        client = response.json()
        
        # Verify response structure
        assert "id" in client
        assert client["first_name"] == "TEST_Jane"
        assert client["last_name"] == "Smith"
        assert client["email"] == unique_email
        assert client["client_type"] == "vip"
        assert client["loyalty_score"] == 50  # Default score
        assert client["status"] == "active"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/clients/{client['id']}", headers=auth_headers)
        print(f"✓ POST /api/crm/clients - Created client {client['id']}")
    
    def test_create_client_duplicate_email(self, auth_headers, test_client_id):
        """Test POST /api/crm/clients - Duplicate email should fail"""
        # Get the test client's email
        response = requests.get(f"{BASE_URL}/api/crm/clients/{test_client_id}", headers=auth_headers)
        existing_email = response.json()["email"]
        
        client_data = {
            "first_name": "Duplicate",
            "last_name": "Test",
            "email": existing_email
        }
        response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json=client_data)
        assert response.status_code == 400
        print("✓ POST /api/crm/clients - Duplicate email correctly rejected")
    
    def test_get_client(self, auth_headers, test_client_id):
        """Test GET /api/crm/clients/{id} - Get client details"""
        response = requests.get(f"{BASE_URL}/api/crm/clients/{test_client_id}", headers=auth_headers)
        assert response.status_code == 200
        client = response.json()
        
        assert client["id"] == test_client_id
        assert "first_name" in client
        assert "last_name" in client
        assert "email" in client
        assert "loyalty_score" in client
        assert "stays" in client  # Should include stays history
        print(f"✓ GET /api/crm/clients/{test_client_id} - Retrieved client details")
    
    def test_get_client_not_found(self, auth_headers):
        """Test GET /api/crm/clients/{id} - Non-existent client"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/crm/clients/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        print("✓ GET /api/crm/clients/{id} - 404 for non-existent client")
    
    def test_update_client(self, auth_headers, test_client_id):
        """Test PUT /api/crm/clients/{id} - Update client"""
        update_data = {
            "first_name": "TEST_Updated",
            "loyalty_score": 75,
            "tags": ["vip", "updated"]
        }
        response = requests.put(f"{BASE_URL}/api/crm/clients/{test_client_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["first_name"] == "TEST_Updated"
        assert updated["loyalty_score"] == 75
        assert "updated" in updated["tags"]
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/crm/clients/{test_client_id}", headers=auth_headers)
        assert get_response.json()["first_name"] == "TEST_Updated"
        print(f"✓ PUT /api/crm/clients/{test_client_id} - Updated and verified")
    
    def test_delete_client(self, auth_headers):
        """Test DELETE /api/crm/clients/{id} - Soft delete client"""
        # Create a client to delete
        unique_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json={
            "first_name": "TEST_ToDelete",
            "last_name": "Client",
            "email": unique_email
        })
        client_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/crm/clients/{client_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify soft delete (status should be "deleted")
        get_response = requests.get(f"{BASE_URL}/api/crm/clients/{client_id}", headers=auth_headers)
        assert get_response.json()["status"] == "deleted"
        print(f"✓ DELETE /api/crm/clients/{client_id} - Soft deleted")


class TestCRMSegments:
    """CRM Segments CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_segment_id(self, auth_headers):
        """Create a test segment"""
        segment_data = {
            "name": f"TEST_Segment_{uuid.uuid4().hex[:8]}",
            "description": "Test segment for CRM testing",
            "color": "#FF5733",
            "conditions": [
                {"field": "loyalty_score", "operator": ">=", "value": 70}
            ],
            "is_dynamic": True
        }
        response = requests.post(f"{BASE_URL}/api/crm/segments", headers=auth_headers, json=segment_data)
        assert response.status_code == 200, f"Failed to create segment: {response.text}"
        segment = response.json()
        yield segment["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/segments/{segment['id']}", headers=auth_headers)
    
    def test_list_segments(self, auth_headers):
        """Test GET /api/crm/segments"""
        response = requests.get(f"{BASE_URL}/api/crm/segments", headers=auth_headers)
        assert response.status_code == 200
        segments = response.json()
        assert isinstance(segments, list)
        print(f"✓ GET /api/crm/segments - Found {len(segments)} segments")
    
    def test_create_segment(self, auth_headers):
        """Test POST /api/crm/segments"""
        segment_data = {
            "name": f"TEST_VIP_Segment_{uuid.uuid4().hex[:8]}",
            "description": "VIP clients with high loyalty",
            "color": "#8B5CF6",
            "icon": "star",
            "conditions": [
                {"field": "client_type", "operator": "==", "value": "vip"},
                {"field": "total_stays", "operator": ">=", "value": 3}
            ],
            "is_dynamic": True
        }
        response = requests.post(f"{BASE_URL}/api/crm/segments", headers=auth_headers, json=segment_data)
        assert response.status_code == 200
        segment = response.json()
        
        assert "id" in segment
        assert segment["name"] == segment_data["name"]
        assert segment["is_dynamic"] == True
        assert "client_count" in segment
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/segments/{segment['id']}", headers=auth_headers)
        print(f"✓ POST /api/crm/segments - Created segment {segment['id']}")
    
    def test_update_segment(self, auth_headers, test_segment_id):
        """Test PUT /api/crm/segments/{id}"""
        update_data = {
            "name": "TEST_Updated_Segment",
            "color": "#00FF00"
        }
        response = requests.put(f"{BASE_URL}/api/crm/segments/{test_segment_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["name"] == "TEST_Updated_Segment"
        assert updated["color"] == "#00FF00"
        print(f"✓ PUT /api/crm/segments/{test_segment_id} - Updated")
    
    def test_delete_segment(self, auth_headers):
        """Test DELETE /api/crm/segments/{id}"""
        # Create segment to delete
        create_response = requests.post(f"{BASE_URL}/api/crm/segments", headers=auth_headers, json={
            "name": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "description": "To be deleted"
        })
        segment_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/crm/segments/{segment_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/crm/segments", headers=auth_headers)
        segment_ids = [s["id"] for s in get_response.json()]
        assert segment_id not in segment_ids
        print(f"✓ DELETE /api/crm/segments/{segment_id} - Deleted")


class TestCRMCampaigns:
    """CRM Campaigns CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_campaign_id(self, auth_headers):
        """Create a test campaign"""
        campaign_data = {
            "name": f"TEST_Campaign_{uuid.uuid4().hex[:8]}",
            "description": "Test campaign",
            "type": "email",
            "content": "Hello {{first_name}}, welcome to our hotel!",
            "subject": "Welcome to Flowtym Hotel"
        }
        response = requests.post(f"{BASE_URL}/api/crm/campaigns", headers=auth_headers, json=campaign_data)
        assert response.status_code == 200, f"Failed to create campaign: {response.text}"
        campaign = response.json()
        yield campaign["id"]
    
    def test_list_campaigns(self, auth_headers):
        """Test GET /api/crm/campaigns"""
        response = requests.get(f"{BASE_URL}/api/crm/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        assert isinstance(campaigns, list)
        print(f"✓ GET /api/crm/campaigns - Found {len(campaigns)} campaigns")
    
    def test_list_campaigns_by_status(self, auth_headers):
        """Test GET /api/crm/campaigns with status filter"""
        response = requests.get(f"{BASE_URL}/api/crm/campaigns?status=draft", headers=auth_headers)
        assert response.status_code == 200
        print("✓ GET /api/crm/campaigns?status=draft - Filtered by status")
    
    def test_create_campaign(self, auth_headers):
        """Test POST /api/crm/campaigns"""
        campaign_data = {
            "name": f"TEST_Email_Campaign_{uuid.uuid4().hex[:8]}",
            "description": "Promotional email campaign",
            "type": "email",
            "content": "Special offer for you!",
            "subject": "Exclusive Offer",
            "segment_ids": []
        }
        response = requests.post(f"{BASE_URL}/api/crm/campaigns", headers=auth_headers, json=campaign_data)
        assert response.status_code == 200
        campaign = response.json()
        
        assert "id" in campaign
        assert campaign["status"] == "draft"
        assert campaign["sent_count"] == 0
        print(f"✓ POST /api/crm/campaigns - Created campaign {campaign['id']}")
    
    def test_update_campaign(self, auth_headers, test_campaign_id):
        """Test PUT /api/crm/campaigns/{id}"""
        update_data = {
            "name": "TEST_Updated_Campaign",
            "content": "Updated content"
        }
        response = requests.put(f"{BASE_URL}/api/crm/campaigns/{test_campaign_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["name"] == "TEST_Updated_Campaign"
        print(f"✓ PUT /api/crm/campaigns/{test_campaign_id} - Updated")
    
    def test_launch_campaign(self, auth_headers, test_campaign_id):
        """Test POST /api/crm/campaigns/{id}/launch"""
        response = requests.post(f"{BASE_URL}/api/crm/campaigns/{test_campaign_id}/launch", headers=auth_headers)
        assert response.status_code == 200
        result = response.json()
        
        assert "message" in result
        assert "target_count" in result
        print(f"✓ POST /api/crm/campaigns/{test_campaign_id}/launch - Launched with {result['target_count']} targets")
    
    def test_launch_already_active_campaign(self, auth_headers, test_campaign_id):
        """Test launching an already active campaign should fail"""
        response = requests.post(f"{BASE_URL}/api/crm/campaigns/{test_campaign_id}/launch", headers=auth_headers)
        assert response.status_code == 400
        print("✓ POST /api/crm/campaigns/{id}/launch - Already active campaign rejected")


class TestCRMWorkflows:
    """CRM Workflows CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_workflow_id(self, auth_headers):
        """Create a test workflow"""
        workflow_data = {
            "name": f"TEST_Workflow_{uuid.uuid4().hex[:8]}",
            "description": "Test workflow",
            "trigger": {"type": "booking_confirmed", "delay_hours": 0},
            "actions": [{"type": "send_email", "config": {"template": "welcome"}}],
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/crm/workflows", headers=auth_headers, json=workflow_data)
        assert response.status_code == 200, f"Failed to create workflow: {response.text}"
        workflow = response.json()
        yield workflow["id"]
    
    def test_list_workflows(self, auth_headers):
        """Test GET /api/crm/workflows"""
        response = requests.get(f"{BASE_URL}/api/crm/workflows", headers=auth_headers)
        assert response.status_code == 200
        workflows = response.json()
        assert isinstance(workflows, list)
        print(f"✓ GET /api/crm/workflows - Found {len(workflows)} workflows")
    
    def test_create_workflow(self, auth_headers):
        """Test POST /api/crm/workflows"""
        workflow_data = {
            "name": f"TEST_CheckIn_Workflow_{uuid.uuid4().hex[:8]}",
            "description": "Send welcome message on check-in",
            "trigger": {"type": "check_in", "delay_hours": 1},
            "actions": [
                {"type": "send_sms", "config": {"message": "Welcome to our hotel!"}},
                {"type": "add_tag", "config": {"tag": "checked_in"}}
            ],
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/crm/workflows", headers=auth_headers, json=workflow_data)
        assert response.status_code == 200
        workflow = response.json()
        
        assert "id" in workflow
        assert workflow["status"] == "active"
        assert workflow["executions_count"] == 0
        print(f"✓ POST /api/crm/workflows - Created workflow {workflow['id']}")
    
    def test_update_workflow(self, auth_headers, test_workflow_id):
        """Test PUT /api/crm/workflows/{id}"""
        update_data = {
            "name": "TEST_Updated_Workflow",
            "description": "Updated description"
        }
        response = requests.put(f"{BASE_URL}/api/crm/workflows/{test_workflow_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["name"] == "TEST_Updated_Workflow"
        print(f"✓ PUT /api/crm/workflows/{test_workflow_id} - Updated")
    
    def test_toggle_workflow(self, auth_headers, test_workflow_id):
        """Test POST /api/crm/workflows/{id}/toggle"""
        # Get current status
        workflows = requests.get(f"{BASE_URL}/api/crm/workflows", headers=auth_headers).json()
        current_workflow = next((w for w in workflows if w["id"] == test_workflow_id), None)
        original_status = current_workflow["status"] if current_workflow else "active"
        
        # Toggle
        response = requests.post(f"{BASE_URL}/api/crm/workflows/{test_workflow_id}/toggle", headers=auth_headers)
        assert response.status_code == 200
        result = response.json()
        
        expected_status = "inactive" if original_status == "active" else "active"
        assert result["status"] == expected_status
        print(f"✓ POST /api/crm/workflows/{test_workflow_id}/toggle - Toggled to {result['status']}")


class TestCRMConversations:
    """CRM Conversations and Messages tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Create a test client for messaging"""
        unique_email = f"TEST_msg_client_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json={
            "first_name": "TEST_Message",
            "last_name": "Client",
            "email": unique_email
        })
        client = response.json()
        yield client["id"]
        requests.delete(f"{BASE_URL}/api/crm/clients/{client['id']}", headers=auth_headers)
    
    def test_list_conversations(self, auth_headers):
        """Test GET /api/crm/conversations"""
        response = requests.get(f"{BASE_URL}/api/crm/conversations", headers=auth_headers)
        assert response.status_code == 200
        conversations = response.json()
        assert isinstance(conversations, list)
        print(f"✓ GET /api/crm/conversations - Found {len(conversations)} conversations")
    
    def test_list_conversations_with_filters(self, auth_headers):
        """Test GET /api/crm/conversations with filters"""
        response = requests.get(f"{BASE_URL}/api/crm/conversations?channel=email", headers=auth_headers)
        assert response.status_code == 200
        print("✓ GET /api/crm/conversations?channel=email - Filtered")
    
    def test_send_message(self, auth_headers, test_client_id):
        """Test POST /api/crm/messages"""
        message_data = {
            "client_id": test_client_id,
            "channel": "email",
            "subject": "Test Message",
            "content": "This is a test message from CRM testing"
        }
        response = requests.post(f"{BASE_URL}/api/crm/messages", headers=auth_headers, json=message_data)
        assert response.status_code == 200
        message = response.json()
        
        assert "id" in message
        assert message["client_id"] == test_client_id
        assert message["direction"] == "outbound"
        assert "conversation_id" in message
        print(f"✓ POST /api/crm/messages - Sent message {message['id']}")
    
    def test_send_message_invalid_client(self, auth_headers):
        """Test POST /api/crm/messages with invalid client"""
        message_data = {
            "client_id": str(uuid.uuid4()),
            "channel": "email",
            "content": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/crm/messages", headers=auth_headers, json=message_data)
        assert response.status_code == 404
        print("✓ POST /api/crm/messages - Invalid client rejected")


class TestCRMAutoReplies:
    """CRM Auto-Replies tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_list_auto_replies(self, auth_headers):
        """Test GET /api/crm/auto-replies"""
        response = requests.get(f"{BASE_URL}/api/crm/auto-replies", headers=auth_headers)
        assert response.status_code == 200
        rules = response.json()
        assert isinstance(rules, list)
        print(f"✓ GET /api/crm/auto-replies - Found {len(rules)} rules")
    
    def test_create_auto_reply(self, auth_headers):
        """Test POST /api/crm/auto-replies"""
        rule_data = {
            "name": f"TEST_AutoReply_{uuid.uuid4().hex[:8]}",
            "trigger_keywords": ["reservation", "booking", "réservation"],
            "channel": "email",
            "response_template": "Thank you for your inquiry about reservations. We will get back to you shortly.",
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/crm/auto-replies", headers=auth_headers, json=rule_data)
        assert response.status_code == 200
        rule = response.json()
        
        assert "id" in rule
        assert rule["is_active"] == True
        assert rule["usage_count"] == 0
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/auto-replies/{rule['id']}", headers=auth_headers)
        print(f"✓ POST /api/crm/auto-replies - Created rule {rule['id']}")
    
    def test_delete_auto_reply(self, auth_headers):
        """Test DELETE /api/crm/auto-replies/{id}"""
        # Create rule to delete
        create_response = requests.post(f"{BASE_URL}/api/crm/auto-replies", headers=auth_headers, json={
            "name": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "trigger_keywords": ["test"],
            "channel": "sms",
            "response_template": "Test response"
        })
        rule_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/crm/auto-replies/{rule_id}", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ DELETE /api/crm/auto-replies/{rule_id} - Deleted")


class TestCRMAlerts:
    """CRM Alerts tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_alert_id(self, auth_headers):
        """Create a test alert"""
        alert_data = {
            "type": "vip_arrival",
            "title": "TEST VIP Arrival",
            "message": "VIP client arriving tomorrow",
            "priority": "high"
        }
        response = requests.post(f"{BASE_URL}/api/crm/alerts", headers=auth_headers, json=alert_data)
        assert response.status_code == 200
        alert = response.json()
        yield alert["id"]
    
    def test_list_alerts(self, auth_headers):
        """Test GET /api/crm/alerts"""
        response = requests.get(f"{BASE_URL}/api/crm/alerts", headers=auth_headers)
        assert response.status_code == 200
        alerts = response.json()
        assert isinstance(alerts, list)
        print(f"✓ GET /api/crm/alerts - Found {len(alerts)} alerts")
    
    def test_list_unread_alerts(self, auth_headers):
        """Test GET /api/crm/alerts?unread_only=true"""
        response = requests.get(f"{BASE_URL}/api/crm/alerts?unread_only=true", headers=auth_headers)
        assert response.status_code == 200
        print("✓ GET /api/crm/alerts?unread_only=true - Filtered")
    
    def test_create_alert(self, auth_headers):
        """Test POST /api/crm/alerts"""
        alert_data = {
            "type": "complaint",
            "title": "TEST Customer Complaint",
            "message": "Customer reported issue with room service",
            "priority": "medium",
            "data": {"room": "101", "issue_type": "service"}
        }
        response = requests.post(f"{BASE_URL}/api/crm/alerts", headers=auth_headers, json=alert_data)
        assert response.status_code == 200
        alert = response.json()
        
        assert "id" in alert
        assert alert["is_read"] == False
        assert alert["priority"] == "medium"
        print(f"✓ POST /api/crm/alerts - Created alert {alert['id']}")
    
    def test_mark_alert_read(self, auth_headers, test_alert_id):
        """Test POST /api/crm/alerts/{id}/read"""
        response = requests.post(f"{BASE_URL}/api/crm/alerts/{test_alert_id}/read", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ POST /api/crm/alerts/{test_alert_id}/read - Marked as read")


class TestCRMAnalytics:
    """CRM Analytics tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_analytics(self, auth_headers):
        """Test GET /api/crm/analytics"""
        response = requests.get(f"{BASE_URL}/api/crm/analytics", headers=auth_headers)
        assert response.status_code == 200
        analytics = response.json()
        
        # Verify analytics structure
        assert "total_clients" in analytics
        assert "active_clients" in analytics
        assert "new_clients_month" in analytics
        assert "retention_rate" in analytics
        assert "average_nps" in analytics
        assert "average_ltv" in analytics
        assert "top_segments" in analytics
        assert "channel_distribution" in analytics
        
        # Verify data types
        assert isinstance(analytics["total_clients"], int)
        assert isinstance(analytics["retention_rate"], (int, float))
        assert isinstance(analytics["top_segments"], list)
        assert isinstance(analytics["channel_distribution"], dict)
        
        print(f"✓ GET /api/crm/analytics - Total clients: {analytics['total_clients']}, Retention: {analytics['retention_rate']}%")


class TestCRMPMSIntegration:
    """CRM PMS Integration tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_sync_from_pms(self, auth_headers):
        """Test POST /api/crm/sync-from-pms"""
        response = requests.post(f"{BASE_URL}/api/crm/sync-from-pms", headers=auth_headers)
        assert response.status_code == 200
        result = response.json()
        
        assert "message" in result
        assert "new_clients" in result
        assert "updated_clients" in result
        print(f"✓ POST /api/crm/sync-from-pms - Synced {result['new_clients']} new, {result['updated_clients']} updated")
    
    def test_get_client_by_email(self, auth_headers):
        """Test GET /api/crm/client-by-email/{email}"""
        # First create a client
        unique_email = f"TEST_byemail_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(f"{BASE_URL}/api/crm/clients", headers=auth_headers, json={
            "first_name": "TEST_ByEmail",
            "last_name": "Client",
            "email": unique_email
        })
        
        # Get by email
        response = requests.get(f"{BASE_URL}/api/crm/client-by-email/{unique_email}", headers=auth_headers)
        assert response.status_code == 200
        client = response.json()
        
        assert client["email"] == unique_email
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/clients/{client['id']}", headers=auth_headers)
        print(f"✓ GET /api/crm/client-by-email/{unique_email} - Found client")
    
    def test_get_client_by_email_not_found(self, auth_headers):
        """Test GET /api/crm/client-by-email/{email} - Not found"""
        response = requests.get(f"{BASE_URL}/api/crm/client-by-email/nonexistent@test.com", headers=auth_headers)
        assert response.status_code == 404
        print("✓ GET /api/crm/client-by-email - 404 for non-existent email")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
