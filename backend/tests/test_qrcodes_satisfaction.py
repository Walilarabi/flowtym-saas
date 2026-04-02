"""
QR Codes and Satisfaction Module Tests
Tests for:
- QR Zones CRUD (authenticated)
- Public satisfaction survey endpoints (no auth)
- Satisfaction config and stats (authenticated)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"
QR_TOKEN = "o7ifS_CT6HIWJr71J09dHw"
ZONE_ID = "c813d4a7-781b-4700-b41e-5749945564ab"

# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@flowtym.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC SATISFACTION SURVEY TESTS (NO AUTH REQUIRED)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPublicSatisfactionSurvey:
    """Tests for public satisfaction survey endpoints - NO AUTH REQUIRED"""
    
    def test_get_public_survey_french(self):
        """GET /api/satisfaction/public/survey/{token} - French language"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}?lang=fr")
        assert response.status_code == 200
        
        data = response.json()
        assert data["language"] == "fr"
        assert "zone" in data
        assert "hotel" in data
        assert "translations" in data
        assert "criteria" in data
        assert len(data["criteria"]) == 4  # cleanliness, comfort, equipment, service
        
        # Verify French translations
        assert "Propreté" in data["translations"]["criteria"]["cleanliness"]
        
    def test_get_public_survey_english(self):
        """GET /api/satisfaction/public/survey/{token} - English language"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        assert data["language"] == "en"
        # English translation contains "cleanliness" (case insensitive)
        assert "cleanliness" in data["translations"]["criteria"]["cleanliness"].lower()
        
    def test_get_public_survey_all_9_languages(self):
        """Verify all 9 languages are supported"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}")
        assert response.status_code == 200
        
        data = response.json()
        languages = data["languages"]
        
        # Verify 9 languages: FR, EN, ES, IT, AR, ZH, JA, PT, DE
        expected_langs = ["fr", "en", "es", "it", "ar", "zh", "ja", "pt", "de"]
        for lang in expected_langs:
            assert lang in languages, f"Language {lang} not found"
            assert "flag" in languages[lang]
            assert "name" in languages[lang]
            
    def test_get_public_survey_invalid_token(self):
        """GET /api/satisfaction/public/survey/{token} - Invalid token returns 404"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/public/survey/invalid_token_xyz")
        assert response.status_code == 404
        
    def test_submit_public_survey_satisfied(self):
        """POST /api/satisfaction/public/survey/{token} - Submit satisfied survey"""
        response = requests.post(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}", json={
            "zone_id": ZONE_ID,
            "language": "fr",
            "ratings": {
                "cleanliness": 5,
                "comfort": 5,
                "equipment": 4,
                "service": 5
            },
            "improvement_text": "TEST_Excellent séjour!"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["average_rating"] >= 4.0
        assert data["is_satisfied"] == True
        assert "survey_id" in data
        
    def test_submit_public_survey_unsatisfied(self):
        """POST /api/satisfaction/public/survey/{token} - Submit unsatisfied survey triggers escalation"""
        response = requests.post(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}", json={
            "zone_id": ZONE_ID,
            "language": "fr",
            "ratings": {
                "cleanliness": 2,
                "comfort": 2,
                "equipment": 2,
                "service": 2
            },
            "improvement_text": "TEST_Chambre sale, service lent"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["average_rating"] < 4.0
        assert data["is_satisfied"] == False
        # Escalation should be triggered
        
    def test_submit_public_survey_zone_mismatch(self):
        """POST /api/satisfaction/public/survey/{token} - Zone ID mismatch returns 400"""
        response = requests.post(f"{BASE_URL}/api/satisfaction/public/survey/{QR_TOKEN}", json={
            "zone_id": "wrong-zone-id",
            "language": "fr",
            "ratings": {"cleanliness": 5, "comfort": 5, "equipment": 5, "service": 5}
        })
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# QR ZONES CRUD TESTS (AUTHENTICATED)
# ═══════════════════════════════════════════════════════════════════════════════

class TestQRZonesCRUD:
    """Tests for QR Zones CRUD endpoints - REQUIRES AUTH"""
    
    def test_list_qr_zones(self, auth_headers):
        """GET /api/qrcodes/hotels/{hotel_id}/zones - List zones"""
        response = requests.get(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            zone = data[0]
            assert "id" in zone
            assert "name" in zone
            assert "zone_type" in zone
            assert "qr_token" in zone
            assert "qr_url" in zone
            
    def test_create_qr_zone_room(self, auth_headers):
        """POST /api/qrcodes/hotels/{hotel_id}/zones - Create room zone"""
        response = requests.post(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones",
            headers=auth_headers,
            json={
                "name": f"TEST_Chambre {uuid.uuid4().hex[:4]}",
                "zone_type": "room",
                "room_number": f"T{uuid.uuid4().hex[:3]}",
                "floor": 2,
                "qr_types": ["housekeeping", "satisfaction"],
                "description": "Test room zone"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "qr_token" in data
        assert data["zone_type"] == "room"
        assert "housekeeping" in data["qr_types"]
        assert "satisfaction" in data["qr_types"]
        
    def test_create_qr_zone_restaurant(self, auth_headers):
        """POST /api/qrcodes/hotels/{hotel_id}/zones - Create restaurant zone"""
        response = requests.post(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones",
            headers=auth_headers,
            json={
                "name": f"TEST_Restaurant {uuid.uuid4().hex[:4]}",
                "zone_type": "restaurant",
                "qr_types": ["satisfaction"],
                "description": "Test restaurant zone"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["zone_type"] == "restaurant"
        
    def test_create_qr_zone_spa(self, auth_headers):
        """POST /api/qrcodes/hotels/{hotel_id}/zones - Create SPA zone"""
        response = requests.post(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones",
            headers=auth_headers,
            json={
                "name": f"TEST_SPA {uuid.uuid4().hex[:4]}",
                "zone_type": "spa",
                "qr_types": ["satisfaction"],
                "description": "Test SPA zone"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["zone_type"] == "spa"
        
    def test_list_zones_filter_by_type(self, auth_headers):
        """GET /api/qrcodes/hotels/{hotel_id}/zones?zone_type=room - Filter by type"""
        response = requests.get(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones?zone_type=room",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        for zone in data:
            assert zone["zone_type"] == "room"
            
    def test_qr_zones_requires_auth(self):
        """GET /api/qrcodes/hotels/{hotel_id}/zones - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones")
        assert response.status_code in [401, 403]


# ═══════════════════════════════════════════════════════════════════════════════
# SATISFACTION CONFIG & STATS TESTS (AUTHENTICATED)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSatisfactionConfig:
    """Tests for satisfaction config endpoints - REQUIRES AUTH"""
    
    def test_get_satisfaction_config(self, auth_headers):
        """GET /api/satisfaction/hotels/{hotel_id}/config - Get config"""
        response = requests.get(
            f"{BASE_URL}/api/satisfaction/hotels/{HOTEL_ID}/config",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "satisfaction_threshold" in data
        assert "criteria" in data
        assert "auto_escalation_enabled" in data
        assert data["satisfaction_threshold"] == 4.0
        assert len(data["criteria"]) == 4
        
    def test_get_satisfaction_stats(self, auth_headers):
        """GET /api/satisfaction/hotels/{hotel_id}/stats - Get stats"""
        response = requests.get(
            f"{BASE_URL}/api/satisfaction/hotels/{HOTEL_ID}/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_responses" in data
        assert "satisfied_count" in data
        assert "unsatisfied_count" in data
        assert "satisfaction_rate" in data
        assert "average_rating" in data
        assert "ratings_by_criterion" in data
        assert "pending_escalations" in data
        
    def test_satisfaction_config_requires_auth(self):
        """GET /api/satisfaction/hotels/{hotel_id}/config - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/hotels/{HOTEL_ID}/config")
        assert response.status_code in [401, 403]
        
    def test_satisfaction_stats_requires_auth(self):
        """GET /api/satisfaction/hotels/{hotel_id}/stats - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/satisfaction/hotels/{HOTEL_ID}/stats")
        assert response.status_code in [401, 403]


# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(auth_headers):
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Cleanup zones
    try:
        response = requests.get(
            f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones",
            headers=auth_headers
        )
        if response.status_code == 200:
            zones = response.json()
            for zone in zones:
                if zone.get("name", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/qrcodes/hotels/{HOTEL_ID}/zones/{zone['id']}",
                        headers=auth_headers
                    )
    except:
        pass
