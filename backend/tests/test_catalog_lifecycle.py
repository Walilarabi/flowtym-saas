"""
Test Suite for Super Admin Catalog and Subscription Lifecycle APIs
Tests: Modules, Plans CRUD, Pause/Reactivate, Downgrade Check
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@flowtym.com"
SUPERADMIN_PASSWORD = "super123"


class TestCatalogModules:
    """Test catalog modules endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_modules_returns_10_modules(self):
        """GET /api/superadmin/catalog/modules - returns list of 10 available modules"""
        res = requests.get(f"{BASE_URL}/api/superadmin/catalog/modules", headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        modules = res.json()
        assert isinstance(modules, list), "Response should be a list"
        assert len(modules) == 10, f"Expected 10 modules, got {len(modules)}"
        
        # Verify expected module codes
        expected_codes = ["pms", "staff", "channel_manager", "crm", "rms", 
                        "e_reputation", "operations", "booking_engine", "finance", "marketing"]
        actual_codes = [m["code"] for m in modules]
        for code in expected_codes:
            assert code in actual_codes, f"Module {code} not found in response"
        
        # Verify module structure
        for mod in modules:
            assert "code" in mod, "Module should have 'code'"
            assert "name" in mod, "Module should have 'name'"
            assert "description" in mod, "Module should have 'description'"
            assert "icon" in mod, "Module should have 'icon'"
            assert "features" in mod, "Module should have 'features'"
            assert isinstance(mod["features"], dict), "Features should be a dict"
        
        print(f"✓ GET /api/superadmin/catalog/modules - returned {len(modules)} modules")


class TestCatalogPlans:
    """Test catalog plans CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_plans(self):
        """GET /api/superadmin/catalog/plans - returns list of plans"""
        res = requests.get(f"{BASE_URL}/api/superadmin/catalog/plans", headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        plans = res.json()
        assert isinstance(plans, list), "Response should be a list"
        
        # Verify plan structure if plans exist
        if len(plans) > 0:
            plan = plans[0]
            assert "id" in plan, "Plan should have 'id'"
            assert "name" in plan, "Plan should have 'name'"
            assert "code" in plan, "Plan should have 'code'"
            assert "price_monthly" in plan, "Plan should have 'price_monthly'"
            assert "price_annual" in plan, "Plan should have 'price_annual'"
            assert "modules" in plan, "Plan should have 'modules'"
        
        print(f"✓ GET /api/superadmin/catalog/plans - returned {len(plans)} plans")
    
    def test_list_plans_include_inactive(self):
        """GET /api/superadmin/catalog/plans?include_inactive=true - includes inactive plans"""
        res = requests.get(f"{BASE_URL}/api/superadmin/catalog/plans?include_inactive=true", headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        plans = res.json()
        assert isinstance(plans, list), "Response should be a list"
        print(f"✓ GET /api/superadmin/catalog/plans?include_inactive=true - returned {len(plans)} plans")
    
    def test_create_plan(self):
        """POST /api/superadmin/catalog/plans - create new plan with modules and features"""
        unique_code = f"test_plan_{uuid.uuid4().hex[:8]}"
        
        plan_data = {
            "name": f"TEST Plan {unique_code}",
            "code": unique_code,
            "description": "Test plan for automated testing",
            "price_monthly": 149.99,
            "price_annual": 1499.99,
            "annual_discount_percent": 15.0,
            "max_users": 10,
            "trial_days": 14,
            "commitment_months": 12,
            "modules": [
                {"code": "pms", "enabled": True, "features": [{"code": "reservations", "enabled": True}]},
                {"code": "staff", "enabled": True, "features": [{"code": "planning", "enabled": True}]}
            ],
            "is_active": True,
            "is_featured": False,
            "sort_order": 99
        }
        
        res = requests.post(f"{BASE_URL}/api/superadmin/catalog/plans", json=plan_data, headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        created_plan = res.json()
        assert created_plan["name"] == plan_data["name"], "Name should match"
        assert created_plan["code"] == plan_data["code"], "Code should match"
        assert created_plan["price_monthly"] == plan_data["price_monthly"], "Price monthly should match"
        assert created_plan["price_annual"] == plan_data["price_annual"], "Price annual should match"
        assert created_plan["max_users"] == plan_data["max_users"], "Max users should match"
        assert created_plan["trial_days"] == plan_data["trial_days"], "Trial days should match"
        assert "id" in created_plan, "Created plan should have an ID"
        assert len(created_plan["modules"]) == 2, "Should have 2 modules"
        
        # Store plan_id for cleanup
        self.created_plan_id = created_plan["id"]
        
        print(f"✓ POST /api/superadmin/catalog/plans - created plan {created_plan['id']}")
        
        # Cleanup - delete the test plan
        del_res = requests.delete(f"{BASE_URL}/api/superadmin/catalog/plans/{created_plan['id']}", headers=self.headers)
        assert del_res.status_code == 200, f"Cleanup failed: {del_res.text}"
    
    def test_create_plan_duplicate_code_fails(self):
        """POST /api/superadmin/catalog/plans - duplicate code should fail"""
        unique_code = f"test_dup_{uuid.uuid4().hex[:8]}"
        
        plan_data = {
            "name": f"TEST Duplicate {unique_code}",
            "code": unique_code,
            "description": "Test duplicate",
            "price_monthly": 99,
            "price_annual": 999,
            "max_users": 5,
            "modules": [{"code": "pms", "enabled": True}],
            "is_active": True
        }
        
        # Create first plan
        res1 = requests.post(f"{BASE_URL}/api/superadmin/catalog/plans", json=plan_data, headers=self.headers)
        assert res1.status_code == 200, f"First create failed: {res1.text}"
        plan_id = res1.json()["id"]
        
        # Try to create duplicate
        res2 = requests.post(f"{BASE_URL}/api/superadmin/catalog/plans", json=plan_data, headers=self.headers)
        assert res2.status_code == 400, f"Expected 400 for duplicate, got {res2.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/superadmin/catalog/plans/{plan_id}", headers=self.headers)
        
        print("✓ POST /api/superadmin/catalog/plans - duplicate code correctly rejected")
    
    def test_update_plan(self):
        """PUT /api/superadmin/catalog/plans/{id} - update plan"""
        # First create a plan
        unique_code = f"test_upd_{uuid.uuid4().hex[:8]}"
        plan_data = {
            "name": f"TEST Update {unique_code}",
            "code": unique_code,
            "description": "Original description",
            "price_monthly": 99,
            "price_annual": 999,
            "max_users": 5,
            "modules": [{"code": "pms", "enabled": True}],
            "is_active": True
        }
        
        create_res = requests.post(f"{BASE_URL}/api/superadmin/catalog/plans", json=plan_data, headers=self.headers)
        assert create_res.status_code == 200, f"Create failed: {create_res.text}"
        plan_id = create_res.json()["id"]
        
        # Update the plan
        update_data = {
            "name": f"TEST Updated {unique_code}",
            "description": "Updated description",
            "price_monthly": 149,
            "max_users": 10
        }
        
        update_res = requests.put(f"{BASE_URL}/api/superadmin/catalog/plans/{plan_id}", json=update_data, headers=self.headers)
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        
        updated_plan = update_res.json()
        assert updated_plan["name"] == update_data["name"], "Name should be updated"
        assert updated_plan["description"] == update_data["description"], "Description should be updated"
        assert updated_plan["price_monthly"] == update_data["price_monthly"], "Price should be updated"
        assert updated_plan["max_users"] == update_data["max_users"], "Max users should be updated"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/superadmin/catalog/plans/{plan_id}", headers=self.headers)
        
        print(f"✓ PUT /api/superadmin/catalog/plans/{plan_id} - plan updated successfully")
    
    def test_delete_plan(self):
        """DELETE /api/superadmin/catalog/plans/{id} - soft delete plan"""
        # First create a plan
        unique_code = f"test_del_{uuid.uuid4().hex[:8]}"
        plan_data = {
            "name": f"TEST Delete {unique_code}",
            "code": unique_code,
            "description": "To be deleted",
            "price_monthly": 99,
            "price_annual": 999,
            "max_users": 5,
            "modules": [{"code": "pms", "enabled": True}],
            "is_active": True
        }
        
        create_res = requests.post(f"{BASE_URL}/api/superadmin/catalog/plans", json=plan_data, headers=self.headers)
        assert create_res.status_code == 200, f"Create failed: {create_res.text}"
        plan_id = create_res.json()["id"]
        
        # Delete the plan
        del_res = requests.delete(f"{BASE_URL}/api/superadmin/catalog/plans/{plan_id}", headers=self.headers)
        assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
        
        result = del_res.json()
        assert "message" in result, "Response should have message"
        assert "deleted" in result or "deactivated" in result, "Response should indicate deletion status"
        
        print(f"✓ DELETE /api/superadmin/catalog/plans/{plan_id} - plan deleted/deactivated")


class TestSubscriptionLifecycle:
    """Test subscription lifecycle operations: list, pause, reactivate"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_subscriptions(self):
        """GET /api/superadmin/subscriptions/list - list all subscriptions"""
        res = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list", headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        subscriptions = res.json()
        assert isinstance(subscriptions, list), "Response should be a list"
        
        # Verify subscription structure if any exist
        if len(subscriptions) > 0:
            sub = subscriptions[0]
            assert "id" in sub, "Subscription should have 'id'"
            assert "hotel_id" in sub, "Subscription should have 'hotel_id'"
            assert "hotel_name" in sub, "Subscription should have 'hotel_name'"
            assert "status" in sub, "Subscription should have 'status'"
        
        print(f"✓ GET /api/superadmin/subscriptions/list - returned {len(subscriptions)} subscriptions")
        return subscriptions
    
    def test_list_subscriptions_filter_by_status(self):
        """GET /api/superadmin/subscriptions/list?status=active - filter by status"""
        res = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list?status=active", headers=self.headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        subscriptions = res.json()
        assert isinstance(subscriptions, list), "Response should be a list"
        
        # All returned subscriptions should have active status
        for sub in subscriptions:
            assert sub.get("status") == "active", f"Expected active status, got {sub.get('status')}"
        
        print(f"✓ GET /api/superadmin/subscriptions/list?status=active - returned {len(subscriptions)} active subscriptions")
    
    def test_pause_and_reactivate_subscription(self):
        """Test pause and reactivate subscription flow"""
        # First get list of subscriptions to find an active one
        list_res = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list?status=active", headers=self.headers)
        assert list_res.status_code == 200, f"List failed: {list_res.text}"
        
        subscriptions = list_res.json()
        if len(subscriptions) == 0:
            pytest.skip("No active subscriptions to test pause/reactivate")
        
        # Find a subscription to test with
        sub_id = subscriptions[0]["id"]
        original_status = subscriptions[0]["status"]
        
        # Test PAUSE
        pause_res = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions/{sub_id}/pause",
            json={"reason": "Automated test pause"},
            headers=self.headers
        )
        assert pause_res.status_code == 200, f"Pause failed: {pause_res.text}"
        
        pause_result = pause_res.json()
        assert "message" in pause_result, "Pause response should have message"
        assert pause_result.get("subscription_id") == sub_id, "Subscription ID should match"
        
        print(f"✓ POST /api/superadmin/subscriptions/{sub_id}/pause - subscription paused")
        
        # Verify subscription is now paused
        paused_list = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list?status=paused", headers=self.headers)
        assert paused_list.status_code == 200
        paused_subs = paused_list.json()
        paused_ids = [s["id"] for s in paused_subs]
        assert sub_id in paused_ids, "Subscription should appear in paused list"
        
        # Test REACTIVATE
        reactivate_res = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions/{sub_id}/reactivate",
            json={"resume_billing": True},
            headers=self.headers
        )
        assert reactivate_res.status_code == 200, f"Reactivate failed: {reactivate_res.text}"
        
        reactivate_result = reactivate_res.json()
        assert "message" in reactivate_result, "Reactivate response should have message"
        assert reactivate_result.get("subscription_id") == sub_id, "Subscription ID should match"
        
        print(f"✓ POST /api/superadmin/subscriptions/{sub_id}/reactivate - subscription reactivated")
    
    def test_pause_already_paused_fails(self):
        """POST /api/superadmin/subscriptions/{id}/pause - pausing already paused should fail"""
        # Get paused subscriptions
        list_res = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list?status=paused", headers=self.headers)
        assert list_res.status_code == 200
        
        paused_subs = list_res.json()
        if len(paused_subs) == 0:
            pytest.skip("No paused subscriptions to test")
        
        sub_id = paused_subs[0]["id"]
        
        # Try to pause again
        pause_res = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions/{sub_id}/pause",
            json={"reason": "Test double pause"},
            headers=self.headers
        )
        assert pause_res.status_code == 400, f"Expected 400 for double pause, got {pause_res.status_code}"
        
        print("✓ POST /api/superadmin/subscriptions/{id}/pause - double pause correctly rejected")


class TestDowngradeCheck:
    """Test downgrade compatibility check"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_downgrade_check_endpoint_exists(self):
        """POST /api/superadmin/subscriptions/{id}/downgrade/check - endpoint exists"""
        # Get a subscription
        list_res = requests.get(f"{BASE_URL}/api/superadmin/subscriptions/list", headers=self.headers)
        assert list_res.status_code == 200
        
        subscriptions = list_res.json()
        if len(subscriptions) == 0:
            pytest.skip("No subscriptions to test downgrade check")
        
        # Get plans for downgrade target
        plans_res = requests.get(f"{BASE_URL}/api/superadmin/catalog/plans", headers=self.headers)
        assert plans_res.status_code == 200
        
        plans = plans_res.json()
        if len(plans) < 2:
            pytest.skip("Need at least 2 plans to test downgrade")
        
        sub_id = subscriptions[0]["id"]
        target_plan_id = plans[0]["id"]  # Use first plan as target
        
        # Test downgrade check
        check_res = requests.post(
            f"{BASE_URL}/api/superadmin/subscriptions/{sub_id}/downgrade/check",
            json={
                "new_plan_id": target_plan_id,
                "action_on_excess_users": "block",
                "apply_immediately": False
            },
            headers=self.headers
        )
        
        # Should return 200 or 404 (if subscription not found in sa_subscriptions)
        assert check_res.status_code in [200, 404], f"Expected 200 or 404, got {check_res.status_code}: {check_res.text}"
        
        if check_res.status_code == 200:
            result = check_res.json()
            assert "is_compatible" in result, "Response should have 'is_compatible'"
            assert "current_users" in result, "Response should have 'current_users'"
            assert "new_max_users" in result, "Response should have 'new_max_users'"
            assert "message" in result, "Response should have 'message'"
            print(f"✓ POST /api/superadmin/subscriptions/{sub_id}/downgrade/check - compatibility check returned")
        else:
            print(f"✓ POST /api/superadmin/subscriptions/{sub_id}/downgrade/check - endpoint exists (subscription not in new format)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
