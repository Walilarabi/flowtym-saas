#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Flowtym PMS
Tests all CRUD operations, authentication, and business logic
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class FlowtymAPITester:
    def __init__(self, base_url: str = "https://reception-suite-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.hotel_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_room_id = None
        self.created_client_id = None
        self.created_reservation_id = None

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}
                
            if not success:
                response_data["status_code"] = response.status_code
                response_data["expected_status"] = expected_status
                
            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test API health endpoint"""
        success, data = self.make_request('GET', 'health')
        self.log_result("Health Check", success, 
                       f"Status: {data.get('status', 'unknown')}" if success else str(data))
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_data = {
            "email": "jean.dupont@mashotel.fr",
            "password": "password123",
            "first_name": "Jean",
            "last_name": "Dupont",
            "role": "admin"
        }
        
        success, data = self.make_request('POST', 'auth/register', test_data)
        if success and 'token' in data:
            self.token = data['token']
            self.user_id = data['user']['id']
        
        self.log_result("User Registration", success, 
                       f"User ID: {self.user_id}" if success else str(data))
        return success

    def test_user_login(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": "jean.dupont@mashotel.fr",
            "password": "password123"
        }
        
        success, data = self.make_request('POST', 'auth/login', login_data)
        if success and 'token' in data:
            self.token = data['token']
            self.user_id = data['user']['id']
            self.hotel_id = data['user'].get('hotel_id')
        
        self.log_result("User Login", success, 
                       f"Token received, Hotel ID: {self.hotel_id}" if success else str(data))
        return success

    def test_get_current_user(self):
        """Test get current user info"""
        success, data = self.make_request('GET', 'auth/me')
        self.log_result("Get Current User", success, 
                       f"User: {data.get('first_name', '')} {data.get('last_name', '')}" if success else str(data))
        return success

    def test_hotel_creation(self):
        """Test hotel creation"""
        hotel_data = {
            "name": "Mas Provencal Aix",
            "address": "123 Rue de la Paix",
            "city": "Aix-en-Provence",
            "country": "France",
            "phone": "+33 4 42 12 34 56",
            "email": "contact@mashotel.fr",
            "stars": 4,
            "timezone": "Europe/Paris"
        }
        
        success, data = self.make_request('POST', 'hotels', hotel_data, 201)
        if success:
            self.hotel_id = data['id']
        
        self.log_result("Hotel Creation", success, 
                       f"Hotel ID: {self.hotel_id}" if success else str(data))
        return success

    def test_get_hotels(self):
        """Test get hotels list"""
        success, data = self.make_request('GET', 'hotels')
        hotel_count = len(data) if success and isinstance(data, list) else 0
        self.log_result("Get Hotels", success, 
                       f"Found {hotel_count} hotels" if success else str(data))
        return success

    def test_room_creation(self):
        """Test room creation"""
        if not self.hotel_id:
            self.log_result("Room Creation", False, "No hotel ID available")
            return False
            
        room_data = {
            "number": "101",
            "room_type": "double",
            "floor": 1,
            "max_occupancy": 2,
            "base_price": 120.0,
            "amenities": ["wifi", "tv", "minibar"],
            "status": "available"
        }
        
        success, data = self.make_request('POST', f'hotels/{self.hotel_id}/rooms', room_data, 201)
        if success:
            self.created_room_id = data['id']
        
        self.log_result("Room Creation", success, 
                       f"Room ID: {self.created_room_id}" if success else str(data))
        return success

    def test_get_rooms(self):
        """Test get rooms list"""
        if not self.hotel_id:
            self.log_result("Get Rooms", False, "No hotel ID available")
            return False
            
        success, data = self.make_request('GET', f'hotels/{self.hotel_id}/rooms')
        room_count = len(data) if success and isinstance(data, list) else 0
        self.log_result("Get Rooms", success, 
                       f"Found {room_count} rooms" if success else str(data))
        return success

    def test_client_creation(self):
        """Test client creation"""
        if not self.hotel_id:
            self.log_result("Client Creation", False, "No hotel ID available")
            return False
            
        client_data = {
            "first_name": "Marie",
            "last_name": "Martin",
            "email": "marie.martin@email.com",
            "phone": "+33 6 12 34 56 78",
            "address": "456 Avenue des Fleurs",
            "city": "Lyon",
            "country": "France",
            "language": "fr",
            "tags": ["VIP", "Regulier"]
        }
        
        success, data = self.make_request('POST', f'hotels/{self.hotel_id}/clients', client_data, 201)
        if success:
            self.created_client_id = data['id']
        
        self.log_result("Client Creation", success, 
                       f"Client ID: {self.created_client_id}" if success else str(data))
        return success

    def test_get_clients(self):
        """Test get clients list"""
        if not self.hotel_id:
            self.log_result("Get Clients", False, "No hotel ID available")
            return False
            
        success, data = self.make_request('GET', f'hotels/{self.hotel_id}/clients')
        client_count = len(data) if success and isinstance(data, list) else 0
        self.log_result("Get Clients", success, 
                       f"Found {client_count} clients" if success else str(data))
        return success

    def test_reservation_creation(self):
        """Test reservation creation"""
        if not all([self.hotel_id, self.created_client_id, self.created_room_id]):
            self.log_result("Reservation Creation", False, "Missing required IDs")
            return False
            
        tomorrow = datetime.now() + timedelta(days=1)
        day_after = tomorrow + timedelta(days=2)
        
        reservation_data = {
            "client_id": self.created_client_id,
            "room_id": self.created_room_id,
            "check_in": tomorrow.strftime("%Y-%m-%d"),
            "check_out": day_after.strftime("%Y-%m-%d"),
            "adults": 2,
            "children": 0,
            "channel": "direct",
            "rate_type": "standard",
            "room_rate": 120.0,
            "total_amount": 240.0,
            "notes": "Test reservation"
        }
        
        success, data = self.make_request('POST', f'hotels/{self.hotel_id}/reservations', reservation_data, 201)
        if success:
            self.created_reservation_id = data['id']
        
        self.log_result("Reservation Creation", success, 
                       f"Reservation ID: {self.created_reservation_id}" if success else str(data))
        return success

    def test_get_reservations(self):
        """Test get reservations list"""
        if not self.hotel_id:
            self.log_result("Get Reservations", False, "No hotel ID available")
            return False
            
        success, data = self.make_request('GET', f'hotels/{self.hotel_id}/reservations')
        reservation_count = len(data) if success and isinstance(data, list) else 0
        self.log_result("Get Reservations", success, 
                       f"Found {reservation_count} reservations" if success else str(data))
        return success

    def test_dashboard_data(self):
        """Test dashboard KPIs"""
        if not self.hotel_id:
            self.log_result("Dashboard Data", False, "No hotel ID available")
            return False
            
        success, data = self.make_request('GET', f'hotels/{self.hotel_id}/dashboard')
        kpis = ["occupancy_rate", "adr", "revpar", "total_rooms"] if success else []
        has_kpis = all(key in data for key in kpis) if success else False
        
        self.log_result("Dashboard Data", success and has_kpis, 
                       f"KPIs: {list(data.keys())}" if success else str(data))
        return success and has_kpis

    def test_planning_data(self):
        """Test planning data endpoint"""
        if not self.hotel_id:
            self.log_result("Planning Data", False, "No hotel ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        success, data = self.make_request('GET', f'hotels/{self.hotel_id}/planning?from_date={today}&to_date={future}')
        has_structure = success and 'rooms' in data and 'reservations' in data and 'daily_stats' in data
        
        self.log_result("Planning Data", has_structure, 
                       f"Structure: {list(data.keys())}" if success else str(data))
        return has_structure

    def test_arrivals_departures(self):
        """Test arrivals and departures endpoints"""
        if not self.hotel_id:
            self.log_result("Arrivals/Departures", False, "No hotel ID available")
            return False
            
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Test arrivals
        success1, arrivals = self.make_request('GET', f'hotels/{self.hotel_id}/arrivals?date={today}')
        # Test departures  
        success2, departures = self.make_request('GET', f'hotels/{self.hotel_id}/departures?date={today}')
        
        success = success1 and success2
        arrival_count = len(arrivals) if success1 and isinstance(arrivals, list) else 0
        departure_count = len(departures) if success2 and isinstance(departures, list) else 0
        
        self.log_result("Arrivals/Departures", success, 
                       f"Arrivals: {arrival_count}, Departures: {departure_count}" if success else "Failed")
        return success

    def test_night_audit(self):
        """Test night audit creation"""
        if not self.hotel_id:
            self.log_result("Night Audit", False, "No hotel ID available")
            return False
            
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        audit_data = {
            "date": yesterday,
            "notes": "Test night audit"
        }
        
        success, data = self.make_request('POST', f'hotels/{self.hotel_id}/night-audit', audit_data, 201)
        has_metrics = success and all(key in data for key in ['occupancy_rate', 'revenue', 'adr', 'revpar'])
        
        self.log_result("Night Audit", has_metrics, 
                       f"Audit ID: {data.get('id')}" if success else str(data))
        return has_metrics

    def test_reports(self):
        """Test reports endpoints"""
        if not self.hotel_id:
            self.log_result("Reports", False, "No hotel ID available")
            return False
            
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        # Test occupancy report
        success1, occ_data = self.make_request('GET', f'hotels/{self.hotel_id}/reports/occupancy?from_date={start_date}&to_date={end_date}')
        # Test revenue report
        success2, rev_data = self.make_request('GET', f'hotels/{self.hotel_id}/reports/revenue?from_date={start_date}&to_date={end_date}')
        # Test payments report
        success3, pay_data = self.make_request('GET', f'hotels/{self.hotel_id}/reports/payments?from_date={start_date}&to_date={end_date}')
        
        success = success1 and success2 and success3
        self.log_result("Reports", success, 
                       "All report endpoints working" if success else "Some reports failed")
        return success

    def test_payment_creation(self):
        """Test payment creation"""
        if not all([self.hotel_id, self.created_reservation_id]):
            self.log_result("Payment Creation", False, "Missing required IDs")
            return False
            
        payment_data = {
            "reservation_id": self.created_reservation_id,
            "amount": 100.0,
            "method": "card",
            "reference": "TEST_PAYMENT_001",
            "notes": "Test payment"
        }
        
        success, data = self.make_request('POST', f'hotels/{self.hotel_id}/payments', payment_data, 201)
        self.log_result("Payment Creation", success, 
                       f"Payment ID: {data.get('id')}" if success else str(data))
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Flowtym PMS Backend API Tests")
        print("=" * 50)
        
        # Core API tests
        self.test_health_check()
        
        # Authentication flow
        auth_success = self.test_user_registration() or self.test_user_login()
        if not auth_success:
            print("❌ Authentication failed - stopping tests")
            return self.generate_summary()
            
        self.test_get_current_user()
        
        # Hotel management
        if not self.hotel_id:
            self.test_hotel_creation()
        self.test_get_hotels()
        
        # Room management
        self.test_room_creation()
        self.test_get_rooms()
        
        # Client management
        self.test_client_creation()
        self.test_get_clients()
        
        # Reservation management
        self.test_reservation_creation()
        self.test_get_reservations()
        
        # Dashboard and planning
        self.test_dashboard_data()
        self.test_planning_data()
        self.test_arrivals_departures()
        
        # Financial operations
        self.test_payment_creation()
        
        # Reports and audit
        self.test_night_audit()
        self.test_reports()
        
        return self.generate_summary()

    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = FlowtymAPITester()
    summary = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if summary["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())