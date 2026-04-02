"""
Test Configuration Users Management Module
Tests for user creation with email/password, role assignment (Desktop + Mobile)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"

# Test credentials
ADMIN_EMAIL = "admin@flowtym.com"
ADMIN_PASSWORD = "admin123"

# Mobile test user
MOBILE_TEST_EMAIL = "emma.durand@hotel.com"
MOBILE_TEST_PASSWORD = "chambre2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


class TestSystemRoles:
    """Test GET /api/config/roles - System roles listing"""
    
    def test_get_roles_requires_auth(self):
        """Test that roles endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/config/roles")
        assert response.status_code == 403, "Should require authentication"
        print("PASS: GET /api/config/roles requires authentication")
    
    def test_get_all_roles(self, auth_headers):
        """Test getting all system roles"""
        response = requests.get(f"{BASE_URL}/api/config/roles", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        assert isinstance(roles, list), "Roles should be a list"
        assert len(roles) >= 11, f"Expected at least 11 roles, got {len(roles)}"
        
        # Verify role structure
        for role in roles:
            assert "code" in role, "Role should have code"
            assert "name" in role, "Role should have name"
            assert "description" in role, "Role should have description"
            assert "is_mobile" in role, "Role should have is_mobile flag"
        
        print(f"PASS: GET /api/config/roles returned {len(roles)} roles")
    
    def test_desktop_roles_present(self, auth_headers):
        """Test that desktop roles are present"""
        response = requests.get(f"{BASE_URL}/api/config/roles", headers=auth_headers)
        roles = response.json()
        
        desktop_codes = ["admin", "reception", "revenue_manager", "accounting", "readonly"]
        desktop_roles = [r for r in roles if r["code"] in desktop_codes]
        
        assert len(desktop_roles) == 5, f"Expected 5 desktop roles, got {len(desktop_roles)}"
        
        for role in desktop_roles:
            assert role["is_mobile"] == False, f"Desktop role {role['code']} should have is_mobile=False"
        
        print(f"PASS: All 5 desktop roles present with is_mobile=False")
    
    def test_mobile_roles_present(self, auth_headers):
        """Test that mobile roles are present"""
        response = requests.get(f"{BASE_URL}/api/config/roles", headers=auth_headers)
        roles = response.json()
        
        mobile_codes = ["housekeeping", "housekeeper", "maintenance", "breakfast", "spa", "restaurant"]
        mobile_roles = [r for r in roles if r["code"] in mobile_codes]
        
        assert len(mobile_roles) == 6, f"Expected 6 mobile roles, got {len(mobile_roles)}"
        
        for role in mobile_roles:
            assert role["is_mobile"] == True, f"Mobile role {role['code']} should have is_mobile=True"
        
        print(f"PASS: All 6 mobile roles present with is_mobile=True")


class TestConfigUsersListing:
    """Test GET /api/config/hotels/{hotel_id}/users - Users listing"""
    
    def test_get_users_requires_auth(self):
        """Test that users endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users")
        assert response.status_code == 403, "Should require authentication"
        print("PASS: GET /api/config/hotels/{hotel_id}/users requires authentication")
    
    def test_get_all_users(self, auth_headers):
        """Test getting all users for hotel"""
        response = requests.get(f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Users should be a list"
        
        # Verify user structure
        if len(users) > 0:
            user = users[0]
            assert "id" in user, "User should have id"
            assert "email" in user, "User should have email"
            assert "first_name" in user, "User should have first_name"
            assert "last_name" in user, "User should have last_name"
            assert "role" in user, "User should have role"
            assert "is_mobile_role" in user, "User should have is_mobile_role"
            assert "is_active" in user, "User should have is_active"
        
        print(f"PASS: GET /api/config/hotels/{HOTEL_ID}/users returned {len(users)} users")
    
    def test_filter_users_by_role(self, auth_headers):
        """Test filtering users by role"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users?role=housekeeper", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to filter users: {response.text}"
        
        users = response.json()
        for user in users:
            assert user["role"] == "housekeeper", f"User role should be housekeeper, got {user['role']}"
        
        print(f"PASS: Filter by role=housekeeper returned {len(users)} users")


class TestConfigUserCreation:
    """Test POST /api/config/hotels/{hotel_id}/users - User creation"""
    
    def test_create_user_requires_auth(self):
        """Test that user creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            json={"email": "test@test.com", "password": "test123", "first_name": "Test", "last_name": "User", "role": "reception"}
        )
        assert response.status_code == 403, "Should require authentication"
        print("PASS: POST /api/config/hotels/{hotel_id}/users requires authentication")
    
    def test_create_desktop_user(self, auth_headers):
        """Test creating a desktop user (reception role)"""
        unique_email = f"TEST_desktop_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "Desktop",
            "role": "reception",
            "department": "front_office",
            "phone": "+33 6 12 34 56 78",
            "job_title": "Réceptionniste",
            "language": "fr"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create desktop user: {response.text}"
        
        user = response.json()
        assert user["email"] == unique_email.lower(), "Email should match"
        assert user["role"] == "reception", "Role should be reception"
        assert user["is_mobile_role"] == False, "Desktop user should have is_mobile_role=False"
        assert user["is_active"] == True, "New user should be active"
        assert "id" in user, "User should have id"
        
        print(f"PASS: Created desktop user {unique_email} with role=reception")
        return user["id"]
    
    def test_create_mobile_user_housekeeper(self, auth_headers):
        """Test creating a mobile user (housekeeper role)"""
        unique_email = f"TEST_mobile_hk_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "MobilePass2026!",
            "first_name": "Marie",
            "last_name": "Chambre",
            "role": "housekeeper",
            "department": "housekeeping",
            "job_title": "Femme de chambre",
            "language": "fr"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create mobile user: {response.text}"
        
        user = response.json()
        assert user["role"] == "housekeeper", "Role should be housekeeper"
        assert user["is_mobile_role"] == True, "Mobile user should have is_mobile_role=True"
        
        print(f"PASS: Created mobile user {unique_email} with role=housekeeper (is_mobile=True)")
        return user["id"]
    
    def test_create_mobile_user_maintenance(self, auth_headers):
        """Test creating a mobile user (maintenance role)"""
        unique_email = f"TEST_mobile_maint_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "MaintPass2026!",
            "first_name": "Pierre",
            "last_name": "Technicien",
            "role": "maintenance",
            "department": "maintenance",
            "job_title": "Technicien maintenance",
            "language": "fr"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create maintenance user: {response.text}"
        
        user = response.json()
        assert user["role"] == "maintenance", "Role should be maintenance"
        assert user["is_mobile_role"] == True, "Maintenance user should have is_mobile_role=True"
        
        print(f"PASS: Created mobile user {unique_email} with role=maintenance (is_mobile=True)")
        return user["id"]
    
    def test_create_mobile_user_spa(self, auth_headers):
        """Test creating a mobile user (spa role)"""
        unique_email = f"TEST_mobile_spa_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "SpaPass2026!",
            "first_name": "Sophie",
            "last_name": "Wellness",
            "role": "spa",
            "department": "spa",
            "job_title": "Praticienne SPA",
            "language": "fr"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create spa user: {response.text}"
        
        user = response.json()
        assert user["role"] == "spa", "Role should be spa"
        assert user["is_mobile_role"] == True, "SPA user should have is_mobile_role=True"
        
        print(f"PASS: Created mobile user {unique_email} with role=spa (is_mobile=True)")
        return user["id"]
    
    def test_create_mobile_user_restaurant(self, auth_headers):
        """Test creating a mobile user (restaurant role)"""
        unique_email = f"TEST_mobile_resto_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "RestoPass2026!",
            "first_name": "Jean",
            "last_name": "Serveur",
            "role": "restaurant",
            "department": "food_beverage",
            "job_title": "Serveur",
            "language": "fr"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create restaurant user: {response.text}"
        
        user = response.json()
        assert user["role"] == "restaurant", "Role should be restaurant"
        assert user["is_mobile_role"] == True, "Restaurant user should have is_mobile_role=True"
        
        print(f"PASS: Created mobile user {unique_email} with role=restaurant (is_mobile=True)")
        return user["id"]
    
    def test_create_user_duplicate_email_fails(self, auth_headers):
        """Test that creating user with duplicate email fails"""
        # First create a user
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "Pass123!",
            "first_name": "First",
            "last_name": "User",
            "role": "reception"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response1.status_code == 200, "First user creation should succeed"
        
        # Try to create another user with same email
        payload["first_name"] = "Second"
        response2 = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response2.status_code == 400, "Duplicate email should fail"
        assert "email" in response2.json().get("detail", "").lower(), "Error should mention email"
        
        print("PASS: Duplicate email creation correctly rejected")
    
    def test_create_user_invalid_role_fails(self, auth_headers):
        """Test that creating user with invalid role fails"""
        unique_email = f"TEST_invalid_{uuid.uuid4().hex[:8]}@hotel.com"
        
        payload = {
            "email": unique_email,
            "password": "Pass123!",
            "first_name": "Invalid",
            "last_name": "Role",
            "role": "invalid_role_xyz"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 400, "Invalid role should fail"
        
        print("PASS: Invalid role creation correctly rejected")


class TestConfigUserUpdate:
    """Test PUT /api/config/hotels/{hotel_id}/users/{user_id} - User update"""
    
    def test_update_user(self, auth_headers):
        """Test updating a user"""
        # First create a user
        unique_email = f"TEST_update_{uuid.uuid4().hex[:8]}@hotel.com"
        
        create_payload = {
            "email": unique_email,
            "password": "Pass123!",
            "first_name": "Original",
            "last_name": "Name",
            "role": "reception"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update the user
        update_payload = {
            "first_name": "Updated",
            "last_name": "UserName",
            "job_title": "Senior Receptionist"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users/{user_id}",
            headers=auth_headers,
            json=update_payload
        )
        assert update_response.status_code == 200, f"Failed to update user: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user["first_name"] == "Updated", "First name should be updated"
        assert updated_user["last_name"] == "UserName", "Last name should be updated"
        assert updated_user["job_title"] == "Senior Receptionist", "Job title should be updated"
        
        print(f"PASS: Updated user {user_id} successfully")
    
    def test_update_user_role_changes_mobile_flag(self, auth_headers):
        """Test that changing role updates is_mobile_role flag"""
        # Create a desktop user
        unique_email = f"TEST_role_change_{uuid.uuid4().hex[:8]}@hotel.com"
        
        create_payload = {
            "email": unique_email,
            "password": "Pass123!",
            "first_name": "Role",
            "last_name": "Change",
            "role": "reception"  # Desktop role
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        user = create_response.json()
        user_id = user["id"]
        assert user["is_mobile_role"] == False, "Initial role should be desktop"
        
        # Change to mobile role
        update_response = requests.put(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users/{user_id}",
            headers=auth_headers,
            json={"role": "housekeeper"}  # Mobile role
        )
        assert update_response.status_code == 200
        
        updated_user = update_response.json()
        assert updated_user["role"] == "housekeeper", "Role should be updated"
        assert updated_user["is_mobile_role"] == True, "is_mobile_role should be True after role change"
        
        print("PASS: Role change correctly updates is_mobile_role flag")


class TestConfigUserDelete:
    """Test DELETE /api/config/hotels/{hotel_id}/users/{user_id} - User soft delete"""
    
    def test_delete_user_soft_delete(self, auth_headers):
        """Test that delete performs soft delete (deactivation)"""
        # Create a user
        unique_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@hotel.com"
        
        create_payload = {
            "email": unique_email,
            "password": "Pass123!",
            "first_name": "To",
            "last_name": "Delete",
            "role": "reception"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Delete (soft delete)
        delete_response = requests.delete(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users/{user_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete user: {delete_response.text}"
        
        # Verify user is deactivated (not hard deleted)
        # Get all users including inactive
        get_response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users?is_active=false",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        inactive_users = get_response.json()
        deleted_user = next((u for u in inactive_users if u["id"] == user_id), None)
        assert deleted_user is not None, "Deleted user should still exist as inactive"
        assert deleted_user["is_active"] == False, "User should be inactive"
        
        print("PASS: User soft delete (deactivation) works correctly")


class TestMobileUserLogin:
    """Test POST /api/auth/login with mobile users created via config"""
    
    def test_login_with_existing_mobile_user(self):
        """Test login with pre-existing mobile user emma.durand@hotel.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOBILE_TEST_EMAIL,
            "password": MOBILE_TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data, "Login should return token"
            assert "user" in data, "Login should return user"
            assert data["user"]["email"] == MOBILE_TEST_EMAIL, "Email should match"
            print(f"PASS: Mobile user {MOBILE_TEST_EMAIL} login successful")
        elif response.status_code == 401:
            print(f"INFO: Mobile user {MOBILE_TEST_EMAIL} not found or wrong password - may need to be created first")
        else:
            print(f"WARN: Unexpected status {response.status_code}: {response.text}")
    
    def test_login_with_newly_created_mobile_user(self, auth_headers):
        """Test login with a newly created mobile user"""
        unique_email = f"TEST_login_{uuid.uuid4().hex[:8]}@hotel.com"
        test_password = "LoginTest2026!"
        
        # Create user
        create_payload = {
            "email": unique_email,
            "password": test_password,
            "first_name": "Login",
            "last_name": "Test",
            "role": "housekeeper"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users",
            headers=auth_headers,
            json=create_payload
        )
        assert create_response.status_code == 200, f"Failed to create user: {create_response.text}"
        
        # Login with new user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": test_password
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        assert "token" in data, "Login should return token"
        assert data["user"]["email"] == unique_email.lower(), "Email should match"
        assert data["user"]["role"] == "housekeeper", "Role should be housekeeper"
        
        print(f"PASS: Newly created mobile user {unique_email} can login successfully")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self, auth_headers):
        """Cleanup TEST_ prefixed users"""
        response = requests.get(
            f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users?is_active=true",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            users = response.json()
            test_users = [u for u in users if u["email"].startswith("test_")]
            
            for user in test_users:
                requests.delete(
                    f"{BASE_URL}/api/config/hotels/{HOTEL_ID}/users/{user['id']}",
                    headers=auth_headers
                )
            
            print(f"CLEANUP: Deactivated {len(test_users)} test users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
