"""
Backend tests for Staff Configuration and Reporting endpoints
Tests: Departments, Shifts, Contract Templates, Roles, HR Documents, Settings, Staff Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')
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
        data = response.json()
        return data.get("token") or data.get("access_token")
    # Try alternate credentials
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test.cp@hotel.com",
        "password": "test123"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed - status {response.status_code}: {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ===================== DEPARTMENTS TESTS =====================

class TestDepartments:
    """Test Configuration - Services & Postes (Departments)"""
    
    def test_get_departments(self, api_client):
        """GET /api/hotels/{id}/config/departments returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/departments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} departments")
        
        # Verify structure if data exists
        if len(data) > 0:
            dept = data[0]
            assert "id" in dept, "Department should have id"
            assert "name" in dept, "Department should have name"
            assert "color" in dept, "Department should have color"
            print(f"First department: {dept['name']}")
    
    def test_create_department(self, api_client):
        """POST /api/hotels/{id}/config/departments creates new department"""
        new_dept = {
            "name": "TEST_Service_Spa",
            "code": "SPA",
            "color": "#10b981",
            "positions": ["Masseur", "Estheticienne"]
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/departments", json=new_dept)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == new_dept["name"], "Name should match"
        assert "id" in data, "Should return id"
        print(f"Created department: {data['name']} with id {data['id']}")
        
        # Store for cleanup
        TestDepartments.created_dept_id = data["id"]
    
    def test_delete_department(self, api_client):
        """DELETE /api/hotels/{id}/config/departments/{id} removes department"""
        if not hasattr(TestDepartments, 'created_dept_id'):
            pytest.skip("No department to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/departments/{TestDepartments.created_dept_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Deleted department: {TestDepartments.created_dept_id}")


# ===================== SHIFTS TESTS =====================

class TestShifts:
    """Test Configuration - Horaires & Shifts"""
    
    def test_get_shifts(self, api_client):
        """GET /api/hotels/{id}/config/shifts returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/shifts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} shift templates")
        
        if len(data) > 0:
            shift = data[0]
            assert "id" in shift, "Shift should have id"
            assert "name" in shift, "Shift should have name"
            assert "start_time" in shift, "Shift should have start_time"
            assert "end_time" in shift, "Shift should have end_time"
            assert "duration_hours" in shift, "Shift should have duration_hours"
            print(f"First shift: {shift['name']} ({shift['start_time']} - {shift['end_time']})")
    
    def test_create_shift(self, api_client):
        """POST /api/hotels/{id}/config/shifts creates new shift"""
        new_shift = {
            "name": "TEST_Shift_Coupure",
            "code": "COU",
            "start_time": "10:00",
            "end_time": "14:00",
            "duration_hours": 4,
            "break_minutes": 0,
            "overtime_rate": 0,
            "color": "#f43f5e"
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/shifts", json=new_shift)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == new_shift["name"], "Name should match"
        assert data["code"] == new_shift["code"], "Code should match"
        print(f"Created shift: {data['name']} with id {data['id']}")
        
        TestShifts.created_shift_id = data["id"]
    
    def test_delete_shift(self, api_client):
        """DELETE /api/hotels/{id}/config/shifts/{id} removes shift"""
        if not hasattr(TestShifts, 'created_shift_id'):
            pytest.skip("No shift to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/shifts/{TestShifts.created_shift_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Deleted shift: {TestShifts.created_shift_id}")


# ===================== CONTRACT TEMPLATES TESTS =====================

class TestContractTemplates:
    """Test Configuration - Contrats (Modeles)"""
    
    def test_get_contract_templates(self, api_client):
        """GET /api/hotels/{id}/config/contract-templates returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/contract-templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} contract templates")
        
        if len(data) > 0:
            template = data[0]
            assert "id" in template, "Template should have id"
            assert "name" in template, "Template should have name"
            assert "contract_type" in template, "Template should have contract_type"
            assert "status" in template, "Template should have status"
            print(f"First template: {template['name']} ({template['contract_type']}) - {template['status']}")


# ===================== ROLES TESTS =====================

class TestRoles:
    """Test Configuration - Utilisateurs & Roles"""
    
    def test_get_roles(self, api_client):
        """GET /api/hotels/{id}/config/roles returns list with permissions"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/roles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} roles")
        
        if len(data) > 0:
            role = data[0]
            assert "id" in role, "Role should have id"
            assert "name" in role, "Role should have name"
            assert "permissions" in role, "Role should have permissions"
            assert isinstance(role["permissions"], dict), "Permissions should be a dict"
            print(f"First role: {role['name']} with {len(role['permissions'])} permissions")
            
            # Check for expected permissions
            expected_perms = ["voir_planning", "modifier_planning", "voir_personnel"]
            for perm in expected_perms:
                assert perm in role["permissions"], f"Permission {perm} should exist"


# ===================== HR DOCUMENTS TESTS =====================

class TestHRDocuments:
    """Test Configuration - Documents RH"""
    
    def test_get_hr_documents(self, api_client):
        """GET /api/hotels/{id}/config/hr-documents returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/hr-documents")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} HR document types")
        
        if len(data) > 0:
            doc = data[0]
            assert "id" in doc, "Document should have id"
            assert "name" in doc, "Document should have name"
            assert "is_mandatory" in doc, "Document should have is_mandatory"
            print(f"First document: {doc['name']} (mandatory: {doc['is_mandatory']})")
    
    def test_create_hr_document(self, api_client):
        """POST /api/hotels/{id}/config/hr-documents creates new document type"""
        new_doc = {
            "name": "TEST_Permis_Conduire",
            "is_mandatory": False,
            "requires_ocr": False
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/hr-documents", json=new_doc)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == new_doc["name"], "Name should match"
        print(f"Created HR document: {data['name']} with id {data['id']}")
        
        TestHRDocuments.created_doc_id = data["id"]
    
    def test_delete_hr_document(self, api_client):
        """DELETE /api/hotels/{id}/config/hr-documents/{id} removes document type"""
        if not hasattr(TestHRDocuments, 'created_doc_id'):
            pytest.skip("No document to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/hr-documents/{TestHRDocuments.created_doc_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Deleted HR document: {TestHRDocuments.created_doc_id}")


# ===================== SETTINGS TESTS =====================

class TestSettings:
    """Test Configuration - Parametres Staff"""
    
    def test_get_settings(self, api_client):
        """GET /api/hotels/{id}/config/settings returns settings object"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        
        # Check expected fields
        expected_fields = [
            "notifications_enabled", "auto_reporting_enabled", 
            "docusign_enabled", "auto_payroll_export",
            "cp_rollover_date", "cp_allow_early_use"
        ]
        for field in expected_fields:
            assert field in data, f"Settings should have {field}"
        
        print(f"Settings: notifications={data['notifications_enabled']}, auto_reporting={data['auto_reporting_enabled']}")
    
    def test_update_settings(self, api_client):
        """PUT /api/hotels/{id}/config/settings updates settings"""
        # First get current settings
        get_response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/settings")
        current = get_response.json()
        
        # Toggle a setting
        new_settings = {
            "logo_url": current.get("logo_url"),
            "reporting_emails": current.get("reporting_emails", []),
            "notifications_enabled": not current.get("notifications_enabled", True),
            "auto_reporting_enabled": current.get("auto_reporting_enabled", False),
            "docusign_enabled": current.get("docusign_enabled", False),
            "auto_payroll_export": current.get("auto_payroll_export", False),
            "cp_rollover_date": current.get("cp_rollover_date", "06-01"),
            "cp_allow_early_use": current.get("cp_allow_early_use", True)
        }
        
        response = api_client.put(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/settings", json=new_settings)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["notifications_enabled"] == new_settings["notifications_enabled"], "Setting should be updated"
        print(f"Updated settings: notifications_enabled={data['notifications_enabled']}")
        
        # Restore original setting
        new_settings["notifications_enabled"] = current.get("notifications_enabled", True)
        api_client.put(f"{BASE_URL}/api/hotels/{HOTEL_ID}/config/settings", json=new_settings)


# ===================== REPORTING TESTS =====================

class TestReporting:
    """Test Reporting - Staff Analytics"""
    
    def test_get_staff_analytics(self, api_client):
        """GET /api/hotels/{id}/reporting/staff-analytics returns analytics data"""
        import datetime
        current_month = datetime.datetime.now().month
        current_year = datetime.datetime.now().year
        
        response = api_client.get(
            f"{BASE_URL}/api/hotels/{HOTEL_ID}/reporting/staff-analytics",
            params={"month": current_month, "year": current_year}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        
        # Check structure
        assert "period" in data, "Should have period"
        assert "summary" in data, "Should have summary"
        assert "employees" in data, "Should have employees"
        assert "hours_by_service" in data, "Should have hours_by_service"
        
        # Check period
        assert data["period"]["month"] == current_month
        assert data["period"]["year"] == current_year
        
        # Check summary structure
        summary = data["summary"]
        assert "active_employees" in summary, "Summary should have active_employees"
        assert "total_hours" in summary, "Summary should have total_hours"
        assert "total_overtime" in summary, "Summary should have total_overtime"
        assert "total_sick_days" in summary, "Summary should have total_sick_days"
        
        print(f"Analytics for {current_month}/{current_year}:")
        print(f"  Active employees: {summary['active_employees']}")
        print(f"  Total hours: {summary['total_hours']}")
        print(f"  Total overtime: {summary['total_overtime']}")
        print(f"  Employees in report: {len(data['employees'])}")
        print(f"  Services: {len(data['hours_by_service'])}")
    
    def test_get_staff_analytics_previous_month(self, api_client):
        """GET /api/hotels/{id}/reporting/staff-analytics for previous month"""
        import datetime
        now = datetime.datetime.now()
        if now.month == 1:
            prev_month = 12
            prev_year = now.year - 1
        else:
            prev_month = now.month - 1
            prev_year = now.year
        
        response = api_client.get(
            f"{BASE_URL}/api/hotels/{HOTEL_ID}/reporting/staff-analytics",
            params={"month": prev_month, "year": prev_year}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["month"] == prev_month
        assert data["period"]["year"] == prev_year
        print(f"Previous month analytics ({prev_month}/{prev_year}): {data['summary']['active_employees']} employees")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
