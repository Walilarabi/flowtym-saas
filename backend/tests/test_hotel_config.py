"""
Test Suite for Super Admin Hotel Configuration & Subscription Management APIs
Tests: Hotel config, room types, rooms, equipment, services, subscription management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHotelConfigAPIs:
    """Test Hotel Configuration and Subscription Management APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token, find/create test hotel"""
        # Login as super admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@flowtym.com",
            "password": "super123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Get list of hotels to find a test hotel
        hotels_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels", headers=self.headers)
        assert hotels_resp.status_code == 200, f"Failed to get hotels: {hotels_resp.text}"
        hotels = hotels_resp.json()
        
        # Find TEST_Cancel_012c9cb8 hotel (mentioned in context) or use first available
        self.test_hotel = None
        for h in hotels:
            if h.get("name") == "TEST_Cancel_012c9cb8":
                self.test_hotel = h
                break
        
        if not self.test_hotel and hotels:
            self.test_hotel = hotels[0]
        
        assert self.test_hotel is not None, "No test hotel found"
        self.hotel_id = self.test_hotel["id"]
        print(f"Using test hotel: {self.test_hotel['name']} (ID: {self.hotel_id})")
        
        # Get available plans for subscription tests
        plans_resp = requests.get(f"{BASE_URL}/api/superadmin/catalog/plans", headers=self.headers)
        if plans_resp.status_code == 200:
            self.plans = plans_resp.json()
        else:
            self.plans = []
    
    # ==================== HOTEL CONFIG TESTS ====================
    
    def test_get_hotel_config(self):
        """GET /api/superadmin/hotels/{id}/config - returns complete hotel configuration"""
        resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        # Verify response structure
        assert "hotel" in data, "Response should contain 'hotel'"
        assert "room_types" in data, "Response should contain 'room_types'"
        assert "rooms" in data, "Response should contain 'rooms'"
        assert "equipment" in data, "Response should contain 'equipment'"
        assert "services" in data, "Response should contain 'services'"
        assert "subscription" in data, "Response should contain 'subscription'"
        
        # Verify hotel data
        assert data["hotel"]["id"] == self.hotel_id
        print(f"✓ GET hotel config - hotel: {data['hotel']['name']}, room_types: {len(data['room_types'])}, rooms: {len(data['rooms'])}")
    
    def test_update_hotel_config(self):
        """PUT /api/superadmin/hotels/{id}/config - update hotel info"""
        update_data = {
            "description": f"TEST_Updated description {uuid.uuid4().hex[:8]}",
            "check_in_time": "15:00",
            "check_out_time": "11:00"
        }
        
        resp = requests.put(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config", 
                           headers=self.headers, json=update_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert "message" in data
        assert "updated_fields" in data
        print(f"✓ PUT hotel config - updated fields: {data['updated_fields']}")
        
        # Verify update persisted
        verify_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config", headers=self.headers)
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["hotel"]["description"] == update_data["description"]
        print(f"✓ Verified update persisted")
    
    # ==================== ROOM TYPES TESTS ====================
    
    def test_create_room_type(self):
        """POST /api/superadmin/hotels/{id}/room-types - create room type"""
        unique_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        room_type_data = {
            "code": unique_code,
            "name": f"Test Room Type {unique_code}",
            "description": "Test room type for automated testing",
            "base_capacity": 2,
            "max_capacity": 4,
            "base_price": 150.0,
            "amenities": ["wifi", "tv", "minibar"]
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types",
                            headers=self.headers, json=room_type_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert data["code"] == unique_code
        assert data["name"] == room_type_data["name"]
        assert "id" in data
        self.created_room_type_id = data["id"]
        self.created_room_type_code = unique_code
        print(f"✓ POST room-types - created: {data['name']} (code: {unique_code})")
        
        # Verify persistence
        list_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types", headers=self.headers)
        assert list_resp.status_code == 200
        room_types = list_resp.json()
        found = any(rt["code"] == unique_code for rt in room_types)
        assert found, "Created room type not found in list"
        print(f"✓ Verified room type persisted in list")
    
    def test_create_room_type_duplicate_code_rejected(self):
        """POST /api/superadmin/hotels/{id}/room-types - duplicate code rejected"""
        # First create a room type
        unique_code = f"DUP_{uuid.uuid4().hex[:6].upper()}"
        room_type_data = {
            "code": unique_code,
            "name": f"Duplicate Test {unique_code}",
            "base_capacity": 2,
            "max_capacity": 3,
            "base_price": 100.0
        }
        
        resp1 = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types",
                             headers=self.headers, json=room_type_data)
        assert resp1.status_code == 200, f"First create failed: {resp1.text}"
        
        # Try to create with same code
        resp2 = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types",
                             headers=self.headers, json=room_type_data)
        assert resp2.status_code == 400, f"Expected 400 for duplicate, got {resp2.status_code}"
        assert "déjà utilisé" in resp2.json().get("detail", "").lower() or "already" in resp2.json().get("detail", "").lower()
        print(f"✓ Duplicate room type code correctly rejected")
    
    # ==================== ROOMS TESTS ====================
    
    def test_create_room(self):
        """POST /api/superadmin/hotels/{id}/rooms - create room"""
        # First ensure we have a room type
        room_types_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types", headers=self.headers)
        room_types = room_types_resp.json() if room_types_resp.status_code == 200 else []
        
        if not room_types:
            # Create a room type first
            rt_resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/room-types",
                                   headers=self.headers, json={
                                       "code": f"RT_{uuid.uuid4().hex[:6].upper()}",
                                       "name": "Standard Room",
                                       "base_capacity": 2,
                                       "max_capacity": 3,
                                       "base_price": 100.0
                                   })
            assert rt_resp.status_code == 200, f"Failed to create room type: {rt_resp.text}"
            room_type_code = rt_resp.json()["code"]
        else:
            room_type_code = room_types[0]["code"]
        
        unique_number = f"T{uuid.uuid4().hex[:4].upper()}"
        room_data = {
            "number": unique_number,
            "room_type_code": room_type_code,
            "floor": 1,
            "status": "available",
            "notes": "Test room"
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/rooms",
                            headers=self.headers, json=room_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert data["number"] == unique_number
        assert data["room_type_code"] == room_type_code
        assert "id" in data
        print(f"✓ POST rooms - created room: {unique_number} (type: {room_type_code})")
        
        # Verify persistence
        list_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/rooms", headers=self.headers)
        assert list_resp.status_code == 200
        rooms = list_resp.json()
        found = any(r["number"] == unique_number for r in rooms)
        assert found, "Created room not found in list"
        print(f"✓ Verified room persisted in list")
    
    def test_create_room_invalid_type_rejected(self):
        """POST /api/superadmin/hotels/{id}/rooms - invalid room type rejected"""
        room_data = {
            "number": f"INV{uuid.uuid4().hex[:4].upper()}",
            "room_type_code": "NONEXISTENT_TYPE_XYZ",
            "floor": 1
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/rooms",
                            headers=self.headers, json=room_data)
        assert resp.status_code == 400, f"Expected 400 for invalid type, got {resp.status_code}"
        print(f"✓ Invalid room type correctly rejected")
    
    # ==================== EQUIPMENT TESTS ====================
    
    def test_create_equipment(self):
        """POST /api/superadmin/hotels/{id}/equipment - create equipment"""
        unique_code = f"EQ_{uuid.uuid4().hex[:6].upper()}"
        equipment_data = {
            "code": unique_code,
            "name": f"Test Equipment {unique_code}",
            "category": "room",
            "quantity": 10
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/equipment",
                            headers=self.headers, json=equipment_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert data["code"] == unique_code
        assert data["name"] == equipment_data["name"]
        assert data["quantity"] == 10
        assert "id" in data
        print(f"✓ POST equipment - created: {data['name']} (qty: {data['quantity']})")
        
        # Verify persistence
        list_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/equipment", headers=self.headers)
        assert list_resp.status_code == 200
        equipment = list_resp.json()
        found = any(e["code"] == unique_code for e in equipment)
        assert found, "Created equipment not found in list"
        print(f"✓ Verified equipment persisted in list")
    
    # ==================== SERVICES TESTS ====================
    
    def test_create_service(self):
        """POST /api/superadmin/hotels/{id}/services - create service"""
        unique_code = f"SVC_{uuid.uuid4().hex[:6].upper()}"
        service_data = {
            "code": unique_code,
            "name": f"Test Service {unique_code}",
            "description": "Test service for automated testing",
            "price": 25.0,
            "is_included": False,
            "category": "general"
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/services",
                            headers=self.headers, json=service_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert data["code"] == unique_code
        assert data["name"] == service_data["name"]
        assert data["price"] == 25.0
        assert "id" in data
        print(f"✓ POST services - created: {data['name']} (price: {data['price']}€)")
        
        # Verify persistence
        list_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/services", headers=self.headers)
        assert list_resp.status_code == 200
        services = list_resp.json()
        found = any(s["code"] == unique_code for s in services)
        assert found, "Created service not found in list"
        print(f"✓ Verified service persisted in list")
    
    # ==================== SUBSCRIPTION MANAGEMENT TESTS ====================
    
    def test_assign_subscription(self):
        """POST /api/superadmin/hotels/{id}/subscription/assign - assign plan to hotel"""
        if not self.plans:
            pytest.skip("No plans available for subscription test")
        
        plan = self.plans[0]  # Use first available plan
        
        assign_data = {
            "plan_id": plan["id"],
            "payment_frequency": "monthly",
            "trial_days": 14,
            "notes": "Test subscription assignment"
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/assign",
                            headers=self.headers, json=assign_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert data["plan_id"] == plan["id"]
        assert data["status"] == "trial"  # Should be trial since trial_days > 0
        assert data["trial_days"] == 14
        assert "id" in data
        print(f"✓ POST subscription/assign - assigned plan: {data['plan_name']} (status: {data['status']})")
        
        # Verify persistence via config endpoint
        config_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config", headers=self.headers)
        assert config_resp.status_code == 200
        config_data = config_resp.json()
        assert config_data["subscription"] is not None
        print(f"✓ Verified subscription persisted in hotel config")
    
    def test_modify_subscription_upgrade(self):
        """POST /api/superadmin/hotels/{id}/subscription/modify - upgrade/downgrade"""
        if len(self.plans) < 2:
            pytest.skip("Need at least 2 plans for upgrade test")
        
        # First assign a plan
        plan1 = self.plans[0]
        assign_resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/assign",
                                   headers=self.headers, json={
                                       "plan_id": plan1["id"],
                                       "payment_frequency": "monthly",
                                       "trial_days": 0
                                   })
        if assign_resp.status_code != 200:
            pytest.skip(f"Could not assign initial plan: {assign_resp.text}")
        
        # Now upgrade to second plan
        plan2 = self.plans[1]
        modify_data = {
            "new_plan_id": plan2["id"],
            "apply_immediately": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/modify",
                            headers=self.headers, json=modify_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert "message" in data
        assert "changes" in data
        print(f"✓ POST subscription/modify - changes: {data['changes']}")
    
    def test_modify_subscription_add_modules(self):
        """POST /api/superadmin/hotels/{id}/subscription/modify - add modules"""
        # First ensure hotel has a subscription
        config_resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config", headers=self.headers)
        if config_resp.status_code != 200 or not config_resp.json().get("subscription"):
            if self.plans:
                # Assign a plan first
                requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/assign",
                             headers=self.headers, json={
                                 "plan_id": self.plans[0]["id"],
                                 "payment_frequency": "monthly",
                                 "trial_days": 0
                             })
            else:
                pytest.skip("No subscription and no plans available")
        
        modify_data = {
            "add_modules": ["finance", "marketing"],
            "apply_immediately": True
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/modify",
                            headers=self.headers, json=modify_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert "message" in data
        print(f"✓ POST subscription/modify (add modules) - changes: {data.get('changes', [])}")
    
    def test_extend_trial(self):
        """POST /api/superadmin/hotels/{id}/subscription/extend-trial - extend trial period"""
        # First ensure hotel has a trial subscription
        if self.plans:
            assign_resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/assign",
                                       headers=self.headers, json={
                                           "plan_id": self.plans[0]["id"],
                                           "payment_frequency": "monthly",
                                           "trial_days": 14
                                       })
            if assign_resp.status_code != 200:
                pytest.skip(f"Could not create trial subscription: {assign_resp.text}")
        else:
            pytest.skip("No plans available")
        
        extend_data = {
            "additional_days": 7,
            "reason": "Customer evaluation in progress"
        }
        
        resp = requests.post(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/extend-trial",
                            headers=self.headers, json=extend_data)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert "message" in data
        assert "7" in data["message"] or "jours" in data["message"]
        print(f"✓ POST subscription/extend-trial - {data['message']}")
    
    def test_get_hotel_modules(self):
        """GET /api/superadmin/hotels/{id}/subscription/modules - get current modules"""
        resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/subscription/modules",
                           headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        
        data = resp.json()
        assert "modules" in data
        print(f"✓ GET subscription/modules - {len(data['modules'])} modules")
    
    # ==================== ERROR HANDLING TESTS ====================
    
    def test_get_config_nonexistent_hotel(self):
        """GET /api/superadmin/hotels/{id}/config - 404 for nonexistent hotel"""
        fake_id = str(uuid.uuid4())
        resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{fake_id}/config", headers=self.headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"✓ Nonexistent hotel correctly returns 404")
    
    def test_unauthorized_access(self):
        """Test unauthorized access to hotel config"""
        resp = requests.get(f"{BASE_URL}/api/superadmin/hotels/{self.hotel_id}/config")
        assert resp.status_code in [401, 403, 422], f"Expected auth error, got {resp.status_code}"
        print(f"✓ Unauthorized access correctly rejected")


# Cleanup fixture to remove TEST_ prefixed data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Note: In production, implement cleanup logic here
    print("\n[Cleanup] Test data cleanup would run here")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
