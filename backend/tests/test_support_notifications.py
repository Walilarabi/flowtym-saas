"""
Flowtym AI Support Center - Notification System Tests
Tests for real-time notification features: badge, notification center, read/unread, polling
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_31.json
ADMIN_EMAIL = "admin@flowtym.com"
ADMIN_PASSWORD = "admin123"

# Test hotel and ticket IDs
TEST_HOTEL_ID = "4f02769a-5f63-4121-bb97-a7061563d934"
TEST_TICKET_ID = "FLW-2026-673146"


@pytest.fixture(scope="module")
def admin_session():
    """Get authenticated session for hotel admin"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data['token']}"})
    
    return session


class TestNotificationEndpoints:
    """Test notification API endpoints"""
    
    def test_get_notifications(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/notifications - Get all notifications"""
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        
        # Verify notification structure if any exist
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "id" in notif
            assert "hotel_id" in notif
            assert "type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "read" in notif
            assert "created_at" in notif
            print(f"Found {len(data['notifications'])} notifications")
            print(f"First notification: {notif['title']}")
        else:
            print("No notifications found (expected if no AI analysis done yet)")
    
    def test_get_notifications_unread_only(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/notifications?unread_only=true"""
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications?unread_only=true"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        
        # All returned notifications should be unread
        for notif in data["notifications"]:
            assert notif["read"] == False, f"Expected unread notification, got read=True"
        
        print(f"Found {len(data['notifications'])} unread notifications")
    
    def test_get_unread_count(self, admin_session):
        """Test GET /api/support/hotels/{hotel_id}/notifications/count - Get unread count"""
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        assert data["unread_count"] >= 0
        
        print(f"Unread count: {data['unread_count']}")
    
    def test_mark_all_as_read(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/notifications/read-all"""
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/read-all"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "updated_count" in data
        
        print(f"Marked {data['updated_count']} notifications as read")
        
        # Verify count is now 0
        count_response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
        )
        count_data = count_response.json()
        assert count_data["unread_count"] == 0, f"Expected 0 unread, got {count_data['unread_count']}"


class TestAIAnalyzeWithNotification:
    """Test AI analysis creates notification"""
    
    def test_ai_analyze_creates_notification(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/tickets/{ticket_id}/ai-analyze creates notification"""
        # First, mark all as read to have a clean state
        admin_session.post(f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/read-all")
        
        # Get initial unread count
        initial_count = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
        ).json()["unread_count"]
        
        # Trigger AI analysis (this takes 10-15 seconds)
        print(f"Triggering AI analysis on ticket {TEST_TICKET_ID}...")
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/tickets/{TEST_TICKET_ID}/ai-analyze",
            timeout=30  # Longer timeout for AI response
        )
        
        # AI analysis may succeed or fail depending on API key
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "ai_response" in data
            print(f"AI Analysis completed successfully")
            
            # Check that a notification was created
            new_count = admin_session.get(
                f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
            ).json()["unread_count"]
            
            assert new_count > initial_count, f"Expected notification to be created. Initial: {initial_count}, New: {new_count}"
            print(f"Notification created! Unread count: {initial_count} -> {new_count}")
            
            # Verify notification content
            notifs = admin_session.get(
                f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications?unread_only=true"
            ).json()["notifications"]
            
            # Find the AI response notification
            ai_notif = next((n for n in notifs if n.get("notification_type") == "ai_response"), None)
            if ai_notif:
                assert "Réponse IA" in ai_notif["title"] or "IA" in ai_notif["title"]
                assert TEST_TICKET_ID in ai_notif["message"]
                print(f"AI notification verified: {ai_notif['title']}")
        else:
            print(f"AI Analysis failed with status {response.status_code} (expected if API key invalid)")
            pytest.skip("AI analysis failed - cannot verify notification creation")


class TestStatusChangeNotification:
    """Test status change creates notification"""
    
    def test_status_change_creates_notification(self, admin_session):
        """Test PUT /api/support/hotels/{hotel_id}/tickets/{ticket_id} with status change creates notification"""
        # First, mark all as read
        admin_session.post(f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/read-all")
        
        # Get initial count
        initial_count = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
        ).json()["unread_count"]
        
        # Get current ticket status
        ticket_response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/tickets/{TEST_TICKET_ID}"
        )
        
        if ticket_response.status_code != 200:
            pytest.skip(f"Could not get ticket: {ticket_response.status_code}")
        
        current_status = ticket_response.json()["ticket"]["status"]
        
        # Change status to something different
        new_status = "resolved" if current_status != "resolved" else "in_progress"
        
        update_response = admin_session.put(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/tickets/{TEST_TICKET_ID}",
            json={"status": new_status}
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Check notification was created
        new_count = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/count"
        ).json()["unread_count"]
        
        assert new_count > initial_count, f"Expected notification for status change. Initial: {initial_count}, New: {new_count}"
        print(f"Status change notification created! Count: {initial_count} -> {new_count}")
        
        # Verify notification content
        notifs = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications?unread_only=true"
        ).json()["notifications"]
        
        status_notif = next((n for n in notifs if n.get("notification_type") == "status_change"), None)
        if status_notif:
            assert "Statut" in status_notif["title"] or "statut" in status_notif["message"].lower()
            print(f"Status notification verified: {status_notif['title']}")


class TestMarkSingleNotificationRead:
    """Test marking individual notification as read"""
    
    def test_mark_notification_read(self, admin_session):
        """Test POST /api/support/hotels/{hotel_id}/notifications/{notification_id}/read"""
        # Get notifications
        notifs_response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications"
        )
        
        notifs = notifs_response.json()["notifications"]
        
        if not notifs:
            pytest.skip("No notifications to test with")
        
        # Find an unread notification or use the first one
        test_notif = next((n for n in notifs if not n["read"]), notifs[0])
        notif_id = test_notif["id"]
        
        # Mark as read
        response = admin_session.post(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications/{notif_id}/read"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"Marked notification {notif_id} as read")


class TestNotificationTypes:
    """Test notification type filtering and structure"""
    
    def test_notification_types_structure(self, admin_session):
        """Verify notification types are correctly set"""
        response = admin_session.get(
            f"{BASE_URL}/api/support/hotels/{TEST_HOTEL_ID}/notifications"
        )
        
        notifs = response.json()["notifications"]
        
        valid_types = ["ai_response", "status_change", "info", "new_message"]
        
        for notif in notifs:
            if "notification_type" in notif:
                assert notif["notification_type"] in valid_types, f"Invalid type: {notif['notification_type']}"
        
        # Count by type
        type_counts = {}
        for notif in notifs:
            ntype = notif.get("notification_type", "unknown")
            type_counts[ntype] = type_counts.get(ntype, 0) + 1
        
        print(f"Notification types: {type_counts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
