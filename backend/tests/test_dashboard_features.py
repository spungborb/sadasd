"""
Test Dashboard Features - Iteration 11
Tests for: Orders, Wallet, Tickets, Telegram Webhook Integration

Features tested:
- POST /api/orders - creates order with dummy credentials + warranty
- GET /api/orders - lists user's orders (credentials excluded)
- POST /api/orders/{id}/reveal - reveals credentials, increments count
- GET /api/wallet - returns balance + transactions
- POST /api/tickets - creates ticket with seq ID
- GET /api/tickets - lists user's tickets
- GET /api/tickets/{id} - returns full thread
- GET /api/tickets/{id}/poll - returns new messages since timestamp
- POST /api/tickets/{id}/messages - appends user reply
- GET /api/admin/tickets - admin lists all tickets
- POST /api/admin/tickets/{id}/reply - admin replies (requires admin)
- POST /api/webhook/social-reply - Telegram webhook integration
- Existing endpoints still work
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - will be created in setup
TEST_USER_ID = f"test_user_{uuid.uuid4().hex[:8]}"
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:6]}@test.local"
TEST_ADMIN_EMAIL = f"admin_{uuid.uuid4().hex[:6]}@test.local"
TEST_SESSION_TOKEN = f"test_session_{uuid.uuid4().hex}"
TEST_ADMIN_SESSION_TOKEN = f"admin_session_{uuid.uuid4().hex}"

# Webhook secret from .env
WEBHOOK_SECRET = "change_me_webhook_secret"


class TestSetup:
    """Setup test users in MongoDB"""
    
    @pytest.fixture(scope="class", autouse=True)
    def setup_test_users(self):
        """Create test users directly in MongoDB via API workaround"""
        # We'll use the session to test - need to create users in DB
        # For now, we'll test unauthenticated endpoints first
        pass


class TestUnauthenticatedAccess:
    """Test that protected endpoints return 401 without auth"""
    
    def test_orders_post_without_auth_returns_401(self):
        """POST /api/orders without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/orders", json={"item_id": 12345})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ POST /api/orders without auth returns 401")
    
    def test_orders_get_without_auth_returns_401(self):
        """GET /api/orders without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/orders without auth returns 401")
    
    def test_wallet_without_auth_returns_401(self):
        """GET /api/wallet without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/wallet")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/wallet without auth returns 401")
    
    def test_tickets_post_without_auth_returns_401(self):
        """POST /api/tickets without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/tickets", json={"subject": "Test", "message": "Test message"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/tickets without auth returns 401")
    
    def test_tickets_get_without_auth_returns_401(self):
        """GET /api/tickets without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/tickets")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/tickets without auth returns 401")
    
    def test_admin_tickets_without_auth_returns_401(self):
        """GET /api/admin/tickets without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/admin/tickets without auth returns 401")


class TestWebhookSecurity:
    """Test Telegram webhook security"""
    
    def test_webhook_without_secret_returns_403(self):
        """POST /api/webhook/social-reply WITHOUT secret header returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            json={"message": {"text": "#1 test message", "chat": {"id": "123"}, "from": {"first_name": "Admin"}}}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ POST /api/webhook/social-reply without secret returns 403")
    
    def test_webhook_with_wrong_secret_returns_403(self):
        """POST /api/webhook/social-reply with wrong secret returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": "wrong_secret"},
            json={"message": {"text": "#1 test message", "chat": {"id": "123"}, "from": {"first_name": "Admin"}}}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ POST /api/webhook/social-reply with wrong secret returns 403")
    
    def test_webhook_with_correct_secret_no_ticket_id(self):
        """POST /api/webhook/social-reply WITH secret but text missing ticket ID returns ok + ignored=no_ticket_id"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": WEBHOOK_SECRET},
            json={"message": {"text": "just some random text without ticket id", "chat": {"id": "123"}, "from": {"first_name": "Admin"}}}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert data.get("ignored") == "no_ticket_id", f"Expected ignored=no_ticket_id, got {data}"
        print("✓ POST /api/webhook/social-reply with secret but no ticket ID returns ok + ignored=no_ticket_id")
    
    def test_webhook_with_correct_secret_nonexistent_ticket(self):
        """POST /api/webhook/social-reply for non-existent ticket returns ok + ignored=ticket_not_found"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": WEBHOOK_SECRET},
            json={"message": {"text": "#999999 test message for nonexistent ticket", "chat": {"id": "123"}, "from": {"first_name": "Admin"}}}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert data.get("ignored") == "ticket_not_found", f"Expected ignored=ticket_not_found, got {data}"
        print("✓ POST /api/webhook/social-reply for non-existent ticket returns ok + ignored=ticket_not_found")
    
    def test_webhook_with_no_text(self):
        """POST /api/webhook/social-reply with no text returns ok + ignored=no_text"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": WEBHOOK_SECRET},
            json={"message": {"chat": {"id": "123"}, "from": {"first_name": "Admin"}}}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert data.get("ignored") == "no_text", f"Expected ignored=no_text, got {data}"
        print("✓ POST /api/webhook/social-reply with no text returns ok + ignored=no_text")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_auth_me_returns_401(self):
        """GET /api/auth/me returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/auth/me returns 401 (auth gate intact)")
    
    def test_market_search_valorant_works(self):
        """GET /api/market/search/valorant returns 200"""
        response = requests.get(f"{BASE_URL}/api/market/search/valorant", params={"pmax": 100})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, f"Expected 'items' in response, got {data.keys()}"
        print(f"✓ GET /api/market/search/valorant returns 200 with {len(data.get('items', []))} items")
    
    def test_stats_live_works(self):
        """GET /api/stats/live returns 200"""
        response = requests.get(f"{BASE_URL}/api/stats/live")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "valorant" in data, f"Expected 'valorant' in response, got {data.keys()}"
        print(f"✓ GET /api/stats/live returns 200")


class TestAuthenticatedFlows:
    """Test authenticated flows - requires test user setup"""
    
    @pytest.fixture(scope="class")
    def test_session(self):
        """Create a test user and session directly via MongoDB"""
        import pymongo
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        # Create test user
        user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        user_email = f"test_{uuid.uuid4().hex[:6]}@test.local"
        session_token = f"test_session_{uuid.uuid4().hex}"
        
        # Insert user
        db.users.delete_many({"email": {"$regex": "^test_.*@test.local$"}})
        db.users.insert_one({
            "user_id": user_id,
            "email": user_email,
            "name": "Test User",
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Insert session
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db.user_sessions.delete_many({"user_id": user_id})
        db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {
            "user_id": user_id,
            "email": user_email,
            "session_token": session_token,
            "db": db
        }
        
        # Cleanup
        db.users.delete_many({"user_id": user_id})
        db.user_sessions.delete_many({"user_id": user_id})
        db.orders.delete_many({"user_id": user_id})
        db.tickets.delete_many({"user_id": user_id})
        db.wallets.delete_many({"user_id": user_id})
        client.close()
    
    @pytest.fixture(scope="class")
    def admin_session(self, test_session):
        """Create an admin user and session"""
        db = test_session["db"]
        
        admin_user_id = f"admin_user_{uuid.uuid4().hex[:8]}"
        admin_email = f"admin_{uuid.uuid4().hex[:6]}@test.local"
        admin_session_token = f"admin_session_{uuid.uuid4().hex}"
        
        # Insert admin user
        db.users.insert_one({
            "user_id": admin_user_id,
            "email": admin_email,
            "name": "Admin User",
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Set as admin in settings
        db.admin_settings.update_one(
            {"settings_id": "global"},
            {"$set": {"admin_email": admin_email}},
            upsert=True
        )
        
        # Insert session
        from datetime import timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db.user_sessions.insert_one({
            "user_id": admin_user_id,
            "session_token": admin_session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {
            "user_id": admin_user_id,
            "email": admin_email,
            "session_token": admin_session_token
        }
        
        # Cleanup
        db.users.delete_many({"user_id": admin_user_id})
        db.user_sessions.delete_many({"user_id": admin_user_id})
    
    def test_wallet_returns_balance_and_transactions(self, test_session):
        """GET /api/wallet returns balance_usd + transactions array (0 by default)"""
        response = requests.get(
            f"{BASE_URL}/api/wallet",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "balance_usd" in data, f"Expected 'balance_usd' in response, got {data.keys()}"
        assert "transactions" in data, f"Expected 'transactions' in response, got {data.keys()}"
        assert data["balance_usd"] == 0, f"Expected balance_usd=0, got {data['balance_usd']}"
        assert isinstance(data["transactions"], list), f"Expected transactions to be list, got {type(data['transactions'])}"
        print(f"✓ GET /api/wallet returns balance_usd={data['balance_usd']} + transactions array")
    
    def test_create_order_with_auth(self, test_session):
        """POST /api/orders creates order for authenticated user with dummy credentials + warranty"""
        # First get a real item_id from market
        market_resp = requests.get(f"{BASE_URL}/api/market/search/valorant", params={"pmax": 50})
        items = market_resp.json().get("items", [])
        if not items:
            pytest.skip("No items available in market to test order creation")
        
        item = items[0]
        item_id = item.get("item_id")
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            cookies={"session_token": test_session["session_token"]},
            json={"item_id": item_id, "category": "valorant"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify order structure
        assert "order_id" in data, f"Expected 'order_id' in response"
        assert "credentials" in data, f"Expected 'credentials' in response"
        assert "warranty_days" in data, f"Expected 'warranty_days' in response"
        assert "is_trusted_seller" in data, f"Expected 'is_trusted_seller' in response"
        assert data["user_id"] == test_session["user_id"], f"Expected user_id to match"
        
        # Verify credentials structure
        creds = data["credentials"]
        assert "login" in creds, f"Expected 'login' in credentials"
        assert "password" in creds, f"Expected 'password' in credentials"
        
        # Verify warranty logic (7 days if trusted, 0 if not)
        if data["is_trusted_seller"]:
            assert data["warranty_days"] == 7, f"Expected warranty_days=7 for trusted seller"
            assert data["warranty_expires_at"] is not None, f"Expected warranty_expires_at for trusted seller"
        else:
            assert data["warranty_days"] == 0, f"Expected warranty_days=0 for non-trusted seller"
        
        # Store order_id for later tests
        test_session["order_id"] = data["order_id"]
        print(f"✓ POST /api/orders creates order {data['order_id']} with credentials and warranty_days={data['warranty_days']}")
        return data
    
    def test_list_orders_excludes_credentials(self, test_session):
        """GET /api/orders returns user's orders list (credentials field excluded in list view)"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data, f"Expected 'orders' in response"
        
        orders = data["orders"]
        assert len(orders) > 0, f"Expected at least 1 order"
        
        # Verify credentials are excluded
        for order in orders:
            assert "credentials" not in order, f"Credentials should be excluded from list view"
            assert "order_id" in order, f"Expected 'order_id' in order"
        
        print(f"✓ GET /api/orders returns {len(orders)} orders (credentials excluded)")
    
    def test_reveal_credentials(self, test_session):
        """POST /api/orders/{id}/reveal returns credentials and increments reveals_count"""
        order_id = test_session.get("order_id")
        if not order_id:
            pytest.skip("No order_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/orders/{order_id}/reveal",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "credentials" in data, f"Expected 'credentials' in response"
        assert "reveals_count" in data, f"Expected 'reveals_count' in response"
        assert data["reveals_count"] >= 1, f"Expected reveals_count >= 1"
        
        creds = data["credentials"]
        assert "login" in creds, f"Expected 'login' in credentials"
        assert "password" in creds, f"Expected 'password' in credentials"
        
        print(f"✓ POST /api/orders/{order_id}/reveal returns credentials, reveals_count={data['reveals_count']}")
    
    def test_reveal_another_users_order_returns_404(self, test_session, admin_session):
        """POST /api/orders/{id}/reveal for another user's order returns 404"""
        order_id = test_session.get("order_id")
        if not order_id:
            pytest.skip("No order_id from previous test")
        
        # Try to reveal with admin session (different user)
        response = requests.post(
            f"{BASE_URL}/api/orders/{order_id}/reveal",
            cookies={"session_token": admin_session["session_token"]}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/orders/{order_id}/reveal for another user's order returns 404")
    
    def test_create_ticket(self, test_session):
        """POST /api/tickets creates ticket with seq ID, messages[0] is user msg, status=open"""
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            cookies={"session_token": test_session["session_token"]},
            json={
                "subject": "Test Support Ticket",
                "message": "This is a test support message for testing purposes."
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "ticket_id" in data, f"Expected 'ticket_id' in response"
        assert "seq" in data, f"Expected 'seq' in response"
        assert "messages" in data, f"Expected 'messages' in response"
        assert "status" in data, f"Expected 'status' in response"
        
        # Verify ticket structure
        assert data["status"] == "open", f"Expected status='open', got {data['status']}"
        assert len(data["messages"]) == 1, f"Expected 1 message, got {len(data['messages'])}"
        assert data["messages"][0]["from"] == "user", f"Expected first message from='user'"
        assert data["ticket_id"].startswith("TKT-"), f"Expected ticket_id to start with 'TKT-'"
        
        # Store for later tests
        test_session["ticket_id"] = data["ticket_id"]
        test_session["ticket_seq"] = data["seq"]
        print(f"✓ POST /api/tickets creates ticket {data['ticket_id']} (seq={data['seq']}) with status=open")
        return data
    
    def test_list_tickets(self, test_session):
        """GET /api/tickets lists user's own tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tickets" in data, f"Expected 'tickets' in response"
        tickets = data["tickets"]
        assert len(tickets) > 0, f"Expected at least 1 ticket"
        
        # Verify user's ticket is in list
        ticket_ids = [t["ticket_id"] for t in tickets]
        assert test_session.get("ticket_id") in ticket_ids, f"Expected user's ticket in list"
        
        print(f"✓ GET /api/tickets returns {len(tickets)} tickets")
    
    def test_get_ticket_full_thread(self, test_session):
        """GET /api/tickets/{id} returns full thread"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "ticket_id" in data, f"Expected 'ticket_id' in response"
        assert "messages" in data, f"Expected 'messages' in response"
        assert data["ticket_id"] == ticket_id, f"Expected ticket_id to match"
        
        print(f"✓ GET /api/tickets/{ticket_id} returns full thread with {len(data['messages'])} messages")
    
    def test_reply_to_ticket(self, test_session):
        """POST /api/tickets/{id}/messages appends user reply, returns message dict"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/messages",
            cookies={"session_token": test_session["session_token"]},
            json={"text": "This is a follow-up message from the user."}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, f"Expected 'message' in response"
        msg = data["message"]
        assert msg["from"] == "user", f"Expected message from='user'"
        assert "msg_id" in msg, f"Expected 'msg_id' in message"
        assert "created_at" in msg, f"Expected 'created_at' in message"
        
        # Store timestamp for poll test
        test_session["last_msg_time"] = msg["created_at"]
        print(f"✓ POST /api/tickets/{ticket_id}/messages appends user reply")
    
    def test_poll_ticket(self, test_session):
        """GET /api/tickets/{id}/poll?since=ISO returns new_messages after timestamp"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        # Poll with old timestamp to get all messages
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}/poll",
            cookies={"session_token": test_session["session_token"]},
            params={"since": "2020-01-01T00:00:00Z"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "status" in data, f"Expected 'status' in response"
        assert "new_messages" in data, f"Expected 'new_messages' in response"
        assert "total" in data, f"Expected 'total' in response"
        assert len(data["new_messages"]) >= 2, f"Expected at least 2 messages (original + reply)"
        
        print(f"✓ GET /api/tickets/{ticket_id}/poll returns {len(data['new_messages'])} new messages")
    
    def test_admin_list_tickets(self, admin_session):
        """GET /api/admin/tickets returns all tickets + counts (requires admin)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets",
            cookies={"session_token": admin_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tickets" in data, f"Expected 'tickets' in response"
        assert "counts" in data, f"Expected 'counts' in response"
        
        counts = data["counts"]
        assert "open" in counts, f"Expected 'open' in counts"
        assert "pending_user" in counts, f"Expected 'pending_user' in counts"
        assert "closed" in counts, f"Expected 'closed' in counts"
        
        print(f"✓ GET /api/admin/tickets returns {len(data['tickets'])} tickets with counts")
    
    def test_admin_reply_without_admin_returns_401_or_403(self, test_session):
        """POST /api/admin/tickets/{id}/reply without admin returns 401/403"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/tickets/{ticket_id}/reply",
            cookies={"session_token": test_session["session_token"]},
            json={"text": "Unauthorized admin reply attempt"}
        )
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/admin/tickets/{ticket_id}/reply without admin returns {response.status_code}")
    
    def test_admin_reply_to_ticket(self, test_session, admin_session):
        """POST /api/admin/tickets/{id}/reply with admin adds message"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/tickets/{ticket_id}/reply",
            cookies={"session_token": admin_session["session_token"]},
            json={"text": "This is an admin reply to your ticket."}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, f"Expected 'message' in response"
        msg = data["message"]
        assert msg["from"] == "admin", f"Expected message from='admin'"
        
        print(f"✓ POST /api/admin/tickets/{ticket_id}/reply adds admin message")
    
    def test_webhook_with_valid_ticket(self, test_session):
        """POST /api/webhook/social-reply WITH secret + '#seq message' parses ticket, appends admin message"""
        ticket_seq = test_session.get("ticket_seq")
        ticket_id = test_session.get("ticket_id")
        if not ticket_seq or not ticket_id:
            pytest.skip("No ticket from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": WEBHOOK_SECRET},
            json={
                "message": {
                    "text": f"#{ticket_seq} This is a webhook admin reply via Telegram",
                    "chat": {"id": "123"},
                    "from": {"first_name": "TelegramAdmin", "username": "admin_bot"}
                }
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert data.get("ticket_id") == ticket_id, f"Expected ticket_id={ticket_id}, got {data}"
        assert data.get("seq") == ticket_seq, f"Expected seq={ticket_seq}, got {data}"
        
        print(f"✓ POST /api/webhook/social-reply with #{ticket_seq} parses and appends admin message")
    
    def test_webhook_colon_format(self, test_session):
        """POST /api/webhook/social-reply WITH secret + 'seq: message' format also parsed correctly"""
        ticket_seq = test_session.get("ticket_seq")
        ticket_id = test_session.get("ticket_id")
        if not ticket_seq or not ticket_id:
            pytest.skip("No ticket from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/webhook/social-reply",
            headers={"x-telegram-bot-api-secret-token": WEBHOOK_SECRET},
            json={
                "message": {
                    "text": f"{ticket_seq}: This is a colon-format webhook reply",
                    "chat": {"id": "123"},
                    "from": {"first_name": "TelegramAdmin", "username": "admin_bot"}
                }
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        assert data.get("ticket_id") == ticket_id, f"Expected ticket_id={ticket_id}, got {data}"
        
        print(f"✓ POST /api/webhook/social-reply with '{ticket_seq}: message' format parsed correctly")
    
    def test_verify_webhook_messages_in_ticket(self, test_session):
        """Verify webhook messages appear in ticket thread"""
        ticket_id = test_session.get("ticket_id")
        if not ticket_id:
            pytest.skip("No ticket_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/{ticket_id}",
            cookies={"session_token": test_session["session_token"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        messages = data.get("messages", [])
        admin_messages = [m for m in messages if m.get("from") == "admin"]
        
        # Should have at least 3 admin messages (1 from admin_reply, 2 from webhook)
        assert len(admin_messages) >= 3, f"Expected at least 3 admin messages, got {len(admin_messages)}"
        
        # Check for telegram source
        telegram_messages = [m for m in admin_messages if m.get("source") == "telegram"]
        assert len(telegram_messages) >= 2, f"Expected at least 2 telegram messages, got {len(telegram_messages)}"
        
        print(f"✓ Ticket {ticket_id} has {len(admin_messages)} admin messages ({len(telegram_messages)} from telegram)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
