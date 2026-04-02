"""
Housekeeping Module - Backend API Tests
Tests for all housekeeping endpoints: stats, tasks, staff, inspections, maintenance, breakfast
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"

# Test credentials
TEST_EMAIL = "admin@flowtym.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module", autouse=True)
def seed_demo_data(headers):
    """Seed demo data before running tests"""
    response = requests.post(
        f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/seed",
        headers=headers
    )
    # Don't fail if already seeded
    return response


class TestHousekeepingStats:
    """Tests for GET /api/housekeeping/hotels/{id}/stats"""
    
    def test_get_stats_returns_200(self, headers):
        """Stats endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_stats_structure(self, headers):
        """Stats response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/stats",
            headers=headers
        )
        data = response.json()
        
        # Check required fields
        required_fields = [
            "total_rooms", "rooms_to_clean", "rooms_in_progress", "rooms_done",
            "rooms_validated", "rooms_refused", "departures", "stayovers",
            "out_of_service", "staff_active", "avg_cleaning_time", "completion_rate"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_get_stats_values_are_numeric(self, headers):
        """Stats values are numeric"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/stats",
            headers=headers
        )
        data = response.json()
        
        assert isinstance(data["total_rooms"], int)
        assert isinstance(data["completion_rate"], (int, float))
        assert isinstance(data["avg_cleaning_time"], (int, float))


class TestHousekeepingTasks:
    """Tests for GET /api/housekeeping/hotels/{id}/tasks"""
    
    def test_get_tasks_returns_200(self, headers):
        """Tasks endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_tasks_returns_list(self, headers):
        """Tasks endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks",
            headers=headers
        )
        data = response.json()
        assert isinstance(data, list), "Expected list of tasks"
    
    def test_get_tasks_structure(self, headers):
        """Task objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks",
            headers=headers
        )
        data = response.json()
        
        if len(data) > 0:
            task = data[0]
            required_fields = ["id", "hotel_id", "room_number", "status", "cleaning_type"]
            for field in required_fields:
                assert field in task, f"Missing field in task: {field}"
    
    def test_get_tasks_with_status_filter(self, headers):
        """Tasks can be filtered by status"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks?status=pending",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # All returned tasks should have pending status
        for task in data:
            assert task["status"] == "pending", f"Expected pending status, got {task['status']}"


class TestHousekeepingStaff:
    """Tests for GET /api/housekeeping/hotels/{id}/staff"""
    
    def test_get_staff_returns_200(self, headers):
        """Staff endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/staff",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_staff_returns_list(self, headers):
        """Staff endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/staff",
            headers=headers
        )
        data = response.json()
        assert isinstance(data, list), "Expected list of staff"
    
    def test_get_staff_structure(self, headers):
        """Staff objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/staff",
            headers=headers
        )
        data = response.json()
        
        if len(data) > 0:
            staff = data[0]
            required_fields = ["id", "hotel_id", "first_name", "last_name", "role", "status"]
            for field in required_fields:
                assert field in staff, f"Missing field in staff: {field}"
    
    def test_get_staff_with_role_filter(self, headers):
        """Staff can be filtered by role"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/staff?role=femme_de_chambre",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # All returned staff should have femme_de_chambre role
        for staff in data:
            assert staff["role"] == "femme_de_chambre", f"Expected femme_de_chambre role, got {staff['role']}"


class TestHousekeepingInspections:
    """Tests for GET /api/housekeeping/hotels/{id}/inspections"""
    
    def test_get_inspections_returns_200(self, headers):
        """Inspections endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_inspections_returns_list(self, headers):
        """Inspections endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections",
            headers=headers
        )
        data = response.json()
        assert isinstance(data, list), "Expected list of inspections"
    
    def test_get_inspections_structure(self, headers):
        """Inspection objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections",
            headers=headers
        )
        data = response.json()
        
        if len(data) > 0:
            inspection = data[0]
            required_fields = ["id", "hotel_id", "room_number", "status", "cleaned_by_name"]
            for field in required_fields:
                assert field in inspection, f"Missing field in inspection: {field}"


class TestHousekeepingMaintenance:
    """Tests for GET /api/housekeeping/hotels/{id}/maintenance"""
    
    def test_get_maintenance_returns_200(self, headers):
        """Maintenance endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/maintenance",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_maintenance_returns_list(self, headers):
        """Maintenance endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/maintenance",
            headers=headers
        )
        data = response.json()
        assert isinstance(data, list), "Expected list of maintenance tickets"
    
    def test_get_maintenance_structure(self, headers):
        """Maintenance ticket objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/maintenance",
            headers=headers
        )
        data = response.json()
        
        if len(data) > 0:
            ticket = data[0]
            required_fields = ["id", "hotel_id", "room_number", "title", "status", "priority"]
            for field in required_fields:
                assert field in ticket, f"Missing field in maintenance ticket: {field}"


class TestHousekeepingBreakfast:
    """Tests for GET /api/housekeeping/hotels/{id}/breakfast"""
    
    def test_get_breakfast_returns_200(self, headers):
        """Breakfast endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/breakfast",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_breakfast_returns_list(self, headers):
        """Breakfast endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/breakfast",
            headers=headers
        )
        data = response.json()
        assert isinstance(data, list), "Expected list of breakfast orders"
    
    def test_get_breakfast_structure(self, headers):
        """Breakfast order objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/breakfast",
            headers=headers
        )
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            required_fields = ["id", "hotel_id", "room_number", "guest_name", "status", "formule"]
            for field in required_fields:
                assert field in order, f"Missing field in breakfast order: {field}"


class TestTaskWorkflow:
    """Tests for task start/complete workflow"""
    
    def test_start_task(self, headers):
        """Can start a pending task"""
        # First get a pending task
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks?status=pending",
            headers=headers
        )
        tasks = response.json()
        
        if len(tasks) == 0:
            pytest.skip("No pending tasks to test")
        
        task_id = tasks[0]["id"]
        
        # Start the task
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks/{task_id}/start",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "started_at" in data
    
    def test_complete_task(self, headers):
        """Can complete an in-progress task"""
        # First get an in-progress task
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks?status=in_progress",
            headers=headers
        )
        tasks = response.json()
        
        if len(tasks) == 0:
            pytest.skip("No in-progress tasks to test")
        
        task_id = tasks[0]["id"]
        
        # Complete the task
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks/{task_id}/complete",
            json={"task_id": task_id, "photos_after": [], "notes": "Test completion"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "completed_at" in data
        assert "inspection_id" in data  # Should create an inspection


class TestInspectionValidation:
    """Tests for inspection validation workflow"""
    
    def test_validate_inspection_approve(self, headers):
        """Can approve an inspection"""
        # First get a pending inspection
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections?status=en_attente",
            headers=headers
        )
        inspections = response.json()
        
        if len(inspections) == 0:
            pytest.skip("No pending inspections to test")
        
        inspection_id = inspections[0]["id"]
        
        # Validate the inspection
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections/{inspection_id}/validate",
            json={
                "inspection_id": inspection_id,
                "approved": True,
                "rating": 5,
                "notes": "Test validation"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "valide"
    
    def test_validate_inspection_refuse(self, headers):
        """Can refuse an inspection"""
        # First get a pending inspection
        response = requests.get(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections?status=en_attente",
            headers=headers
        )
        inspections = response.json()
        
        if len(inspections) == 0:
            pytest.skip("No pending inspections to test")
        
        inspection_id = inspections[0]["id"]
        
        # Refuse the inspection
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections/{inspection_id}/validate",
            json={
                "inspection_id": inspection_id,
                "approved": False,
                "rating": 2,
                "notes": "Test refusal",
                "refused_reason": "Salle de bain pas nettoyée"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "refuse"


class TestErrorHandling:
    """Tests for error handling"""
    
    def test_start_nonexistent_task(self, headers):
        """Starting a non-existent task returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks/nonexistent-id/start",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_complete_nonexistent_task(self, headers):
        """Completing a non-existent task returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/tasks/nonexistent-id/complete",
            json={"task_id": "nonexistent-id", "photos_after": []},
            headers=headers
        )
        assert response.status_code == 404
    
    def test_validate_nonexistent_inspection(self, headers):
        """Validating a non-existent inspection returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/housekeeping/hotels/{HOTEL_ID}/inspections/nonexistent-id/validate",
            json={"inspection_id": "nonexistent-id", "approved": True},
            headers=headers
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
