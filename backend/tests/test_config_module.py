"""
Flowtym Configuration Module - Backend API Tests

Tests all Configuration CRUD operations:
- Hotel Profile (GET/PUT)
- Room Types (CRUD)
- Rooms (CRUD + Excel template)
- Rate Plans (CRUD + derivation)
- Cancellation Policies (CRUD)
- Payment Policies (CRUD)
- Users (CRUD)
- Roles (GET)
- Settings (GET/PUT)
- Summary (GET)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"

# Test data tracking for cleanup
created_ids = {
    "room_types": [],
    "rooms": [],
    "rate_plans": [],
    "cancellation_policies": [],
    "payment_policies": [],
    "users": []
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@flowtym.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HOTEL PROFILE TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestHotelProfile:
    """Hotel Profile endpoint tests"""
    
    def test_get_hotel_profile(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/profile - Get hotel profile"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/profile",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "tenant_id" in data or "id" in data
        print(f"✓ Hotel profile retrieved: {data.get('name', 'N/A')}")
    
    def test_update_hotel_profile(self, auth_headers):
        """PUT /api/config/hotels/{hotel_id}/profile - Update hotel profile"""
        update_data = {
            "name": "TEST_Grand Hôtel Paris",
            "stars": 4,
            "currency": "EUR",
            "timezone": "Europe/Paris",
            "default_language": "fr",
            "check_in_time": "15:00",
            "check_out_time": "11:00"
        }
        response = requests.put(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/profile",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "TEST_Grand Hôtel Paris"
        assert data.get("stars") == 4
        print(f"✓ Hotel profile updated: {data.get('name')}")


# ═══════════════════════════════════════════════════════════════════════════════
# ROOM TYPES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRoomTypes:
    """Room Types CRUD tests"""
    
    def test_get_room_types(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/room-types - List room types"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Room types retrieved: {len(data)} types")
    
    def test_create_room_type(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/room-types - Create room type"""
        unique_code = f"TST{uuid.uuid4().hex[:4].upper()}"
        room_type_data = {
            "code": unique_code,
            "name": "TEST_Chambre Test",
            "name_en": "Test Room",
            "category": "standard",
            "max_occupancy": 2,
            "max_adults": 2,
            "max_children": 1,
            "base_price": 120,
            "size_sqm": 25,
            "view": "city",
            "bathroom": "shower",
            "equipment": ["wifi", "tv", "minibar"],
            "description": "Test room type"
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types",
            headers=auth_headers,
            json=room_type_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("code") == unique_code
        assert data.get("name") == "TEST_Chambre Test"
        assert data.get("base_price") == 120
        assert "id" in data
        created_ids["room_types"].append(data["id"])
        print(f"✓ Room type created: {data.get('code')} - {data.get('name')}")
        return data["id"]
    
    def test_get_single_room_type(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/room-types/{type_id} - Get single room type"""
        # First create a room type
        unique_code = f"GT{uuid.uuid4().hex[:4].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types",
            headers=auth_headers,
            json={
                "code": unique_code,
                "name": "TEST_Get Single",
                "category": "standard",
                "max_occupancy": 2,
                "max_adults": 2,
                "max_children": 0,
                "base_price": 100
            }
        )
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        created_ids["room_types"].append(type_id)
        
        # Get the room type
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types/{type_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == type_id
        assert data.get("code") == unique_code
        print(f"✓ Single room type retrieved: {data.get('code')}")
    
    def test_update_room_type(self, auth_headers):
        """PUT /api/config/hotels/{hotel_id}/room-types/{type_id} - Update room type"""
        # First create a room type
        unique_code = f"UP{uuid.uuid4().hex[:4].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types",
            headers=auth_headers,
            json={
                "code": unique_code,
                "name": "TEST_To Update",
                "category": "standard",
                "max_occupancy": 2,
                "max_adults": 2,
                "max_children": 0,
                "base_price": 100
            }
        )
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        created_ids["room_types"].append(type_id)
        
        # Update the room type
        update_response = requests.put(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types/{type_id}",
            headers=auth_headers,
            json={
                "name": "TEST_Updated Name",
                "base_price": 150,
                "category": "superior"
            }
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("name") == "TEST_Updated Name"
        assert data.get("base_price") == 150
        assert data.get("category") == "superior"
        print(f"✓ Room type updated: {data.get('name')}")


# ═══════════════════════════════════════════════════════════════════════════════
# ROOMS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRooms:
    """Rooms CRUD tests"""
    
    def test_get_rooms(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/rooms - List rooms"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rooms",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Rooms retrieved: {len(data)} rooms")
    
    def test_create_room(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/rooms - Create room"""
        # First get a room type
        types_response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types",
            headers=auth_headers
        )
        assert types_response.status_code == 200
        room_types = types_response.json()
        
        if not room_types:
            pytest.skip("No room types available to create room")
        
        room_type_id = room_types[0]["id"]
        unique_number = f"T{uuid.uuid4().hex[:3].upper()}"
        
        room_data = {
            "room_number": unique_number,
            "room_type_id": room_type_id,
            "floor": 1,
            "view": "city",
            "bathroom": "shower",
            "is_accessible": False,
            "notes": "Test room"
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rooms",
            headers=auth_headers,
            json=room_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("room_number") == unique_number
        assert data.get("room_type_id") == room_type_id
        assert "id" in data
        created_ids["rooms"].append(data["id"])
        print(f"✓ Room created: {data.get('room_number')}")
    
    def test_download_room_template(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/rooms/import/template - Download Excel template"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rooms/import/template",
            headers={"Authorization": auth_headers["Authorization"]}
        )
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("Content-Type", "")
        assert len(response.content) > 0
        print(f"✓ Excel template downloaded: {len(response.content)} bytes")


# ═══════════════════════════════════════════════════════════════════════════════
# RATE PLANS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRatePlans:
    """Rate Plans CRUD tests"""
    
    def test_get_rate_plans(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/rate-plans - List rate plans"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rate-plans",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Rate plans retrieved: {len(data)} plans")
    
    def test_create_base_rate_plan(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/rate-plans - Create base rate plan"""
        unique_code = f"RP{uuid.uuid4().hex[:4].upper()}"
        rate_plan_data = {
            "code": unique_code,
            "name": "TEST_Tarif Flexible",
            "name_en": "Flexible Rate",
            "rate_type": "flexible",
            "meal_plan": "breakfast",
            "is_derived": False,
            "reference_price": 150,
            "includes_breakfast": True,
            "is_public": True,
            "description": "Test rate plan"
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rate-plans",
            headers=auth_headers,
            json=rate_plan_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("code") == unique_code
        assert data.get("name") == "TEST_Tarif Flexible"
        assert data.get("is_derived") == False
        assert "id" in data
        created_ids["rate_plans"].append(data["id"])
        print(f"✓ Base rate plan created: {data.get('code')} - {data.get('name')}")
        return data["id"]
    
    def test_create_derived_rate_plan(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/rate-plans - Create derived rate plan"""
        # First create a base rate
        base_code = f"BS{uuid.uuid4().hex[:4].upper()}"
        base_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rate-plans",
            headers=auth_headers,
            json={
                "code": base_code,
                "name": "TEST_Base Rate",
                "rate_type": "bar",
                "meal_plan": "room_only",
                "is_derived": False,
                "reference_price": 200,
                "is_public": True
            }
        )
        assert base_response.status_code == 200
        base_id = base_response.json()["id"]
        created_ids["rate_plans"].append(base_id)
        
        # Create derived rate
        derived_code = f"DR{uuid.uuid4().hex[:4].upper()}"
        derived_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rate-plans",
            headers=auth_headers,
            json={
                "code": derived_code,
                "name": "TEST_Non Remboursable",
                "rate_type": "non_refundable",
                "meal_plan": "room_only",
                "is_derived": True,
                "parent_rate_id": base_id,
                "derivation_rule": {
                    "method": "percentage",
                    "value": -10,
                    "round_to": 1
                },
                "is_public": True
            }
        )
        assert derived_response.status_code == 200
        data = derived_response.json()
        assert data.get("is_derived") == True
        assert data.get("parent_rate_id") == base_id
        assert data.get("derivation_rule", {}).get("value") == -10
        created_ids["rate_plans"].append(data["id"])
        print(f"✓ Derived rate plan created: {data.get('code')} (-10% from {base_code})")


# ═══════════════════════════════════════════════════════════════════════════════
# CANCELLATION POLICIES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestCancellationPolicies:
    """Cancellation Policies CRUD tests"""
    
    def test_get_cancellation_policies(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/cancellation-policies - List policies"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/cancellation-policies",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Cancellation policies retrieved: {len(data)} policies")
    
    def test_create_cancellation_policy(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/cancellation-policies - Create policy"""
        unique_code = f"CP{uuid.uuid4().hex[:4].upper()}"
        policy_data = {
            "code": unique_code,
            "name": "TEST_Flexible 24h",
            "name_en": "Flexible 24h",
            "policy_type": "flexible",
            "rules": [
                {"days_before_arrival": 1, "penalty_type": "first_night", "penalty_value": 0}
            ],
            "no_show_penalty_type": "first_night",
            "allow_modifications": True,
            "terms_short": "Annulation gratuite jusqu'à 24h avant"
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/cancellation-policies",
            headers=auth_headers,
            json=policy_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("code") == unique_code
        assert data.get("policy_type") == "flexible"
        assert "id" in data
        created_ids["cancellation_policies"].append(data["id"])
        print(f"✓ Cancellation policy created: {data.get('code')} - {data.get('name')}")


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT POLICIES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestPaymentPolicies:
    """Payment Policies CRUD tests"""
    
    def test_get_payment_policies(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/payment-policies - List policies"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/payment-policies",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment policies retrieved: {len(data)} policies")
    
    def test_create_payment_policy(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/payment-policies - Create policy"""
        unique_code = f"PP{uuid.uuid4().hex[:4].upper()}"
        policy_data = {
            "code": unique_code,
            "name": "TEST_Paiement Arrivée",
            "name_en": "Payment at Arrival",
            "timing": "at_arrival",
            "deposit_percentage": 0,
            "balance_due_timing": "at_arrival",
            "accepted_methods": ["credit_card", "cash"],
            "requires_card_guarantee": True
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/payment-policies",
            headers=auth_headers,
            json=policy_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("code") == unique_code
        assert data.get("timing") == "at_arrival"
        assert "credit_card" in data.get("accepted_methods", [])
        assert "id" in data
        created_ids["payment_policies"].append(data["id"])
        print(f"✓ Payment policy created: {data.get('code')} - {data.get('name')}")


# ═══════════════════════════════════════════════════════════════════════════════
# USERS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestConfigUsers:
    """Config Users CRUD tests"""
    
    def test_get_users(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/users - List users"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Config users retrieved: {len(data)} users")
    
    def test_get_available_roles(self, auth_headers):
        """GET /api/config/roles - Get available roles"""
        response = requests.get(
            f"{BASE_URL}/api/config/roles",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify role structure
        for role in data:
            assert "code" in role
            assert "name" in role
        print(f"✓ Available roles retrieved: {[r['code'] for r in data]}")
    
    def test_create_user(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/users - Create user"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@hotel.com"
        user_data = {
            "email": unique_email,
            "first_name": "TEST_Marie",
            "last_name": "Dupont",
            "role": "reception",
            "department": "front_office",
            "phone": "+33 6 12 34 56 78",
            "job_title": "Réceptionniste",
            "language": "fr"
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=user_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == unique_email.lower()
        assert data.get("first_name") == "TEST_Marie"
        assert data.get("role") == "reception"
        assert "id" in data
        created_ids["users"].append(data["id"])
        print(f"✓ User created: {data.get('full_name')} ({data.get('role')})")


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdvancedSettings:
    """Advanced Settings tests"""
    
    def test_get_settings(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/settings - Get settings"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "tenant_id" in data or "id" in data
        print(f"✓ Settings retrieved: configured={data.get('is_configured', False)}")
    
    def test_update_settings(self, auth_headers):
        """PUT /api/config/hotels/{hotel_id}/settings - Update settings"""
        settings_data = {
            "min_booking_advance_hours": 2,
            "max_booking_advance_days": 365,
            "default_arrival_time": "15:00",
            "default_departure_time": "11:00",
            "allow_same_day_booking": True,
            "overbooking_allowed": False,
            "round_prices_to": 1,
            "auto_confirmation_email": True,
            "auto_reminder_email": True,
            "reminder_days_before": 3
        }
        response = requests.put(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/settings",
            headers=auth_headers,
            json=settings_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("min_booking_advance_hours") == 2
        assert data.get("allow_same_day_booking") == True
        print(f"✓ Settings updated")
    
    def test_add_tax_rule(self, auth_headers):
        """POST /api/config/hotels/{hotel_id}/taxes - Add tax rule"""
        unique_code = f"TX{uuid.uuid4().hex[:4].upper()}"
        tax_data = {
            "code": unique_code,
            "name": "TEST_TVA 10%",
            "tax_type": "vat",
            "rate": 10,
            "applies_to": "room",
            "is_included": True
        }
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/taxes",
            headers=auth_headers,
            json=tax_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("code") == unique_code
        assert data.get("rate") == 10
        print(f"✓ Tax rule added: {data.get('code')} - {data.get('rate')}%")


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestConfigurationSummary:
    """Configuration Summary tests"""
    
    def test_get_summary(self, auth_headers):
        """GET /api/config/hotels/{hotel_id}/summary - Get configuration summary"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "hotel_id" in data
        assert "room_types" in data
        assert "rooms" in data
        assert "rate_plans" in data
        assert "cancellation_policies" in data
        assert "payment_policies" in data
        assert "users" in data
        assert "completion_percentage" in data
        assert "checklist" in data
        
        print(f"✓ Configuration summary retrieved:")
        print(f"  - Room types: {data.get('room_types')}")
        print(f"  - Rooms: {data.get('rooms')}")
        print(f"  - Rate plans: {data.get('rate_plans')}")
        print(f"  - Cancellation policies: {data.get('cancellation_policies')}")
        print(f"  - Payment policies: {data.get('payment_policies')}")
        print(f"  - Users: {data.get('users')}")
        print(f"  - Completion: {data.get('completion_percentage')}%")


# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP (runs after all tests)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    """Cleanup test data after all tests complete"""
    yield
    
    # Note: Soft deletes are used, so we just deactivate test data
    print("\n--- Cleanup: Deactivating test data ---")
    
    # Cleanup users
    for user_id in created_ids["users"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users/{user_id}",
                headers=auth_headers
            )
        except:
            pass
    
    # Cleanup rate plans (derived first, then base)
    for rate_id in reversed(created_ids["rate_plans"]):
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rate-plans/{rate_id}",
                headers=auth_headers
            )
        except:
            pass
    
    # Cleanup rooms
    for room_id in created_ids["rooms"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/rooms/{room_id}",
                headers=auth_headers
            )
        except:
            pass
    
    # Cleanup room types
    for type_id in created_ids["room_types"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/room-types/{type_id}",
                headers=auth_headers
            )
        except:
            pass
    
    # Cleanup policies
    for policy_id in created_ids["cancellation_policies"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/cancellation-policies/{policy_id}",
                headers=auth_headers
            )
        except:
            pass
    
    for policy_id in created_ids["payment_policies"]:
        try:
            requests.delete(
                f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/payment-policies/{policy_id}",
                headers=auth_headers
            )
        except:
            pass
    
    print("--- Cleanup complete ---")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
