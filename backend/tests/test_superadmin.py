"""
Super Admin Module Backend Tests
Tests for: Dashboard, Hotels CRUD, Subscriptions, SEPA Mandates, PDF Generation, Activity Logs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@flowtym.com"
SUPERADMIN_PASSWORD = "super123"

class TestSuperAdminAuth:
    """Super Admin Authentication Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "super_admin"
        return data["token"]
    
    def test_superadmin_login_success(self):
        """Test Super Admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "super_admin"
        assert data["user"]["email"] == SUPERADMIN_EMAIL
    
    def test_superadmin_login_invalid_credentials(self):
        """Test Super Admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestSuperAdminDashboard:
    """Dashboard KPIs Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_dashboard_returns_stats(self, sa_token):
        """Test dashboard returns all required KPIs"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/dashboard",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "total_hotels" in data
        assert "active_hotels" in data
        assert "mrr" in data
        assert "arr" in data
        assert "plan_distribution" in data
        assert "growth_data" in data
        assert "recent_activity" in data
        
        # Verify plan distribution has all 4 plans
        assert "basic" in data["plan_distribution"]
        assert "pro" in data["plan_distribution"]
        assert "premium" in data["plan_distribution"]
        assert "enterprise" in data["plan_distribution"]
        
        # Verify growth data has 6 months
        assert len(data["growth_data"]) == 6
    
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/superadmin/dashboard")
        assert response.status_code in [401, 403]


class TestSuperAdminPlans:
    """Subscription Plans Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_subscription_plans(self, sa_token):
        """Test GET /api/superadmin/plans returns 4 plans"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/plans",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify 4 plans exist
        assert "basic" in data
        assert "pro" in data
        assert "premium" in data
        assert "enterprise" in data
        
        # Verify plan structure
        for plan_key in ["basic", "pro", "premium", "enterprise"]:
            plan = data[plan_key]
            assert "name" in plan
            assert "max_users" in plan
            assert "price_monthly" in plan
            assert "price_annual" in plan
            assert "modules" in plan
            assert "features" in plan
        
        # Verify enterprise has unlimited users
        assert data["enterprise"]["max_users"] == -1


class TestSuperAdminHotels:
    """Hotels CRUD Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_hotel_data(self):
        """Test hotel data"""
        return {
            "name": f"TEST_Hotel_{uuid.uuid4().hex[:8]}",
            "legal_name": "TEST Hotel Testing SAS",
            "address": "123 Test Street",
            "city": "Paris",
            "postal_code": "75001",
            "country": "France",
            "siret": f"TEST{uuid.uuid4().hex[:10]}",
            "contact_email": "test@testhotel.fr",
            "contact_phone": "+33 1 00 00 00 00",
            "contact_name": "Test Contact"
        }
    
    def test_list_hotels(self, sa_token):
        """Test GET /api/superadmin/hotels returns list"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_hotel(self, sa_token, test_hotel_data):
        """Test POST /api/superadmin/hotels creates hotel"""
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json=test_hotel_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["name"] == test_hotel_data["name"]
        assert data["status"] == "active"
        assert "id" in data
        
        # Store hotel_id for cleanup
        test_hotel_data["id"] = data["id"]
        return data["id"]
    
    def test_get_hotel_by_id(self, sa_token, test_hotel_data):
        """Test GET /api/superadmin/hotels/{id} returns hotel"""
        # First create a hotel
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                **test_hotel_data,
                "name": f"TEST_Hotel_Get_{uuid.uuid4().hex[:8]}",
                "siret": f"GET{uuid.uuid4().hex[:10]}"
            }
        )
        hotel_id = response.json()["id"]
        
        # Get hotel
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == hotel_id
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_update_hotel_status_suspend(self, sa_token, test_hotel_data):
        """Test PATCH /api/superadmin/hotels/{id}/status suspends hotel"""
        # Create hotel
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                **test_hotel_data,
                "name": f"TEST_Hotel_Status_{uuid.uuid4().hex[:8]}",
                "siret": f"STS{uuid.uuid4().hex[:10]}"
            }
        )
        hotel_id = response.json()["id"]
        
        # Suspend
        response = requests.patch(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}/status?status=suspended",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        assert "suspended" in response.json()["message"]
        
        # Verify status changed
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.json()["status"] == "suspended"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_update_hotel_status_activate(self, sa_token, test_hotel_data):
        """Test PATCH /api/superadmin/hotels/{id}/status activates hotel"""
        # Create and suspend hotel
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                **test_hotel_data,
                "name": f"TEST_Hotel_Activate_{uuid.uuid4().hex[:8]}",
                "siret": f"ACT{uuid.uuid4().hex[:10]}"
            }
        )
        hotel_id = response.json()["id"]
        
        requests.patch(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}/status?status=suspended",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        
        # Activate
        response = requests.patch(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}/status?status=active",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        assert "active" in response.json()["message"]
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_delete_hotel(self, sa_token, test_hotel_data):
        """Test DELETE /api/superadmin/hotels/{id} soft deletes hotel"""
        # Create hotel
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                **test_hotel_data,
                "name": f"TEST_Hotel_Delete_{uuid.uuid4().hex[:8]}",
                "siret": f"DEL{uuid.uuid4().hex[:10]}"
            }
        )
        hotel_id = response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        assert "supprimé" in response.json()["message"]
    
    def test_hotels_search_filter(self, sa_token):
        """Test hotels list with search filter"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels?search=Grand",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
    
    def test_hotels_status_filter(self, sa_token):
        """Test hotels list with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels?status=active",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200


class TestSuperAdminSubscriptions:
    """Subscriptions Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_hotel(self, sa_token):
        """Create test hotel for subscription tests"""
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "name": f"TEST_Hotel_Sub_{uuid.uuid4().hex[:8]}",
                "legal_name": "TEST Subscription Hotel SAS",
                "address": "456 Sub Street",
                "city": "Lyon",
                "postal_code": "69001",
                "country": "France",
                "siret": f"SUB{uuid.uuid4().hex[:10]}",
                "contact_email": "sub@testhotel.fr",
                "contact_phone": "+33 4 00 00 00 00",
                "contact_name": "Sub Contact"
            }
        )
        hotel = response.json()
        yield hotel
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel['id']}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_create_subscription_with_trial(self, sa_token, test_hotel):
        """Test POST /api/superadmin/subscriptions creates subscription with trial"""
        response = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": test_hotel["id"],
                "plan": "pro",
                "payment_frequency": "monthly",
                "trial_type": "free_15_days"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify subscription
        assert data["plan"] == "pro"
        assert data["status"] == "trial"
        assert data["trial_end_date"] is not None
        assert data["payment_frequency"] == "monthly"
    
    def test_create_subscription_half_price_trial(self, sa_token):
        """Test subscription with half price first month trial"""
        # Create hotel
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "name": f"TEST_Hotel_HalfPrice_{uuid.uuid4().hex[:8]}",
                "legal_name": "TEST Half Price Hotel SAS",
                "address": "789 Half Street",
                "city": "Marseille",
                "postal_code": "13001",
                "country": "France",
                "siret": f"HLF{uuid.uuid4().hex[:10]}",
                "contact_email": "half@testhotel.fr",
                "contact_phone": "+33 4 00 00 00 01",
                "contact_name": "Half Contact"
            }
        )
        hotel_id = response.json()["id"]
        
        # Create subscription with half price trial
        response = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": hotel_id,
                "plan": "basic",
                "payment_frequency": "monthly",
                "trial_type": "half_price_first_month"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify half price
        assert data["price_effective"] == 49.5  # 99 * 0.5
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_get_subscription_by_hotel(self, sa_token, test_hotel):
        """Test GET /api/superadmin/subscriptions/{hotel_id} returns subscription"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/subscriptions/{test_hotel['id']}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["hotel_id"] == test_hotel["id"]


class TestSuperAdminSEPA:
    """SEPA Mandate Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_hotel(self, sa_token):
        """Create test hotel for SEPA tests"""
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "name": f"TEST_Hotel_SEPA_{uuid.uuid4().hex[:8]}",
                "legal_name": "TEST SEPA Hotel SAS",
                "address": "111 SEPA Street",
                "city": "Bordeaux",
                "postal_code": "33000",
                "country": "France",
                "siret": f"SEP{uuid.uuid4().hex[:10]}",
                "contact_email": "sepa@testhotel.fr",
                "contact_phone": "+33 5 00 00 00 00",
                "contact_name": "SEPA Contact"
            }
        )
        hotel = response.json()
        yield hotel
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/superadmin/hotels/{hotel['id']}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_create_sepa_mandate(self, sa_token, test_hotel):
        """Test POST /api/superadmin/sepa-mandates creates mandate"""
        response = requests.post(
            f"{BASE_URL}/api/superadmin/sepa-mandates",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": test_hotel["id"],
                "iban": "FR7630001007941234567890185",
                "bic": "BNPAFRPP",
                "account_holder": "TEST SEPA Hotel SAS",
                "payment_type": "RCUR"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify mandate
        assert data["hotel_id"] == test_hotel["id"]
        assert data["status"] == "pending_signature"
        assert "RUM-" in data["reference"]
        assert data["iban_masked"].startswith("FR76")
        assert data["iban_masked"].endswith("0185")
        assert "****" in data["iban_masked"]  # IBAN is masked
    
    def test_get_sepa_mandates(self, sa_token, test_hotel):
        """Test GET /api/superadmin/sepa-mandates/{hotel_id} returns mandates"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/sepa-mandates/{test_hotel['id']}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSuperAdminPDF:
    """PDF Generation Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_generate_contract_pdf(self, sa_token):
        """Test GET /api/superadmin/hotels/{id}/contract/pdf returns PDF"""
        # Use existing hotel
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        hotels = response.json()
        if not hotels:
            pytest.skip("No hotels available for PDF test")
        
        hotel_id = hotels[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}/contract/pdf",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should have content
    
    def test_generate_sepa_mandate_pdf(self, sa_token):
        """Test GET /api/superadmin/hotels/{id}/sepa-mandate/pdf returns PDF"""
        # Use existing hotel
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        hotels = response.json()
        if not hotels:
            pytest.skip("No hotels available for PDF test")
        
        hotel_id = hotels[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{hotel_id}/sepa-mandate/pdf",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000


class TestSuperAdminLogs:
    """Activity Logs Tests"""
    
    @pytest.fixture(scope="class")
    def sa_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_activity_logs(self, sa_token):
        """Test GET /api/superadmin/logs returns logs"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/logs?limit=50",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify log structure if logs exist
        if data:
            log = data[0]
            assert "id" in log
            assert "action" in log
            assert "entity_type" in log
            assert "created_at" in log
    
    def test_logs_filter_by_entity_type(self, sa_token):
        """Test logs can be filtered by entity type"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/logs?entity_type=hotel&limit=10",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200


class TestSuperAdminAccessControl:
    """Access Control Tests"""
    
    def test_regular_user_cannot_access_superadmin(self):
        """Test regular user cannot access super admin endpoints"""
        # Login as regular user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@flowtym.com",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Regular user not available")
        
        token = response.json()["token"]
        
        # Try to access super admin endpoint
        response = requests.get(
            f"{BASE_URL}/api/superadmin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
    
    def test_unauthenticated_cannot_access_superadmin(self):
        """Test unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/superadmin/hotels")
        assert response.status_code in [401, 403]
