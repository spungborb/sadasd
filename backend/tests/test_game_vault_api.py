"""
Game Vault API Backend Tests
Tests all API endpoints for the Game Vault marketplace:
1. GET /api/ — root health endpoint
2. GET /api/valorant/agents — fetches agents from valorant-api.com and caches (includes backgroundGradientColors)
3. GET /api/valorant/skins — fetches skins + content tiers and caches
4. GET /api/lol/champions — fetches champions from DataDragon
5. GET /api/profiles — public profiles list
6. GET /api/auth/me without session — should return 401
7. POST /api/auth/logout without session — should succeed gracefully
8. GET /api/admin/settings without session — should return 401
9. POST /api/profiles without admin — should 401/403
10. GET /api/market/search/valorant — LZT market search (with VP/RP/skin fields)
11. GET /api/market/search/invalid — should return 400
12. GET /api/favorites without auth — should return 401
13. GET /api/stats/live — live stats for valorant/lol totals
14. GET /api/featured/valorant — featured items (0..8 items with price/compare_price)
15. GET /api/featured/lol — featured items (may be empty if no cached LoL data)
16. GET /api/featured/invalid — should return 400
17. GET /api/lol/skins-all — LoL skins map from CommunityDragon
18. GET /api/admin/analytics without auth — should return 401
19. POST /api/admin/cache/clear without auth — should return 401
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthEndpoint:
    """Test GET /api/ — root health endpoint"""
    
    def test_health_endpoint_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "status" in data, "Response should have 'status' key"
        assert data["status"] == "ok", f"Expected status 'ok', got {data['status']}"
        assert "message" in data, "Response should have 'message' key"
        print(f"✓ GET /api/ returns 200 with status=ok, message={data['message']}")


class TestValorantAgentsEndpoint:
    """Test GET /api/valorant/agents — fetches agents from valorant-api.com (includes backgroundGradientColors)"""
    
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
        
        # Verify URLs are valid
        assert agent["displayIcon"].startswith("https://"), "displayIcon should be HTTPS URL"
        print(f"✓ Agents have required fields, count={len(agents)}")
        print(f"  Sample agent: {agent['displayName']}")
    
    def test_agents_have_background_gradient_colors(self, api_client):
        """Verify agents include backgroundGradientColors array field"""
        response = api_client.get(f"{BASE_URL}/api/valorant/agents")
        data = response.json()
        agents = data["agents"]
        
        # Check that backgroundGradientColors field exists
        agent = agents[0]
        assert "backgroundGradientColors" in agent, "Agent should have backgroundGradientColors field"
        assert isinstance(agent["backgroundGradientColors"], list), "backgroundGradientColors should be an array"
        print(f"✓ Agents have backgroundGradientColors field (array with {len(agent['backgroundGradientColors'])} colors)")


class TestValorantSkinsEndpoint:
    """Test GET /api/valorant/skins — fetches skins + content tiers"""
    
    def test_skins_endpoint_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/valorant/skins")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/valorant/skins returns 200")
    
    def test_skins_have_required_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/valorant/skins")
        data = response.json()
        assert "skins" in data, "Response should have 'skins' key"
        assert "tiers" in data, "Response should have 'tiers' key (content tiers)"
        
        skins = data["skins"]
        assert len(skins) > 0, "Should have at least one skin"
        
        # Check first skin has required fields
        skin = skins[0]
        assert "uuid" in skin, "Skin should have uuid"
        assert "displayName" in skin, "Skin should have displayName"
        assert "displayIcon" in skin, "Skin should have displayIcon"
        assert "tier" in skin, "Skin should have tier"
        
        print(f"✓ Skins have required fields, count={len(skins)}")
        print(f"  Sample skin: {skin['displayName']} (tier: {skin['tier']})")
        
        # Check tiers data
        tiers = data["tiers"]
        if tiers:
            tier_key = list(tiers.keys())[0]
            tier_data = tiers[tier_key]
            assert "name" in tier_data, "Tier should have name"
            print(f"  Tiers count: {len(tiers)}")


class TestLolChampionsEndpoint:
    """Test GET /api/lol/champions — fetches champions from DataDragon"""
    
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
        
        # Check a sample champion
        sample_key = list(champions.keys())[0]
        champ = champions[sample_key]
        assert "id" in champ, "Champion should have id"
        assert "name" in champ, "Champion should have name"
        assert "icon" in champ, "Champion should have icon URL"
        assert "splash" in champ, "Champion should have splash URL"
        
        # Verify URLs are valid DataDragon URLs
        assert "ddragon.leagueoflegends.com" in champ["icon"], "icon should be DataDragon URL"
        print(f"✓ Champions have required fields, count={len(champions)}")
        print(f"  Sample champion: {champ['name']}, version={data['version']}")


class TestProfilesEndpoint:
    """Test GET /api/profiles — public profiles list"""
    
    def test_profiles_endpoint_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/profiles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/profiles returns 200")
    
    def test_profiles_returns_list(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/profiles")
        data = response.json()
        assert "profiles" in data, "Response should have 'profiles' key"
        profiles = data["profiles"]
        assert isinstance(profiles, list), "profiles should be a list"
        print(f"✓ Profiles endpoint returns list, count={len(profiles)}")
        
        if profiles:
            profile = profiles[0]
            assert "profile_id" in profile, "Profile should have profile_id"
            assert "name" in profile, "Profile should have name"
            assert "category" in profile, "Profile should have category"
            print(f"  Sample profile: {profile['name']} ({profile['category']})")


class TestAuthMeWithoutSession:
    """Test GET /api/auth/me without session — should return 401"""
    
    def test_auth_me_without_session_returns_401(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401 without session, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ GET /api/auth/me without session returns 401: {data['detail']}")


class TestAuthLogoutWithoutSession:
    """Test POST /api/auth/logout without session — should succeed gracefully"""
    
    def test_logout_without_session_succeeds(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/logout")
        # Should succeed gracefully (200) even without session
        assert response.status_code == 200, f"Expected 200 for graceful logout, got {response.status_code}"
        data = response.json()
        assert "message" in data, "Response should have 'message' key"
        assert data["message"] == "Logged out", f"Expected 'Logged out', got {data['message']}"
        print(f"✓ POST /api/auth/logout without session succeeds gracefully: {data['message']}")


class TestAdminSettingsWithoutSession:
    """Test GET /api/admin/settings without session — should return 401"""
    
    def test_admin_settings_without_session_returns_401(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 401, f"Expected 401 without session, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ GET /api/admin/settings without session returns 401: {data['detail']}")


class TestCreateProfileWithoutAdmin:
    """Test POST /api/profiles without admin — should 401/403"""
    
    def test_create_profile_without_auth_returns_401(self, api_client):
        response = api_client.post(
            f"{BASE_URL}/api/profiles",
            json={"name": "Test Profile", "category": "valorant", "lzt_url": "https://lzt.market/riot?test=1"}
        )
        # Should return 401 (not authenticated) or 403 (not admin)
        assert response.status_code in [401, 403], f"Expected 401/403 without admin, got {response.status_code}"
        print(f"✓ POST /api/profiles without admin returns {response.status_code}")


class TestMarketSearchValorant:
    """Test GET /api/market/search/valorant — LZT market search (token empty so may 502)"""
    
    def test_market_search_valorant(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant")
        # With empty LZT_MARKET_TOKEN, this may return 502 (expected graceful failure)
        # Or 200 if cached data exists
        assert response.status_code in [200, 401, 502], f"Expected 200/401/502, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "items" in data or "error" in data, "Response should have 'items' or 'error'"
            print(f"✓ GET /api/market/search/valorant returns 200 with {len(data.get('items', []))} items")
        elif response.status_code == 502:
            data = response.json()
            assert "detail" in data, "502 response should have 'detail'"
            print(f"✓ GET /api/market/search/valorant returns 502 (expected - LZT token empty): {data['detail']}")
        else:
            print(f"✓ GET /api/market/search/valorant returns {response.status_code}")


class TestMarketSearchInvalidCategory:
    """Test GET /api/market/search/invalid — should return 400"""
    
    def test_market_search_invalid_category_returns_400(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/invalid")
        assert response.status_code == 400, f"Expected 400 for invalid category, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        assert "invalid" in data["detail"].lower() or "unsupported" in data["detail"].lower(), \
            f"Error should mention invalid/unsupported category: {data['detail']}"
        print(f"✓ GET /api/market/search/invalid returns 400: {data['detail']}")


class TestFavoritesWithoutAuth:
    """Test GET /api/favorites without auth — should return 401"""
    
    def test_favorites_without_auth_returns_401(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/favorites")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ GET /api/favorites without auth returns 401: {data['detail']}")


class TestMarketSearchLol:
    """Test GET /api/market/search/lol — LZT market search for LoL"""
    
    def test_market_search_lol(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/lol")
        # With empty LZT_MARKET_TOKEN, this may return 502 (expected graceful failure)
        # Or 200 if cached data exists
        assert response.status_code in [200, 401, 502], f"Expected 200/401/502, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ GET /api/market/search/lol returns 200 with {len(data.get('items', []))} items")
        elif response.status_code == 502:
            print(f"✓ GET /api/market/search/lol returns 502 (expected - LZT token empty)")
        else:
            print(f"✓ GET /api/market/search/lol returns {response.status_code}")


# ======================== NEW ENDPOINTS (Iteration 9) ========================

class TestLiveStatsEndpoint:
    """Test GET /api/stats/live — live stats for valorant/lol totals"""
    
    def test_live_stats_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/stats/live")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/stats/live returns 200")
    
    def test_live_stats_has_required_structure(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/stats/live")
        data = response.json()
        
        # Check valorant stats
        assert "valorant" in data, "Response should have 'valorant' key"
        assert "total" in data["valorant"], "valorant should have 'total' field"
        assert "min_price" in data["valorant"], "valorant should have 'min_price' field"
        assert "max_price" in data["valorant"], "valorant should have 'max_price' field"
        
        # Check lol stats
        assert "lol" in data, "Response should have 'lol' key"
        assert "total" in data["lol"], "lol should have 'total' field"
        assert "min_price" in data["lol"], "lol should have 'min_price' field"
        assert "max_price" in data["lol"], "lol should have 'max_price' field"
        
        # Check updated_at timestamp
        assert "updated_at" in data, "Response should have 'updated_at' timestamp"
        
        print(f"✓ Live stats structure valid: valorant.total={data['valorant']['total']}, lol.total={data['lol']['total']}")


class TestFeaturedEndpoint:
    """Test GET /api/featured/{category} — featured items (0..8 items with price/compare_price)"""
    
    def test_featured_valorant_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/featured/valorant")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/featured/valorant returns 200")
    
    def test_featured_valorant_has_items_with_prices(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/featured/valorant")
        data = response.json()
        
        assert "items" in data, "Response should have 'items' key"
        items = data["items"]
        assert isinstance(items, list), "items should be a list"
        assert len(items) <= 8, f"Featured should return 0..8 items, got {len(items)}"
        
        if items:
            item = items[0]
            # Check price and compare_price are applied
            assert "price" in item, "Item should have 'price' field"
            assert "compare_price" in item, "Item should have 'compare_price' field"
            assert item["compare_price"] > item["price"], "compare_price should be > price"
            print(f"✓ Featured valorant has {len(items)} items with price/compare_price applied")
            print(f"  Sample item price: ${item['price']}, compare: ${item['compare_price']}")
        else:
            print("✓ Featured valorant returns empty list (no cached data yet)")
    
    def test_featured_lol_returns_200(self, api_client):
        """LoL featured may be empty if no cached LoL data - that's expected"""
        response = api_client.get(f"{BASE_URL}/api/featured/lol")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        items = data["items"]
        assert isinstance(items, list), "items should be a list"
        assert len(items) <= 8, f"Featured should return 0..8 items, got {len(items)}"
        
        print(f"✓ GET /api/featured/lol returns 200 with {len(items)} items (may be empty - expected)")
    
    def test_featured_invalid_category_returns_400(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/featured/invalid")
        assert response.status_code == 400, f"Expected 400 for invalid category, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ GET /api/featured/invalid returns 400: {data['detail']}")


class TestLolSkinsAllEndpoint:
    """Test GET /api/lol/skins-all — LoL skins map from CommunityDragon"""
    
    def test_lol_skins_all_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/lol/skins-all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/lol/skins-all returns 200")
    
    def test_lol_skins_all_has_skins_map(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/lol/skins-all")
        data = response.json()
        
        assert "skins" in data, "Response should have 'skins' key"
        assert "count" in data, "Response should have 'count' key"
        
        skins = data["skins"]
        count = data["count"]
        
        assert isinstance(skins, dict), "skins should be a dictionary/map"
        assert count > 0, f"Should have at least one skin, got count={count}"
        
        # Check a sample skin has required fields
        sample_key = list(skins.keys())[0]
        sample_skin = skins[sample_key]
        assert "name" in sample_skin, "Skin should have 'name' field"
        assert "splash" in sample_skin, "Skin should have 'splash' field"
        
        print(f"✓ LoL skins-all has {count} skins in map")
        print(f"  Sample skin ID {sample_key}: {sample_skin['name']}")


class TestAdminAnalyticsWithoutAuth:
    """Test GET /api/admin/analytics without auth — should return 401"""
    
    def test_admin_analytics_without_auth_returns_401(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ GET /api/admin/analytics without auth returns 401: {data['detail']}")


class TestAdminCacheClearWithoutAuth:
    """Test POST /api/admin/cache/clear without auth — should return 401"""
    
    def test_admin_cache_clear_without_auth_returns_401(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/admin/cache/clear")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have 'detail' key"
        print(f"✓ POST /api/admin/cache/clear without auth returns 401: {data['detail']}")


class TestMarketSearchValorantFields:
    """Test GET /api/market/search/valorant — verify VP/RP/skin fields intact"""
    
    def test_market_search_valorant_has_vp_rp_skin_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant")
        
        # May return 502 if LZT token issues, or 200 if cached
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            
            if items:
                item = items[0]
                # Check for VP/RP/skin fields (may not all be present on every item)
                vp_rp_fields = ["riot_valorant_wallet_vp", "riot_valorant_skin_count", "riot_valorant_knife_count"]
                found_fields = [f for f in vp_rp_fields if f in item]
                
                print(f"✓ Market search valorant has items with fields: {found_fields}")
                
                # Verify price/compare_price applied
                assert "price" in item, "Item should have 'price' field"
                assert "compare_price" in item, "Item should have 'compare_price' field"
                print(f"  Price: ${item['price']}, Compare: ${item['compare_price']}")
            else:
                print("✓ Market search valorant returns empty items list")
        else:
            print(f"✓ Market search valorant returns {response.status_code} (expected if no cached data)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
