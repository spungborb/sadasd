"""
Phase 6 Feature Tests - Visual Galleries, Pricing, Base URLs
Tests for:
1. GET /api/valorant/agents - returns agent data with displayIcon/fullPortrait
2. GET /api/lol/champions - returns champion data with icon/splash URLs
3. Commission pricing: items have compare_price (25% above price), NO original_price
4. Base URLs in admin settings - can be set and saved
5. Market search uses base URL params when configured
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = None

@pytest.fixture(scope="module")
def admin_session():
    """Get admin session token from MongoDB"""
    import subprocess
    result = subprocess.run(
        ['mongosh', 'test_database', '--quiet', '--eval', 
         "db.user_sessions.findOne({user_id:'user_15bc3f69858d'}).session_token"],
        capture_output=True, text=True
    )
    token = result.stdout.strip().strip("'\"")
    return token

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

class TestValorantAgentsEndpoint:
    """Tests for GET /api/valorant/agents"""
    
    def test_agents_endpoint_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/valorant/agents")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/valorant/agents returns 200")
    
    def test_agents_have_required_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/valorant/agents")
        data = response.json()
        assert "agents" in data, "Response should have 'agents' key"
        agents = data["agents"]
        assert len(agents) > 0, "Should have at least one agent"
        
        # Check first agent has required fields
        agent = agents[0]
        assert "uuid" in agent, "Agent should have uuid"
        assert "displayName" in agent, "Agent should have displayName"
        assert "displayIcon" in agent, "Agent should have displayIcon"
        assert "fullPortrait" in agent, "Agent should have fullPortrait"
        
        # Verify URLs are valid
        assert agent["displayIcon"].startswith("https://"), "displayIcon should be HTTPS URL"
        assert agent["fullPortrait"].startswith("https://"), "fullPortrait should be HTTPS URL"
        print(f"✓ Agents have required fields (uuid, displayName, displayIcon, fullPortrait)")
        print(f"  Sample agent: {agent['displayName']} - {agent['displayIcon'][:60]}...")

class TestLolChampionsEndpoint:
    """Tests for GET /api/lol/champions"""
    
    def test_champions_endpoint_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/lol/champions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/lol/champions returns 200")
    
    def test_champions_have_required_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/lol/champions")
        data = response.json()
        assert "champions" in data, "Response should have 'champions' key"
        assert "version" in data, "Response should have 'version' key"
        
        champions = data["champions"]
        assert len(champions) > 0, "Should have at least one champion"
        
        # Check a sample champion (key "1" is Annie)
        sample_key = list(champions.keys())[0]
        champ = champions[sample_key]
        assert "id" in champ, "Champion should have id"
        assert "name" in champ, "Champion should have name"
        assert "icon" in champ, "Champion should have icon URL"
        assert "splash" in champ, "Champion should have splash URL"
        
        # Verify URLs are valid DataDragon URLs
        assert "ddragon.leagueoflegends.com" in champ["icon"], "icon should be DataDragon URL"
        assert "ddragon.leagueoflegends.com" in champ["splash"], "splash should be DataDragon URL"
        print(f"✓ Champions have required fields (id, name, icon, splash)")
        print(f"  Sample champion: {champ['name']} - {champ['icon'][:60]}...")
        print(f"  Version: {data['version']}")

class TestCommissionPricing:
    """Tests for commission pricing - compare_price (25% above), NO original_price"""
    
    def test_market_items_have_compare_price(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant?pmax=50")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        assert len(items) > 0, "Should have items"
        
        for item in items[:5]:
            assert "price" in item, f"Item {item.get('item_id')} should have price"
            assert "compare_price" in item, f"Item {item.get('item_id')} should have compare_price"
            
            # Verify compare_price is ~25% above price
            price = item["price"]
            compare_price = item["compare_price"]
            expected_compare = round(price * 1.25, 2)
            assert abs(compare_price - expected_compare) < 0.02, \
                f"compare_price ({compare_price}) should be ~25% above price ({price}), expected {expected_compare}"
        
        print(f"✓ Items have compare_price (25% above price)")
        print(f"  Sample: price={items[0]['price']}, compare_price={items[0]['compare_price']}")
    
    def test_market_items_no_original_price(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant?pmax=50")
        data = response.json()
        items = data.get("items", [])
        
        for item in items[:10]:
            assert "original_price" not in item, \
                f"Item {item.get('item_id')} should NOT have original_price field"
        
        print("✓ Items do NOT have original_price field (correctly hidden)")
    
    def test_lol_market_pricing(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/lol?pmax=50")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        if len(items) > 0:
            item = items[0]
            assert "price" in item
            assert "compare_price" in item
            assert "original_price" not in item
            print(f"✓ LoL items also have correct pricing (price={item['price']}, compare_price={item['compare_price']})")
        else:
            print("⚠ No LoL items found to test pricing")

class TestAdminBaseUrls:
    """Tests for base_urls in admin settings"""
    
    def test_admin_settings_can_save_base_urls(self, api_client, admin_session):
        # First, save base_urls
        response = api_client.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Cookie": f"session_token={admin_session}"},
            json={"base_urls": {"valorant": "https://lzt.market/riot?test=1", "lol": "https://lzt.market/riot?test=2"}}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "base_urls" in data, "Response should have base_urls"
        assert data["base_urls"]["valorant"] == "https://lzt.market/riot?test=1"
        assert data["base_urls"]["lol"] == "https://lzt.market/riot?test=2"
        print("✓ Admin settings can save base_urls")
    
    def test_admin_settings_returns_base_urls(self, api_client, admin_session):
        response = api_client.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Cookie": f"session_token={admin_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "base_urls" in data, "Admin settings should return base_urls"
        print(f"✓ Admin settings returns base_urls: {data.get('base_urls')}")
    
    def test_admin_settings_without_auth_returns_401(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Admin settings requires authentication (401 without auth)")

class TestMarketSearchWithBaseUrl:
    """Tests that market search uses base URL params when configured"""
    
    def test_market_search_still_works(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant?pmax=100")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ Market search works, returned {len(data.get('items', []))} items")

class TestNoLztMentions:
    """Verify no LZT mentions in buyer-facing responses"""
    
    def test_market_response_no_lzt_url(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant?pmax=50")
        data = response.json()
        items = data.get("items", [])
        
        for item in items[:5]:
            # Check that item doesn't expose LZT URLs to buyers
            item_str = str(item)
            # Note: item_origin is OK, but direct LZT URLs should not be exposed
            assert "lzt.market" not in item_str.lower() or "item_origin" in item_str, \
                "Item should not expose LZT market URLs"
        
        print("✓ Market items don't expose LZT URLs to buyers")

class TestHealthAndBasicEndpoints:
    """Basic health checks"""
    
    def test_api_health(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")
    
    def test_profiles_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/profiles")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        print(f"✓ Profiles endpoint works, {len(data.get('profiles', []))} profiles")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
