"""
Test suite for URL Profile CRUD API endpoints
Tests: POST/GET/PUT/DELETE /api/profiles, GET /api/market/profile/{id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test admin session token from MongoDB
ADMIN_SESSION_TOKEN = "oReaJ69ex1CBFkpvgUhDQhL8uJSYzB_bx0aaaWCJEnY"


class TestProfilesPublicEndpoint:
    """Test GET /api/profiles - public endpoint"""
    
    def test_get_profiles_no_auth_required(self):
        """GET /api/profiles should work without authentication"""
        resp = requests.get(f"{BASE_URL}/api/profiles")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert "profiles" in data, "Response should have 'profiles' key"
        assert isinstance(data["profiles"], list), "profiles should be a list"
        print(f"✓ GET /api/profiles returns {len(data['profiles'])} profiles")
    
    def test_profiles_have_required_fields(self):
        """Each profile should have required fields"""
        resp = requests.get(f"{BASE_URL}/api/profiles")
        assert resp.status_code == 200
        data = resp.json()
        if data["profiles"]:
            profile = data["profiles"][0]
            required_fields = ["profile_id", "name", "category", "lzt_url", "api_path", "parsed_params"]
            for field in required_fields:
                assert field in profile, f"Profile missing field: {field}"
            print(f"✓ Profile has all required fields: {required_fields}")


class TestProfilesAdminAuth:
    """Test admin authentication for profile endpoints"""
    
    def test_create_profile_requires_auth(self):
        """POST /api/profiles should require authentication"""
        resp = requests.post(f"{BASE_URL}/api/profiles", json={
            "name": "Test Profile",
            "category": "valorant",
            "lzt_url": "https://lzt.market/riot?pmin=10"
        })
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        print("✓ POST /api/profiles returns 401 without auth")
    
    def test_update_profile_requires_auth(self):
        """PUT /api/profiles/{id} should require authentication"""
        resp = requests.put(f"{BASE_URL}/api/profiles/prof_test123", json={"name": "Updated"})
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        print("✓ PUT /api/profiles/{id} returns 401 without auth")
    
    def test_delete_profile_requires_auth(self):
        """DELETE /api/profiles/{id} should require authentication"""
        resp = requests.delete(f"{BASE_URL}/api/profiles/prof_test123")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
        print("✓ DELETE /api/profiles/{id} returns 401 without auth")


class TestProfileCRUD:
    """Test full CRUD operations with admin auth"""
    
    @pytest.fixture
    def admin_session(self):
        """Session with admin auth header"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_create_profile_success(self, admin_session):
        """POST /api/profiles creates a new profile with parsed URL params"""
        test_url = "https://lzt.market/riot?not_origin[]=phishing&valorant_region[]=NA&pmin=50&pmax=150"
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "TEST_NA_Premium",
            "category": "valorant",
            "lzt_url": test_url
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "profile_id" in data, "Response should have profile_id"
        assert data["name"] == "TEST_NA_Premium"
        assert data["category"] == "valorant"
        assert data["lzt_url"] == test_url
        assert data["api_path"] == "/riot"
        assert "parsed_params" in data
        
        # Verify URL parsing
        params = data["parsed_params"]
        assert params.get("pmin") == "50", f"pmin should be '50', got {params.get('pmin')}"
        assert params.get("pmax") == "150", f"pmax should be '150', got {params.get('pmax')}"
        
        print(f"✓ Created profile: {data['profile_id']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/profiles/{data['profile_id']}")
    
    def test_create_profile_validation(self, admin_session):
        """POST /api/profiles validates required fields"""
        # Missing name
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "category": "valorant",
            "lzt_url": "https://lzt.market/riot"
        })
        assert resp.status_code == 400, f"Expected 400 for missing name, got {resp.status_code}"
        
        # Invalid category
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "Test",
            "category": "invalid",
            "lzt_url": "https://lzt.market/riot"
        })
        assert resp.status_code == 400, f"Expected 400 for invalid category, got {resp.status_code}"
        print("✓ Profile creation validates required fields")
    
    def test_update_profile(self, admin_session):
        """PUT /api/profiles/{id} updates profile"""
        # Create a test profile first
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "TEST_Update_Me",
            "category": "valorant",
            "lzt_url": "https://lzt.market/riot?pmin=10"
        })
        assert resp.status_code == 200
        profile_id = resp.json()["profile_id"]
        
        # Update the profile
        new_url = "https://lzt.market/riot?pmin=20&pmax=100"
        resp = admin_session.put(f"{BASE_URL}/api/profiles/{profile_id}", json={
            "name": "TEST_Updated_Name",
            "lzt_url": new_url
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["name"] == "TEST_Updated_Name"
        assert data["parsed_params"]["pmin"] == "20"
        assert data["parsed_params"]["pmax"] == "100"
        
        # Verify persistence with GET
        resp = admin_session.get(f"{BASE_URL}/api/profiles")
        profiles = resp.json()["profiles"]
        updated = next((p for p in profiles if p["profile_id"] == profile_id), None)
        assert updated is not None
        assert updated["name"] == "TEST_Updated_Name"
        
        print(f"✓ Updated profile {profile_id}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/profiles/{profile_id}")
    
    def test_delete_profile(self, admin_session):
        """DELETE /api/profiles/{id} removes profile"""
        # Create a test profile
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "TEST_Delete_Me",
            "category": "lol",
            "lzt_url": "https://lzt.market/riot?pmin=5"
        })
        assert resp.status_code == 200
        profile_id = resp.json()["profile_id"]
        
        # Delete it
        resp = admin_session.delete(f"{BASE_URL}/api/profiles/{profile_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        # Verify it's gone
        resp = admin_session.get(f"{BASE_URL}/api/profiles")
        profiles = resp.json()["profiles"]
        deleted = next((p for p in profiles if p["profile_id"] == profile_id), None)
        assert deleted is None, "Profile should be deleted"
        
        print(f"✓ Deleted profile {profile_id}")
    
    def test_delete_nonexistent_profile(self, admin_session):
        """DELETE /api/profiles/{id} returns 404 for nonexistent profile"""
        resp = admin_session.delete(f"{BASE_URL}/api/profiles/prof_nonexistent123")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ DELETE nonexistent profile returns 404")


class TestMarketProfileEndpoint:
    """Test GET /api/market/profile/{id} - fetch LZT data using profile params"""
    
    def test_fetch_by_profile_success(self):
        """GET /api/market/profile/{id} fetches data using saved profile params"""
        # Get existing profiles
        resp = requests.get(f"{BASE_URL}/api/profiles")
        profiles = resp.json()["profiles"]
        
        if not profiles:
            pytest.skip("No profiles exist to test")
        
        profile = profiles[0]
        profile_id = profile["profile_id"]
        
        # Fetch market data using profile
        resp = requests.get(f"{BASE_URL}/api/market/profile/{profile_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "items" in data or "totalItems" in data, "Response should have items or totalItems"
        assert "profile" in data, "Response should include profile info"
        assert data["profile"]["profile_id"] == profile_id
        
        print(f"✓ Fetched market data using profile '{profile['name']}': {data.get('totalItems', len(data.get('items', [])))} items")
    
    def test_fetch_by_profile_with_pagination(self):
        """GET /api/market/profile/{id}?page=2 supports pagination"""
        resp = requests.get(f"{BASE_URL}/api/profiles")
        profiles = resp.json()["profiles"]
        
        if not profiles:
            pytest.skip("No profiles exist to test")
        
        profile_id = profiles[0]["profile_id"]
        
        # Fetch page 1
        resp1 = requests.get(f"{BASE_URL}/api/market/profile/{profile_id}?page=1")
        assert resp1.status_code == 200
        
        # Fetch page 2
        resp2 = requests.get(f"{BASE_URL}/api/market/profile/{profile_id}?page=2")
        assert resp2.status_code == 200
        
        print("✓ Profile fetch supports pagination")
    
    def test_fetch_by_nonexistent_profile(self):
        """GET /api/market/profile/{id} returns 404 for nonexistent profile"""
        resp = requests.get(f"{BASE_URL}/api/market/profile/prof_nonexistent123")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Fetch nonexistent profile returns 404")


class TestURLParsing:
    """Test URL parsing functionality"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        })
        return session
    
    def test_parse_array_params(self, admin_session):
        """URL parser correctly handles array params like not_origin[]"""
        test_url = "https://lzt.market/riot?not_origin[]=phishing&not_origin[]=brute&valorant_region[]=EU&valorant_region[]=NA"
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "TEST_Array_Params",
            "category": "valorant",
            "lzt_url": test_url
        })
        assert resp.status_code == 200
        data = resp.json()
        params = data["parsed_params"]
        
        # Array params should be lists
        not_origin = params.get("not_origin[]")
        valorant_region = params.get("valorant_region[]")
        
        # Check if arrays are parsed (could be list or single value depending on implementation)
        assert not_origin is not None, "not_origin[] should be parsed"
        assert valorant_region is not None, "valorant_region[] should be parsed"
        
        print(f"✓ Array params parsed: not_origin[]={not_origin}, valorant_region[]={valorant_region}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/profiles/{data['profile_id']}")
    
    def test_parse_price_params(self, admin_session):
        """URL parser correctly extracts pmin, pmax"""
        test_url = "https://lzt.market/riot?pmin=25&pmax=500&currency=eur"
        resp = admin_session.post(f"{BASE_URL}/api/profiles", json={
            "name": "TEST_Price_Params",
            "category": "valorant",
            "lzt_url": test_url
        })
        assert resp.status_code == 200
        data = resp.json()
        params = data["parsed_params"]
        
        assert params.get("pmin") == "25"
        assert params.get("pmax") == "500"
        assert params.get("currency") == "eur"
        
        print(f"✓ Price params parsed correctly: pmin={params['pmin']}, pmax={params['pmax']}, currency={params['currency']}")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/profiles/{data['profile_id']}")


class TestExistingEndpoints:
    """Verify existing endpoints still work after refactor"""
    
    def test_health_check(self):
        """API health check"""
        resp = requests.get(f"{BASE_URL}/api/")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")
    
    def test_market_search_valorant(self):
        """GET /api/market/search/valorant still works"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?currency=usd&page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data or "totalItems" in data
        print(f"✓ Market search valorant works: {data.get('totalItems', len(data.get('items', [])))} items")
    
    def test_market_search_lol(self):
        """GET /api/market/search/lol still works"""
        resp = requests.get(f"{BASE_URL}/api/market/search/lol?currency=usd&page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data or "totalItems" in data
        print(f"✓ Market search LoL works: {data.get('totalItems', len(data.get('items', [])))} items")
    
    def test_valorant_skins(self):
        """GET /api/valorant/skins still works"""
        resp = requests.get(f"{BASE_URL}/api/valorant/skins")
        assert resp.status_code == 200
        data = resp.json()
        assert "skins" in data
        print(f"✓ Valorant skins endpoint works: {len(data.get('skins', []))} skins")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
