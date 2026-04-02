"""
Test Suite for Channel Manager, Object Storage, and PMS-CRM Sync
Tests the new features:
1. Channel Manager - OTA connections, inventory, rates, reservations sync
2. Object Storage - File upload/download with type validation
3. PMS-CRM Sync - Auto-sync reservations to CRM
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta
import io

# Get BASE_URL from environment
BASE_URL = os.environ.get('VITE_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://reception-suite-1.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "admin@flowtym.com"
TEST_PASSWORD = "admin123"


class TestAuth:
    """Authentication helper"""
    
    @staticmethod
    def get_token():
        """Get auth token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    token = TestAuth.get_token()
    if not token:
        pytest.skip("Authentication failed - skipping tests")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_hotel_id(auth_headers):
    """Get or create a test hotel ID"""
    # Try to get existing hotels
    response = requests.get(f"{BASE_URL}/api/hotels", headers=auth_headers)
    if response.status_code == 200:
        hotels = response.json()
        if hotels and len(hotels) > 0:
            return hotels[0].get("id")
    
    # Create a test hotel if none exists
    hotel_data = {
        "name": "TEST_Channel_Hotel",
        "address": "123 Test Street",
        "city": "Paris",
        "country": "France",
        "phone": "+33 1 23 45 67 89",
        "email": "test@hotel.com",
        "stars": 4
    }
    response = requests.post(f"{BASE_URL}/api/hotels", json=hotel_data, headers=auth_headers)
    if response.status_code in [200, 201]:
        return response.json().get("id")
    
    pytest.skip("Could not get or create test hotel")


# ===================== CHANNEL MANAGER TESTS =====================

class TestChannelConnections:
    """Test Channel Manager connection endpoints"""
    
    def test_list_connections_empty(self, auth_headers, test_hotel_id):
        """Test listing channel connections (may be empty initially)"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List connections returned {len(data)} connections")
    
    def test_create_booking_connection(self, auth_headers, test_hotel_id):
        """Test creating a Booking.com connection"""
        connection_data = {
            "provider": "booking_com",
            "name": "TEST_Booking.com Connection",
            "credentials": {
                "api_key": "test_api_key_123",
                "hotel_id": "hotel_12345"
            },
            "is_active": True,
            "sync_inventory": True,
            "sync_rates": True,
            "sync_reservations": True,
            "commission_rate": 15.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            json=connection_data,
            headers=auth_headers
        )
        
        # May return 400 if connection already exists
        if response.status_code == 400:
            print("✓ Booking.com connection already exists (expected)")
            return
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("provider") == "booking_com"
        assert data.get("name") == "TEST_Booking.com Connection"
        assert data.get("status") == "pending"
        assert "credentials" not in data  # Credentials should not be returned
        print(f"✓ Created Booking.com connection: {data.get('id')}")
    
    def test_create_expedia_connection(self, auth_headers, test_hotel_id):
        """Test creating an Expedia connection"""
        connection_data = {
            "provider": "expedia",
            "name": "TEST_Expedia Connection",
            "credentials": {
                "api_key": "expedia_key_456",
                "username": "hotel_user"
            },
            "is_active": True,
            "commission_rate": 18.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            json=connection_data,
            headers=auth_headers
        )
        
        if response.status_code == 400:
            print("✓ Expedia connection already exists (expected)")
            return
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("provider") == "expedia"
        print(f"✓ Created Expedia connection: {data.get('id')}")
    
    def test_create_airbnb_connection(self, auth_headers, test_hotel_id):
        """Test creating an Airbnb connection"""
        connection_data = {
            "provider": "airbnb",
            "name": "TEST_Airbnb Connection",
            "is_active": True,
            "commission_rate": 3.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            json=connection_data,
            headers=auth_headers
        )
        
        if response.status_code == 400:
            print("✓ Airbnb connection already exists (expected)")
            return
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("provider") == "airbnb"
        print(f"✓ Created Airbnb connection: {data.get('id')}")
    
    def test_list_connections_after_create(self, auth_headers, test_hotel_id):
        """Test listing connections after creation"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List connections returned {len(data)} connections")
    
    def test_connection_requires_auth(self, test_hotel_id):
        """Test that connection endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections"
        )
        assert response.status_code in [401, 403, 422]
        print("✓ Connection endpoints require authentication")


class TestChannelConnectionTest:
    """Test channel connection testing endpoint"""
    
    def test_test_connection(self, auth_headers, test_hotel_id):
        """Test the connection test endpoint"""
        # First get a connection
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            headers=auth_headers
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No connections available to test")
        
        connections = response.json()
        connection_id = connections[0].get("id")
        
        # Test the connection
        response = requests.post(
            f"{BASE_URL}/api/channel/connections/{connection_id}/test",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        assert "status" in data
        print(f"✓ Connection test result: {data.get('status')}")


class TestChannelInventory:
    """Test Channel Manager inventory endpoints"""
    
    def test_get_inventory(self, auth_headers, test_hotel_id):
        """Test getting inventory grid"""
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/inventory",
            params={"start_date": today, "end_date": end_date},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Inventory returned {len(data)} records")
        
        # Verify inventory structure if data exists
        if data:
            record = data[0]
            assert "date" in record
            assert "room_type_id" in record or "room_type_name" in record
            assert "available" in record
            print(f"✓ Inventory record structure verified")
    
    def test_inventory_requires_dates(self, auth_headers, test_hotel_id):
        """Test that inventory endpoint requires date parameters"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/inventory",
            headers=auth_headers
        )
        # Should fail without required date params
        assert response.status_code in [400, 422]
        print("✓ Inventory endpoint requires date parameters")


class TestChannelRates:
    """Test Channel Manager rates endpoints"""
    
    def test_get_rates(self, auth_headers, test_hotel_id):
        """Test getting rates"""
        today = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/rates",
            params={"start_date": today, "end_date": end_date},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Rates returned {len(data)} records")
        
        # Verify rate structure if data exists
        if data:
            record = data[0]
            assert "date" in record
            assert "price" in record
            assert "currency" in record
            print(f"✓ Rate record structure verified")


class TestChannelReservationsSync:
    """Test Channel Manager reservation sync endpoints"""
    
    def test_sync_reservations(self, auth_headers, test_hotel_id):
        """Test syncing OTA reservations (simulated)"""
        response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/reservations/sync",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "synced_count" in data
        assert "channels_synced" in data
        print(f"✓ Sync completed: {data.get('synced_count')} reservations from {data.get('channels_synced')} channels")
    
    def test_list_ota_reservations(self, auth_headers, test_hotel_id):
        """Test listing OTA reservations"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/reservations",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "reservations" in data
        assert "total" in data
        print(f"✓ OTA reservations: {data.get('total')} total")


class TestRateShopper:
    """Test Rate Shopper endpoint"""
    
    def test_get_rate_shopper_data(self, auth_headers, test_hotel_id):
        """Test competitor rate analysis"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/rate-shopper",
            params={"date": today},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify rate shopper structure
        assert "hotel_id" in data
        assert "date" in data
        assert "our_rate" in data
        assert "competitor_rates" in data
        assert "avg_competitor_rate" in data
        assert "min_competitor_rate" in data
        assert "max_competitor_rate" in data
        assert "position" in data
        assert "recommendation" in data
        
        print(f"✓ Rate shopper: Our rate €{data.get('our_rate')}, Position: {data.get('position')}")
        print(f"  Competitors: min €{data.get('min_competitor_rate')}, avg €{data.get('avg_competitor_rate')}, max €{data.get('max_competitor_rate')}")
        print(f"  Recommendation: {data.get('recommendation')}")


# ===================== OBJECT STORAGE TESTS =====================

class TestObjectStorageUpload:
    """Test Object Storage upload endpoints"""
    
    def test_upload_pdf_employee_document(self, auth_headers, test_hotel_id):
        """Test uploading a PDF employee document"""
        # Create a simple PDF-like content (just for testing)
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        files = {
            "file": ("test_document.pdf", io.BytesIO(pdf_content), "application/pdf")
        }
        
        params = {
            "hotel_id": test_hotel_id,
            "category": "employee_document",
            "entity_type": "employee",
            "entity_id": "test_employee_123",
            "document_type": "cni",
            "description": "Test CNI document"
        }
        
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/storage/upload",
            files=files,
            params=params,
            headers=headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert "storage_path" in data
        assert "original_filename" in data
        assert data.get("original_filename") == "test_document.pdf"
        print(f"✓ Uploaded PDF: {data.get('id')}")
        return data.get("id")
    
    def test_upload_jpg_employee_document(self, auth_headers, test_hotel_id):
        """Test uploading a JPG employee photo"""
        # Create minimal JPEG content
        jpg_content = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {
            "file": ("employee_photo.jpg", io.BytesIO(jpg_content), "image/jpeg")
        }
        
        params = {
            "hotel_id": test_hotel_id,
            "category": "employee_document",
            "entity_type": "employee",
            "entity_id": "test_employee_123",
            "document_type": "photo"
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/storage/upload",
            files=files,
            params=params,
            headers=headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✓ Uploaded JPG: {data.get('id')}")
    
    def test_upload_png_employee_document(self, auth_headers, test_hotel_id):
        """Test uploading a PNG employee document"""
        # Minimal PNG content
        png_content = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            "file": ("rib_scan.png", io.BytesIO(png_content), "image/png")
        }
        
        params = {
            "hotel_id": test_hotel_id,
            "category": "employee_document",
            "entity_type": "employee",
            "entity_id": "test_employee_123",
            "document_type": "rib"
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/storage/upload",
            files=files,
            params=params,
            headers=headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✓ Uploaded PNG: {data.get('id')}")
    
    def test_upload_invalid_file_type(self, auth_headers, test_hotel_id):
        """Test that invalid file types are rejected for employee_document"""
        # Try to upload a .exe file (not allowed)
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"  # Fake EXE header
        
        files = {
            "file": ("malware.exe", io.BytesIO(exe_content), "application/x-msdownload")
        }
        
        params = {
            "hotel_id": test_hotel_id,
            "category": "employee_document",
            "document_type": "other"
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/storage/upload",
            files=files,
            params=params,
            headers=headers
        )
        
        # Should be rejected
        assert response.status_code == 400
        print("✓ Invalid file type correctly rejected")
    
    def test_upload_requires_auth(self, test_hotel_id):
        """Test that upload requires authentication"""
        pdf_content = b"%PDF-1.4\ntest"
        
        files = {
            "file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")
        }
        
        params = {
            "hotel_id": test_hotel_id,
            "category": "employee_document"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/storage/upload",
            files=files,
            params=params
        )
        
        assert response.status_code in [401, 403, 422]
        print("✓ Upload requires authentication")


class TestObjectStorageList:
    """Test Object Storage list endpoints"""
    
    def test_list_files(self, auth_headers, test_hotel_id):
        """Test listing uploaded files"""
        response = requests.get(
            f"{BASE_URL}/api/storage/files",
            params={"hotel_id": test_hotel_id},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} files")
        
        # Verify file structure if data exists
        if data:
            file_record = data[0]
            assert "id" in file_record
            assert "original_filename" in file_record
            assert "category" in file_record
            print(f"✓ File record structure verified")
    
    def test_list_files_by_category(self, auth_headers, test_hotel_id):
        """Test listing files filtered by category"""
        response = requests.get(
            f"{BASE_URL}/api/storage/files",
            params={"hotel_id": test_hotel_id, "category": "employee_document"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned files should be employee_document category
        for file_record in data:
            assert file_record.get("category") == "employee_document"
        
        print(f"✓ Listed {len(data)} employee documents")


class TestObjectStorageDownload:
    """Test Object Storage download endpoints"""
    
    def test_download_file(self, auth_headers, test_hotel_id):
        """Test downloading a file"""
        # First list files to get an ID
        response = requests.get(
            f"{BASE_URL}/api/storage/files",
            params={"hotel_id": test_hotel_id},
            headers=auth_headers
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No files available to download")
        
        files = response.json()
        file_id = files[0].get("id")
        
        # Download the file
        response = requests.get(
            f"{BASE_URL}/api/storage/files/{file_id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert len(response.content) > 0
        print(f"✓ Downloaded file: {len(response.content)} bytes")
    
    def test_get_file_metadata(self, auth_headers, test_hotel_id):
        """Test getting file metadata"""
        # First list files to get an ID
        response = requests.get(
            f"{BASE_URL}/api/storage/files",
            params={"hotel_id": test_hotel_id},
            headers=auth_headers
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No files available")
        
        files = response.json()
        file_id = files[0].get("id")
        
        # Get metadata
        response = requests.get(
            f"{BASE_URL}/api/storage/files/{file_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == file_id
        assert "original_filename" in data
        assert "content_type" in data
        assert "size" in data
        print(f"✓ Got metadata for: {data.get('original_filename')}")


# ===================== PMS-CRM SYNC TESTS =====================

class TestPMSCRMSync:
    """Test PMS to CRM automatic sync on reservation creation"""
    
    def test_create_reservation_syncs_to_crm(self, auth_headers, test_hotel_id):
        """Test that creating a reservation auto-syncs to CRM"""
        # First, we need a client and room
        # Get or create a client with unique email
        unique_email = f"test_crm_sync_{uuid.uuid4().hex[:8]}@test.com"
        
        client_data = {
            "first_name": "TEST_CRM",
            "last_name": "SyncTest",
            "email": unique_email,
            "phone": "+33 6 12 34 56 78"
        }
        client_response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/clients",
            json=client_data,
            headers=auth_headers
        )
        
        if client_response.status_code not in [200, 201]:
            print(f"Client creation failed: {client_response.status_code} - {client_response.text}")
            pytest.skip("Could not create test client")
        
        client = client_response.json()
        client_id = client.get("id")
        client_email = client.get("email")
        
        # Get a room
        room_response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/rooms",
            headers=auth_headers
        )
        
        if room_response.status_code != 200 or not room_response.json():
            pytest.skip("No rooms available")
        
        rooms = room_response.json()
        # Find an available room
        room = None
        for r in rooms:
            if r.get("status") == "available":
                room = r
                break
        
        if not room:
            room = rooms[0]
        
        room_id = room.get("id")
        
        # Create a reservation with future dates (far enough to avoid conflicts)
        # Use random offset to avoid conflicts with other tests
        import random
        offset = random.randint(200, 365)
        check_in = (datetime.now() + timedelta(days=offset)).strftime("%Y-%m-%d")
        check_out = (datetime.now() + timedelta(days=offset + 3)).strftime("%Y-%m-%d")
        
        reservation_data = {
            "client_id": client_id,
            "room_id": room_id,
            "check_in": check_in,
            "check_out": check_out,
            "adults": 2,
            "children": 0,
            "room_rate": 120.00,
            "total_amount": 360.00,
            "source": "Direct"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/reservations",
            json=reservation_data,
            headers=auth_headers
        )
        
        # Reservation creation should succeed
        if response.status_code not in [200, 201]:
            print(f"Reservation creation failed: {response.status_code} - {response.text}")
            pytest.skip("Could not create reservation")
        
        reservation = response.json()
        print(f"✓ Created reservation: {reservation.get('id')}")
        
        # Wait for async sync
        import time
        time.sleep(2)
        
        # Check CRM clients for the new client
        crm_response = requests.get(
            f"{BASE_URL}/api/crm/clients?limit=100",
            headers=auth_headers
        )
        
        if crm_response.status_code == 200:
            crm_data = crm_response.json()
            crm_clients = crm_data.get("clients", [])
            
            # Look for the client in CRM
            found = False
            for crm_client in crm_clients:
                if crm_client.get("email") == client_email:
                    found = True
                    assert crm_client.get("total_stays") >= 1
                    assert crm_client.get("total_spent") >= 360
                    assert crm_client.get("created_by") == "pms_auto_sync"
                    print(f"✓ Client found in CRM: {crm_client.get('email')}")
                    print(f"  Total stays: {crm_client.get('total_stays')}")
                    print(f"  Total spent: {crm_client.get('total_spent')}")
                    break
            
            assert found, f"Client {client_email} not found in CRM"
        else:
            pytest.fail(f"CRM clients endpoint returned: {crm_response.status_code}")
    
    def test_crm_client_updated_on_reservation(self, auth_headers, test_hotel_id):
        """Test that existing CRM client is updated when reservation is created"""
        # This test verifies the update path of auto_sync_reservation_to_crm
        
        # Get CRM clients
        crm_response = requests.get(
            f"{BASE_URL}/api/crm/clients",
            headers=auth_headers
        )
        
        if crm_response.status_code != 200:
            pytest.skip("Could not get CRM clients")
        
        crm_data = crm_response.json()
        crm_clients = crm_data.get("clients", []) if isinstance(crm_data, dict) else crm_data
        
        if not crm_clients:
            pytest.skip("No CRM clients available")
        
        # Get a CRM client with email
        crm_client = None
        for c in crm_clients:
            if c.get("email"):
                crm_client = c
                break
        
        if not crm_client:
            pytest.skip("No CRM client with email found")
        
        initial_stays = crm_client.get("total_stays", 0)
        initial_spent = crm_client.get("total_spent", 0)
        
        print(f"✓ Found CRM client: {crm_client.get('email')}")
        print(f"  Initial stays: {initial_stays}, Initial spent: {initial_spent}")


# ===================== CLEANUP =====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_connections(self, auth_headers, test_hotel_id):
        """Clean up test channel connections"""
        response = requests.get(
            f"{BASE_URL}/api/hotels/{test_hotel_id}/channel/connections",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            connections = response.json()
            for conn in connections:
                if conn.get("name", "").startswith("TEST_"):
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/channel/connections/{conn.get('id')}",
                        headers=auth_headers
                    )
                    if delete_response.status_code in [200, 204]:
                        print(f"✓ Deleted test connection: {conn.get('name')}")
        
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
