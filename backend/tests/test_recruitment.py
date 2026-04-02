"""
Test suite for Staff Recruitment Module
Tests: Job Offers CRUD, Candidates CRUD, AI Generation (MOCK), Pipeline Stats
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com')
HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"

# Test data tracking for cleanup
created_job_offers = []
created_candidates = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@flowtym.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ===================== JOB OFFERS TESTS =====================

class TestJobOffers:
    """Job Offers CRUD operations"""
    
    def test_get_job_offers_list(self, api_client):
        """GET /api/hotels/{id}/recruitment/job-offers returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET job-offers returned {len(data)} offers")
    
    def test_create_job_offer(self, api_client):
        """POST /api/hotels/{id}/recruitment/job-offers creates offer"""
        payload = {
            "title": "TEST_Réceptionniste CDI",
            "department": "front_office",
            "contract_type": "CDI",
            "location": "Paris 8ème",
            "description": "Test job offer description",
            "requirements": ["Bilingue FR/EN", "Expérience PMS"],
            "salary_min": 1800,
            "salary_max": 2200,
            "experience_years": 2,
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["department"] == payload["department"]
        assert data["contract_type"] == payload["contract_type"]
        assert data["location"] == payload["location"]
        assert data["salary_min"] == payload["salary_min"]
        assert data["salary_max"] == payload["salary_max"]
        assert "id" in data
        
        created_job_offers.append(data["id"])
        print(f"SUCCESS: Created job offer with ID: {data['id']}")
    
    def test_update_job_offer_publish(self, api_client):
        """PUT /api/hotels/{id}/recruitment/job-offers/{id} updates and publishes offer"""
        if not created_job_offers:
            pytest.skip("No job offer created to update")
        
        offer_id = created_job_offers[0]
        payload = {
            "title": "TEST_Réceptionniste CDI Updated",
            "department": "front_office",
            "contract_type": "CDI",
            "location": "Paris 8ème",
            "description": "Updated description",
            "requirements": ["Bilingue FR/EN", "Expérience PMS", "Sens du service"],
            "salary_min": 1900,
            "salary_max": 2300,
            "experience_years": 2,
            "status": "published"
        }
        response = api_client.put(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/{offer_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["status"] == "published"
        assert data["published_at"] is not None
        print(f"SUCCESS: Updated and published job offer: {offer_id}")
    
    def test_get_job_offers_after_create(self, api_client):
        """Verify created offer appears in list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers")
        assert response.status_code == 200
        
        data = response.json()
        offer_ids = [o["id"] for o in data]
        
        if created_job_offers:
            assert created_job_offers[0] in offer_ids
            print(f"SUCCESS: Created offer found in list")


# ===================== AI GENERATION TESTS (MOCK) =====================

class TestAIGeneration:
    """AI Job Offer Generation - MOCK mode"""
    
    def test_ai_generate_front_office(self, api_client):
        """POST /api/hotels/{id}/recruitment/job-offers/generate-ai returns mock content for front_office"""
        payload = {
            "title": "Chef de réception",
            "department": "front_office",
            "contract_type": "CDI",
            "keywords": ["bilingue", "management"]
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/generate-ai", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["generated"] == True
        assert data["title"] == payload["title"]
        assert "description" in data
        assert len(data["description"]) > 100  # Should have substantial content
        assert "requirements" in data
        assert isinstance(data["requirements"], list)
        assert len(data["requirements"]) >= 3
        assert "salary_min" in data
        assert "salary_max" in data
        
        # Verify front_office template content
        assert "réception" in data["description"].lower() or "accueillir" in data["description"].lower()
        print(f"SUCCESS: AI generated front_office content with {len(data['requirements'])} requirements")
    
    def test_ai_generate_housekeeping(self, api_client):
        """POST /api/hotels/{id}/recruitment/job-offers/generate-ai returns mock content for housekeeping"""
        payload = {
            "title": "Gouvernante",
            "department": "housekeeping",
            "contract_type": "CDI",
            "keywords": []
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/generate-ai", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["generated"] == True
        assert "nettoyage" in data["description"].lower() or "propreté" in data["description"].lower()
        print(f"SUCCESS: AI generated housekeeping content")
    
    def test_ai_generate_food_beverage(self, api_client):
        """POST /api/hotels/{id}/recruitment/job-offers/generate-ai returns mock content for food_beverage"""
        payload = {
            "title": "Chef de cuisine",
            "department": "food_beverage",
            "contract_type": "CDI",
            "keywords": ["gastronomie", "HACCP"]
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/generate-ai", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["generated"] == True
        assert "cuisine" in data["description"].lower() or "gastronomie" in data["description"].lower()
        # Keywords should be included
        assert "gastronomie" in data["description"].lower() or "HACCP" in data["description"]
        print(f"SUCCESS: AI generated food_beverage content with keywords")
    
    def test_ai_generate_salary_by_contract_type(self, api_client):
        """Verify salary ranges differ by contract type"""
        # CDI
        response_cdi = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/generate-ai", json={
            "title": "Test", "department": "front_office", "contract_type": "CDI", "keywords": []
        })
        # Extra (hourly)
        response_extra = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/generate-ai", json={
            "title": "Test", "department": "front_office", "contract_type": "Extra", "keywords": []
        })
        
        assert response_cdi.status_code == 200
        assert response_extra.status_code == 200
        
        cdi_data = response_cdi.json()
        extra_data = response_extra.json()
        
        # CDI should have monthly salary (1800-2500 range)
        assert cdi_data["salary_min"] >= 1700
        # Extra should have hourly rate (12-15 range)
        assert extra_data["salary_min"] < 100  # Hourly rate
        print(f"SUCCESS: Salary ranges differ by contract type (CDI: {cdi_data['salary_min']}, Extra: {extra_data['salary_min']})")


# ===================== CANDIDATES TESTS =====================

class TestCandidates:
    """Candidates CRUD operations"""
    
    def test_get_candidates_list(self, api_client):
        """GET /api/hotels/{id}/recruitment/candidates returns list"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET candidates returned {len(data)} candidates")
    
    def test_create_candidate(self, api_client):
        """POST /api/hotels/{id}/recruitment/candidates creates candidate"""
        # Use job offer if available
        job_offer_id = created_job_offers[0] if created_job_offers else None
        
        payload = {
            "first_name": "TEST_Jean",
            "last_name": "Dupont",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+33612345678",
            "job_offer_id": job_offer_id,
            "source": "linkedin",
            "cover_letter": "Lettre de motivation test",
            "notes": "Notes internes test"
        }
        response = api_client.post(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["first_name"] == payload["first_name"]
        assert data["last_name"] == payload["last_name"]
        assert data["email"] == payload["email"]
        assert data["source"] == payload["source"]
        assert data["status"] == "new"  # Default status
        assert data["rating"] == 0  # Default rating
        assert "id" in data
        
        created_candidates.append(data["id"])
        print(f"SUCCESS: Created candidate with ID: {data['id']}")
    
    def test_update_candidate_status(self, api_client):
        """PATCH /api/hotels/{id}/recruitment/candidates/{id}/status updates status"""
        if not created_candidates:
            pytest.skip("No candidate created to update")
        
        candidate_id = created_candidates[0]
        
        # Test status progression: new -> screening -> interview
        for status in ["screening", "interview"]:
            response = api_client.patch(
                f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates/{candidate_id}/status?status={status}"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == status
            print(f"SUCCESS: Updated candidate status to: {status}")
    
    def test_update_candidate_rating(self, api_client):
        """PATCH /api/hotels/{id}/recruitment/candidates/{id}/rating updates rating"""
        if not created_candidates:
            pytest.skip("No candidate created to update")
        
        candidate_id = created_candidates[0]
        
        # Test rating update
        for rating in [3, 5]:
            response = api_client.patch(
                f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates/{candidate_id}/rating?rating={rating}"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["rating"] == rating
            print(f"SUCCESS: Updated candidate rating to: {rating}")
    
    def test_update_candidate_rating_invalid(self, api_client):
        """PATCH /api/hotels/{id}/recruitment/candidates/{id}/rating rejects invalid rating"""
        if not created_candidates:
            pytest.skip("No candidate created to test")
        
        candidate_id = created_candidates[0]
        
        # Test invalid rating (> 5)
        response = api_client.patch(
            f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates/{candidate_id}/rating?rating=10"
        )
        assert response.status_code == 400
        print(f"SUCCESS: Invalid rating rejected with 400")
    
    def test_get_candidates_with_job_title(self, api_client):
        """Verify candidates include job_title from linked job offer"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates")
        assert response.status_code == 200
        
        data = response.json()
        # Find our test candidate
        test_candidates = [c for c in data if c["first_name"].startswith("TEST_")]
        
        if test_candidates and created_job_offers:
            # Should have job_title populated
            for c in test_candidates:
                if c.get("job_offer_id"):
                    assert "job_title" in c
                    print(f"SUCCESS: Candidate has job_title: {c.get('job_title')}")


# ===================== PIPELINE STATS TESTS =====================

class TestPipelineStats:
    """Pipeline statistics endpoint"""
    
    def test_get_pipeline_stats(self, api_client):
        """GET /api/hotels/{id}/recruitment/pipeline-stats returns stats"""
        response = api_client.get(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/pipeline-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "pipeline" in data
        assert "total_candidates" in data
        assert "active_job_offers" in data
        
        # Verify pipeline structure
        pipeline = data["pipeline"]
        expected_statuses = ["new", "screening", "interview", "offer", "hired", "rejected"]
        for status in expected_statuses:
            assert status in pipeline
            assert isinstance(pipeline[status], int)
        
        print(f"SUCCESS: Pipeline stats - Total: {data['total_candidates']}, Active offers: {data['active_job_offers']}")
        print(f"  Pipeline breakdown: {pipeline}")


# ===================== CLEANUP =====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_candidate(self, api_client):
        """DELETE /api/hotels/{id}/recruitment/candidates/{id} removes candidate"""
        for candidate_id in created_candidates:
            response = api_client.delete(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/candidates/{candidate_id}")
            assert response.status_code == 200
            print(f"SUCCESS: Deleted candidate: {candidate_id}")
    
    def test_delete_job_offer(self, api_client):
        """DELETE /api/hotels/{id}/recruitment/job-offers/{id} removes offer"""
        for offer_id in created_job_offers:
            response = api_client.delete(f"{BASE_URL}/api/hotels/{HOTEL_ID}/recruitment/job-offers/{offer_id}")
            assert response.status_code == 200
            print(f"SUCCESS: Deleted job offer: {offer_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
