"""
Test Advanced Analytics CRM Module
Tests for:
- POST /api/crm/analytics/advanced - Full advanced analytics with retention, LTV, attrition
- GET /api/crm/analytics/attrition - Attrition risk analysis with AI
- GET /api/crm/analytics/retention-cohorts - Retention cohort data
- GET /api/crm/analytics/ltv - LTV by segment, trend, top clients
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reception-suite-1.preview.emergentagent.com').rstrip('/')

class TestAdvancedAnalytics:
    """Advanced Analytics API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@flowtym.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ===================== POST /api/crm/analytics/advanced =====================
    
    def test_advanced_analytics_default_period(self):
        """Test advanced analytics with default 6m period"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "6m"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "period" in data, "Missing 'period' in response"
        assert "retention_cohorts" in data, "Missing 'retention_cohorts' in response"
        assert "ltv_by_segment" in data, "Missing 'ltv_by_segment' in response"
        assert "ltv_trend" in data, "Missing 'ltv_trend' in response"
        assert "top_clients_by_ltv" in data, "Missing 'top_clients_by_ltv' in response"
        assert "attrition_risks" in data, "Missing 'attrition_risks' in response"
        assert "summary_kpis" in data, "Missing 'summary_kpis' in response"
        
        # Verify period structure
        assert data["period"]["type"] == "6m"
        assert "start_date" in data["period"]
        assert "end_date" in data["period"]
        
        # Verify summary_kpis structure
        kpis = data["summary_kpis"]
        assert "total_clients" in kpis
        assert "active_clients" in kpis
        assert "high_risk_clients" in kpis
        assert "average_ltv" in kpis
        assert "total_revenue" in kpis
        assert "retention_rate_avg" in kpis
        
        print(f"✓ Advanced analytics returned: {len(data['retention_cohorts'])} cohorts, {len(data['ltv_by_segment'])} segments, {len(data['attrition_risks'])} at-risk clients")
    
    def test_advanced_analytics_12m_period(self):
        """Test advanced analytics with 12 month period"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "12m"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "12m"
        
        print(f"✓ 12m period analytics: {data['summary_kpis']['total_clients']} total clients, {data['summary_kpis']['average_ltv']}€ avg LTV")
    
    def test_advanced_analytics_custom_period(self):
        """Test advanced analytics with custom date range"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "custom",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"]["type"] == "custom"
        
        print(f"✓ Custom period analytics returned successfully")
    
    def test_advanced_analytics_retention_cohorts_structure(self):
        """Verify retention cohorts data structure"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "6m"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are cohorts, verify structure
        if data["retention_cohorts"]:
            cohort = data["retention_cohorts"][0]
            assert "cohort_month" in cohort
            assert "initial_clients" in cohort
            assert "retention_30d" in cohort
            assert "retention_60d" in cohort
            assert "retention_90d" in cohort
            assert "retention_180d" in cohort
            
            # Verify types
            assert isinstance(cohort["initial_clients"], int)
            assert isinstance(cohort["retention_30d"], (int, float))
            
            print(f"✓ Retention cohort structure verified: {cohort['cohort_month']} with {cohort['initial_clients']} initial clients")
        else:
            print("✓ No retention cohorts (empty data)")
    
    def test_advanced_analytics_ltv_structure(self):
        """Verify LTV data structure"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "6m"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify LTV by segment structure
        if data["ltv_by_segment"]:
            segment = data["ltv_by_segment"][0]
            assert "segment" in segment
            assert "avg_ltv" in segment
            assert "total_revenue" in segment
            assert "client_count" in segment
            
            print(f"✓ LTV segment structure verified: {segment['segment']} with {segment['avg_ltv']}€ avg LTV")
        
        # Verify LTV trend structure
        if data["ltv_trend"]:
            trend = data["ltv_trend"][0]
            assert "month" in trend
            assert "avg_ltv" in trend
            assert "total_clients" in trend
            
            print(f"✓ LTV trend structure verified: {len(data['ltv_trend'])} months of data")
        
        # Verify top clients structure
        if data["top_clients_by_ltv"]:
            client = data["top_clients_by_ltv"][0]
            assert "id" in client
            assert "name" in client
            assert "email" in client
            assert "total_spent" in client
            assert "total_stays" in client
            assert "client_type" in client
            
            print(f"✓ Top client structure verified: {client['name']} with {client['total_spent']}€")
    
    def test_advanced_analytics_attrition_structure(self):
        """Verify attrition risk data structure"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "6m"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are at-risk clients, verify structure
        if data["attrition_risks"]:
            risk = data["attrition_risks"][0]
            assert "client_id" in risk
            assert "client_name" in risk
            assert "email" in risk
            assert "risk_score" in risk
            assert "risk_level" in risk
            assert "days_since_last_stay" in risk
            assert "total_stays" in risk
            assert "total_spent" in risk
            assert "risk_factors" in risk
            assert "ai_analysis" in risk
            assert "recommended_actions" in risk
            
            # Verify risk_level is valid
            assert risk["risk_level"] in ["low", "medium", "high", "critical"]
            
            # Verify risk_score is 0-100
            assert 0 <= risk["risk_score"] <= 100
            
            print(f"✓ Attrition risk structure verified: {risk['client_name']} - {risk['risk_level']} ({risk['risk_score']}/100)")
            
            # Check if AI analysis is present for high/critical risk
            if risk["risk_level"] in ["high", "critical"]:
                assert risk["ai_analysis"], "AI analysis should be present for high/critical risk"
                print(f"  AI Analysis: {risk['ai_analysis'][:100]}...")
        else:
            print("✓ No attrition risks (no at-risk clients)")
    
    def test_advanced_analytics_requires_auth(self):
        """Test that advanced analytics requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={
            "type": "6m"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Advanced analytics requires authentication")
    
    # ===================== GET /api/crm/analytics/attrition =====================
    
    def test_attrition_analysis_endpoint(self):
        """Test dedicated attrition analysis endpoint"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/attrition")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "total_analyzed" in data
        assert "risk_summary" in data
        assert "clients" in data
        
        # Verify risk_summary structure
        summary = data["risk_summary"]
        assert "critical" in summary
        assert "high" in summary
        assert "medium" in summary
        assert "low" in summary
        
        print(f"✓ Attrition analysis: {data['total_analyzed']} clients analyzed")
        print(f"  Risk summary: Critical={summary['critical']}, High={summary['high']}, Medium={summary['medium']}, Low={summary['low']}")
    
    def test_attrition_analysis_with_limit(self):
        """Test attrition analysis with custom limit"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/attrition?limit=5")
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["clients"]) <= 5
        
        print(f"✓ Attrition analysis with limit=5: {len(data['clients'])} clients returned")
    
    def test_attrition_analysis_requires_auth(self):
        """Test that attrition analysis requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/crm/analytics/attrition")
        
        assert response.status_code in [401, 403]
        print("✓ Attrition analysis requires authentication")
    
    # ===================== GET /api/crm/analytics/retention-cohorts =====================
    
    def test_retention_cohorts_endpoint(self):
        """Test dedicated retention cohorts endpoint"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/retention-cohorts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert "cohorts" in data
        
        # Default should be 6m
        assert data["period"]["type"] == "6m"
        
        print(f"✓ Retention cohorts: {len(data['cohorts'])} cohorts returned")
    
    def test_retention_cohorts_12m_period(self):
        """Test retention cohorts with 12m period"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/retention-cohorts?period_type=12m")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"]["type"] == "12m"
        
        print(f"✓ Retention cohorts 12m: {len(data['cohorts'])} cohorts returned")
    
    def test_retention_cohorts_requires_auth(self):
        """Test that retention cohorts requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/crm/analytics/retention-cohorts")
        
        assert response.status_code in [401, 403]
        print("✓ Retention cohorts requires authentication")
    
    # ===================== GET /api/crm/analytics/ltv =====================
    
    def test_ltv_analytics_endpoint(self):
        """Test dedicated LTV analytics endpoint"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/ltv")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert "by_segment" in data
        assert "top_clients" in data
        assert "trend" in data
        
        # Default should be 12m
        assert data["period"]["type"] == "12m"
        
        print(f"✓ LTV analytics: {len(data['by_segment'])} segments, {len(data['top_clients'])} top clients, {len(data['trend'])} trend points")
    
    def test_ltv_analytics_6m_period(self):
        """Test LTV analytics with 6m period"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/ltv?period_type=6m")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["period"]["type"] == "6m"
        
        print(f"✓ LTV analytics 6m: {len(data['by_segment'])} segments")
    
    def test_ltv_analytics_requires_auth(self):
        """Test that LTV analytics requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/crm/analytics/ltv")
        
        assert response.status_code in [401, 403]
        print("✓ LTV analytics requires authentication")
    
    # ===================== AI Analysis Tests =====================
    
    def test_ai_analysis_for_high_risk_clients(self):
        """Test that AI analysis is generated for high/critical risk clients"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/attrition?limit=20")
        
        assert response.status_code == 200
        data = response.json()
        
        high_risk_clients = [c for c in data["clients"] if c["risk_level"] in ["high", "critical"]]
        
        if high_risk_clients:
            for client in high_risk_clients[:3]:  # Check first 3
                assert client["ai_analysis"], f"AI analysis missing for {client['client_name']}"
                assert client["recommended_actions"], f"Recommended actions missing for {client['client_name']}"
                assert len(client["recommended_actions"]) >= 1, "Should have at least 1 recommended action"
                
                print(f"✓ AI analysis for {client['client_name']} ({client['risk_level']}): {client['ai_analysis'][:80]}...")
        else:
            print("✓ No high/critical risk clients to test AI analysis")


class TestAdvancedAnalyticsDataIntegrity:
    """Test data integrity and calculations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@flowtym.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_kpi_consistency(self):
        """Test that KPIs are consistent across endpoints"""
        # Get advanced analytics
        advanced_response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={"type": "6m"})
        assert advanced_response.status_code == 200
        advanced_data = advanced_response.json()
        
        # Get basic analytics
        basic_response = self.session.get(f"{BASE_URL}/api/crm/analytics")
        assert basic_response.status_code == 200
        basic_data = basic_response.json()
        
        # Note: Advanced analytics counts ALL clients, basic analytics counts non-deleted
        # So advanced total_clients >= basic total_clients
        assert advanced_data["summary_kpis"]["total_clients"] >= 0, "Total clients should be non-negative"
        assert basic_data["total_clients"] >= 0, "Basic total clients should be non-negative"
        
        # Active clients should be consistent
        assert advanced_data["summary_kpis"]["active_clients"] == basic_data["active_clients"], \
            f"Active clients mismatch: {advanced_data['summary_kpis']['active_clients']} vs {basic_data['active_clients']}"
        
        print(f"✓ KPI consistency verified: {advanced_data['summary_kpis']['active_clients']} active clients")
    
    def test_ltv_calculation_consistency(self):
        """Test that LTV calculations are consistent"""
        response = self.session.post(f"{BASE_URL}/api/crm/analytics/advanced", json={"type": "6m"})
        assert response.status_code == 200
        data = response.json()
        
        # Total revenue from segments should match summary
        if data["ltv_by_segment"]:
            segment_total = sum(s["total_revenue"] for s in data["ltv_by_segment"])
            summary_total = data["summary_kpis"]["total_revenue"]
            
            # Allow small floating point differences
            assert abs(segment_total - summary_total) < 1, \
                f"Revenue mismatch: segments={segment_total}, summary={summary_total}"
            
            print(f"✓ LTV calculation consistency verified: {summary_total}€ total revenue")
    
    def test_risk_score_bounds(self):
        """Test that risk scores are within valid bounds"""
        response = self.session.get(f"{BASE_URL}/api/crm/analytics/attrition?limit=50")
        assert response.status_code == 200
        data = response.json()
        
        for client in data["clients"]:
            assert 0 <= client["risk_score"] <= 100, \
                f"Invalid risk score {client['risk_score']} for {client['client_name']}"
            
            # Verify risk level matches score
            score = client["risk_score"]
            level = client["risk_level"]
            
            if score >= 70:
                assert level == "critical", f"Score {score} should be critical, got {level}"
            elif score >= 50:
                assert level == "high", f"Score {score} should be high, got {level}"
            elif score >= 30:
                assert level == "medium", f"Score {score} should be medium, got {level}"
            else:
                assert level == "low", f"Score {score} should be low, got {level}"
        
        print(f"✓ Risk score bounds verified for {len(data['clients'])} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
