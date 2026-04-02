"""
Super Admin Extended Features Tests
Tests for: Subscriptions Page, Users Page, Invoices Page, Hotel Detail, Electronic Signature
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('VITE_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@flowtym.com"
SUPERADMIN_PASSWORD = "super123"
TEST_HOTEL_ID = "691777ca-2ad0-4412-87f2-3f3fbb3ae1d0"


@pytest.fixture(scope="module")
def sa_token():
    """Get Super Admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data["user"]["role"] == "super_admin"
    return data["token"]


# ==================== INVOICES TESTS ====================

class TestInvoicesAPI:
    """Invoices API Tests - GET /api/superadmin/invoices, POST /api/superadmin/invoices/generate, GET /api/superadmin/invoices/{id}/pdf"""
    
    def test_list_invoices(self, sa_token):
        """Test GET /api/superadmin/invoices returns invoice list"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/invoices",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
    
    def test_list_invoices_with_hotel_filter(self, sa_token):
        """Test GET /api/superadmin/invoices?hotel_id=xxx filters by hotel"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/invoices?hotel_id={TEST_HOTEL_ID}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All invoices should be for the specified hotel
        for inv in data:
            assert inv.get("hotel_id") == TEST_HOTEL_ID
    
    def test_list_invoices_with_status_filter(self, sa_token):
        """Test GET /api/superadmin/invoices?status=draft filters by status"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/invoices?status=draft",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All invoices should have draft status
        for inv in data:
            assert inv.get("status") == "draft"
    
    def test_generate_invoice(self, sa_token):
        """Test POST /api/superadmin/invoices/generate creates invoice"""
        # First ensure hotel has active subscription
        sub_response = requests.get(
            f"{BASE_URL}/api/superadmin/subscriptions/{TEST_HOTEL_ID}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        
        if sub_response.status_code == 404:
            # Create subscription first
            requests.post(
                f"{BASE_URL}/api/superadmin/subscriptions",
                headers={"Authorization": f"Bearer {sa_token}"},
                json={
                    "hotel_id": TEST_HOTEL_ID,
                    "plan": "pro",
                    "payment_frequency": "monthly",
                    "trial_type": "none"
                }
            )
        
        # Generate invoice
        response = requests.post(
            f"{BASE_URL}/api/superadmin/invoices/generate?hotel_id={TEST_HOTEL_ID}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify invoice structure
        assert "id" in data
        assert "number" in data
        assert data["number"].startswith("FACT-")
        assert "amount_ht" in data
        assert "amount_ttc" in data
        assert "tva" in data
        assert data["hotel_id"] == TEST_HOTEL_ID
        assert data["status"] == "draft"
        
        print(f"Generated invoice: {data['number']} - {data['amount_ttc']}€ TTC")
        return data["id"]
    
    def test_get_invoice_pdf(self, sa_token):
        """Test GET /api/superadmin/invoices/{id}/pdf generates PDF"""
        # First get list of invoices
        response = requests.get(
            f"{BASE_URL}/api/superadmin/invoices",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        invoices = response.json()
        
        if not invoices:
            # Generate one first
            requests.post(
                f"{BASE_URL}/api/superadmin/invoices/generate?hotel_id={TEST_HOTEL_ID}",
                headers={"Authorization": f"Bearer {sa_token}"}
            )
            response = requests.get(
                f"{BASE_URL}/api/superadmin/invoices",
                headers={"Authorization": f"Bearer {sa_token}"}
            )
            invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/superadmin/invoices/{invoice_id}/pdf",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should have content
        print(f"Invoice PDF generated: {len(response.content)} bytes")


# ==================== SIGNATURE TESTS ====================

class TestSignatureAPI:
    """Electronic Signature API Tests - POST /api/superadmin/signature/send, GET /api/superadmin/signature/requests/{hotel_id}"""
    
    def test_signature_send_endpoint_exists(self, sa_token):
        """Test POST /api/superadmin/signature/send endpoint exists"""
        # Test with minimal payload - should fail validation but endpoint should exist
        response = requests.post(
            f"{BASE_URL}/api/superadmin/signature/send",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": TEST_HOTEL_ID,
                "document_type": "contract",
                "signer_email": "test@example.com",
                "signer_name": "Test Signer",
                "test_mode": True
            }
        )
        # Should return 200 (success), 503 (service not configured), or 500 (API error)
        # NOT 404 (endpoint not found)
        assert response.status_code != 404, "Signature send endpoint not found"
        print(f"Signature send endpoint response: {response.status_code}")
        
        if response.status_code == 503:
            print("Dropbox Sign service not configured (expected in test mode)")
        elif response.status_code == 200:
            print("Signature request sent successfully")
        else:
            print(f"Response: {response.text}")
    
    def test_get_signature_requests(self, sa_token):
        """Test GET /api/superadmin/signature/requests/{hotel_id} returns signature list"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/signature/requests/{TEST_HOTEL_ID}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} signature requests for hotel")
        
        # Verify structure if any exist
        if data:
            sig = data[0]
            assert "id" in sig
            assert "hotel_id" in sig
            assert "document_type" in sig
            assert "status" in sig


# ==================== USERS MANAGEMENT TESTS ====================

class TestUsersAPI:
    """Users Management API Tests - GET /api/superadmin/hotels/{id}/users, POST invite, DELETE user"""
    
    def test_list_hotel_users(self, sa_token):
        """Test GET /api/superadmin/hotels/{hotel_id}/users returns users list"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}/users",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users for hotel")
        
        # Verify user structure if any exist
        if data:
            user = data[0]
            assert "id" in user
            assert "email" in user
            assert "role" in user
    
    def test_invite_user(self, sa_token):
        """Test POST /api/superadmin/hotels/{hotel_id}/users/invite creates invitation"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@testhotel.fr"
        
        response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}/users/invite",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": TEST_HOTEL_ID,  # Required in body per UserInvite model
                "first_name": "Test",
                "last_name": "User",
                "email": unique_email,
                "role": "reception"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["status"] == "invited"
        
        print(f"User invited: {unique_email}")
        
        # Cleanup - delete the user
        user_id = data["user"]["id"]
        requests.delete(
            f"{BASE_URL}/api/superadmin/users/{user_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
    
    def test_delete_user(self, sa_token):
        """Test DELETE /api/superadmin/users/{user_id} removes user"""
        # First create a user to delete
        unique_email = f"delete_{uuid.uuid4().hex[:8]}@testhotel.fr"
        
        create_response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}/users/invite",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "hotel_id": TEST_HOTEL_ID,  # Required in body per UserInvite model
                "first_name": "Delete",
                "last_name": "Test",
                "email": unique_email,
                "role": "housekeeping"
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create user for delete test")
        
        user_id = create_response.json()["user"]["id"]
        
        # Delete the user
        response = requests.delete(
            f"{BASE_URL}/api/superadmin/users/{user_id}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "supprimé" in response.json()["message"]
        print(f"User deleted: {user_id}")


# ==================== HOTEL DETAIL TESTS ====================

class TestHotelDetailAPI:
    """Hotel Detail API Tests - GET hotel, contract PDF, SEPA PDF"""
    
    def test_get_hotel_detail(self, sa_token):
        """Test GET /api/superadmin/hotels/{hotel_id} returns full hotel details"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify hotel structure
        assert data["id"] == TEST_HOTEL_ID
        assert "name" in data
        assert "legal_name" in data
        assert "address" in data
        assert "city" in data
        assert "contact_email" in data
        assert "contact_name" in data
        assert "users_count" in data
        
        print(f"Hotel: {data['name']} - {data['city']}")
    
    def test_download_contract_pdf(self, sa_token):
        """Test GET /api/superadmin/hotels/{hotel_id}/contract/pdf returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}/contract/pdf",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000
        print(f"Contract PDF: {len(response.content)} bytes")
    
    def test_download_sepa_mandate_pdf(self, sa_token):
        """Test GET /api/superadmin/hotels/{hotel_id}/sepa-mandate/pdf returns PDF"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels/{TEST_HOTEL_ID}/sepa-mandate/pdf",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000
        print(f"SEPA Mandate PDF: {len(response.content)} bytes")


# ==================== SUBSCRIPTIONS PAGE TESTS ====================

class TestSubscriptionsPageAPI:
    """Subscriptions Page API Tests - Plans, Create, Cancel"""
    
    def test_get_plans(self, sa_token):
        """Test GET /api/superadmin/plans returns 4 plans (Basic, Pro, Premium, Enterprise)"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/plans",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify 4 plans exist
        assert "basic" in data
        assert "pro" in data
        assert "premium" in data
        assert "enterprise" in data
        
        # Verify plan prices
        assert data["basic"]["price_monthly"] == 99
        assert data["pro"]["price_monthly"] == 199
        assert data["premium"]["price_monthly"] == 349
        assert data["enterprise"]["price_monthly"] == 599
        
        print("All 4 plans verified: Basic, Pro, Premium, Enterprise")
    
    def test_hotels_list_with_subscription_info(self, sa_token):
        """Test GET /api/superadmin/hotels returns subscription info for subscriptions page"""
        response = requests.get(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Hotels with subscriptions should have subscription fields
        for hotel in data:
            if hotel.get("subscription_plan"):
                assert "subscription_status" in hotel or hotel.get("subscription_status") is None
                assert "max_users" in hotel
                print(f"Hotel {hotel['name']}: {hotel.get('subscription_plan')} plan")
    
    def test_create_subscription_with_all_options(self, sa_token):
        """Test POST /api/superadmin/subscriptions with hotel/plan/frequency selection"""
        # Create a test hotel first
        hotel_response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "name": f"TEST_SubPage_{uuid.uuid4().hex[:8]}",
                "legal_name": "TEST Subscription Page Hotel",
                "address": "123 Sub Page Street",
                "city": "Paris",
                "postal_code": "75001",
                "country": "France",
                "siret": f"TSP{uuid.uuid4().hex[:10]}",
                "contact_email": "subpage@test.fr",
                "contact_phone": "+33 1 00 00 00 00",
                "contact_name": "Sub Page Contact"
            }
        )
        
        if hotel_response.status_code != 200:
            pytest.skip("Could not create test hotel")
        
        hotel_id = hotel_response.json()["id"]
        
        try:
            # Create subscription with all options
            response = requests.post(
                f"{BASE_URL}/api/superadmin/subscriptions",
                headers={"Authorization": f"Bearer {sa_token}"},
                json={
                    "hotel_id": hotel_id,
                    "plan": "premium",
                    "payment_frequency": "annual",
                    "trial_type": "free_15_days",
                    "custom_max_users": 50,
                    "custom_price_monthly": 300,
                    "notes": "Test subscription from page"
                }
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            assert data["plan"] == "premium"
            assert data["payment_frequency"] == "annual"
            assert data["status"] == "trial"
            assert data["max_users"] == 50
            
            print(f"Subscription created: {data['plan']} - {data['price_effective']}€")
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
                headers={"Authorization": f"Bearer {sa_token}"}
            )
    
    def test_cancel_subscription(self, sa_token):
        """Test PATCH /api/superadmin/subscriptions/{id}/cancel cancels subscription"""
        # Create hotel and subscription
        hotel_response = requests.post(
            f"{BASE_URL}/api/superadmin/hotels",
            headers={"Authorization": f"Bearer {sa_token}"},
            json={
                "name": f"TEST_Cancel_{uuid.uuid4().hex[:8]}",
                "legal_name": "TEST Cancel Hotel",
                "address": "123 Cancel Street",
                "city": "Lyon",
                "postal_code": "69001",
                "country": "France",
                "siret": f"TCN{uuid.uuid4().hex[:10]}",
                "contact_email": "cancel@test.fr",
                "contact_phone": "+33 4 00 00 00 00",
                "contact_name": "Cancel Contact"
            }
        )
        
        if hotel_response.status_code != 200:
            pytest.skip("Could not create test hotel")
        
        hotel_id = hotel_response.json()["id"]
        
        try:
            # Create subscription
            sub_response = requests.post(
                f"{BASE_URL}/api/superadmin/subscriptions",
                headers={"Authorization": f"Bearer {sa_token}"},
                json={
                    "hotel_id": hotel_id,
                    "plan": "basic",
                    "payment_frequency": "monthly",
                    "trial_type": "none"
                }
            )
            
            if sub_response.status_code != 200:
                pytest.skip("Could not create subscription")
            
            # Get subscription ID from the created subscription
            subscription_id = sub_response.json()["id"]
            
            # Cancel subscription using subscription_id
            response = requests.patch(
                f"{BASE_URL}/api/superadmin/subscriptions/{subscription_id}/cancel",
                headers={"Authorization": f"Bearer {sa_token}"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            assert "annulé" in response.json()["message"]
            print("Subscription cancelled successfully")
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/superadmin/hotels/{hotel_id}",
                headers={"Authorization": f"Bearer {sa_token}"}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
