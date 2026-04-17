"""
Phase 3 LZT Vault Backend Tests
Tests: Categories, Commission, Skins API, Favorites, Admin, Advanced Filters
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategories:
    """Test that only Valorant and LoL categories are available"""
    
    def test_categories_only_valorant_and_lol(self):
        """Phase 3: Only Valorant and LoL categories should be returned"""
        resp = requests.get(f"{BASE_URL}/api/market/categories")
        assert resp.status_code == 200
        data = resp.json()
        categories = data.get("categories", [])
        assert len(categories) == 2, f"Expected 2 categories, got {len(categories)}"
        cat_ids = [c["id"] for c in categories]
        assert "valorant" in cat_ids, "Valorant category missing"
        assert "lol" in cat_ids, "LoL category missing"
        print(f"✓ Categories test passed: {cat_ids}")


class TestCommissionMarkup:
    """Test 100% commission markup (price x2)"""
    
    def test_valorant_commission_applied(self):
        """Prices should be doubled with original_price preserved"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?pmin=0&pmax=100&page=1")
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("items", [])
        assert len(items) > 0, "No items returned"
        
        for item in items[:5]:  # Check first 5 items
            price = item.get("price", 0)
            original = item.get("original_price", 0)
            commission_pct = item.get("commission_pct", 0)
            
            assert original > 0, f"Item {item.get('item_id')} missing original_price"
            assert commission_pct == 100, f"Expected 100% commission, got {commission_pct}%"
            expected_price = round(original * 2, 2)
            assert abs(price - expected_price) < 0.01, f"Price {price} != expected {expected_price} (original: {original})"
            print(f"✓ Item {item.get('item_id')}: ${original} -> ${price} (100% markup)")
    
    def test_lol_commission_applied(self):
        """LoL prices should also have commission applied"""
        resp = requests.get(f"{BASE_URL}/api/market/search/lol?pmin=0&pmax=100&page=1")
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("items", [])
        assert len(items) > 0, "No LoL items returned"
        
        item = items[0]
        assert "original_price" in item, "original_price field missing"
        assert "commission_pct" in item, "commission_pct field missing"
        print(f"✓ LoL commission test passed")


class TestDefaultRegion:
    """Test default region setting in API response"""
    
    def test_default_region_returned(self):
        """API should return default_region field"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert "default_region" in data, "default_region field missing from response"
        default_region = data.get("default_region")
        assert default_region in ["eu", "na", "ap", "kr", "br", "latam", "all"], f"Invalid default_region: {default_region}"
        print(f"✓ Default region: {default_region}")


class TestValorantSkins:
    """Test Valorant skins API from valorant-api.com"""
    
    def test_skins_endpoint_returns_data(self):
        """Skins endpoint should return skin data with tiers"""
        resp = requests.get(f"{BASE_URL}/api/valorant/skins")
        assert resp.status_code == 200
        data = resp.json()
        
        skins = data.get("skins", [])
        tiers = data.get("tiers", {})
        
        assert len(skins) > 100, f"Expected 100+ skins, got {len(skins)}"
        print(f"✓ Skins API returned {len(skins)} skins")
        
        # Check skin structure
        skin = skins[0]
        assert "uuid" in skin, "Skin missing uuid"
        assert "displayName" in skin, "Skin missing displayName"
        assert "displayIcon" in skin, "Skin missing displayIcon"
        assert "tier" in skin, "Skin missing tier"
        print(f"✓ Skin structure valid: {skin.get('displayName')}")
        
        # Check tiers
        assert len(tiers) > 0, "No tiers returned"
        print(f"✓ Tiers returned: {len(tiers)} tiers")


class TestAdvancedFilters:
    """Test advanced Valorant filters (rank range, min skins, knife)"""
    
    def test_rank_range_filter(self):
        """rmin/rmax params should be accepted"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?rmin=10&rmax=20&page=1")
        assert resp.status_code == 200
        data = resp.json()
        # API accepts params - filtering may be done client-side
        print(f"✓ Rank range filter accepted, returned {len(data.get('items', []))} items")
    
    def test_min_skins_filter(self):
        """valorant_smin param should be accepted"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?valorant_smin=10&page=1")
        assert resp.status_code == 200
        data = resp.json()
        print(f"✓ Min skins filter accepted, returned {len(data.get('items', []))} items")
    
    def test_knife_filter(self):
        """knife param should be accepted"""
        resp = requests.get(f"{BASE_URL}/api/market/search/valorant?knife=1&page=1")
        assert resp.status_code == 200
        data = resp.json()
        print(f"✓ Knife filter accepted, returned {len(data.get('items', []))} items")


class TestAuthEndpoints:
    """Test authentication endpoints return proper errors for unauthenticated users"""
    
    def test_admin_settings_requires_auth(self):
        """Admin settings should return 401 for non-authenticated users"""
        resp = requests.get(f"{BASE_URL}/api/admin/settings")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Admin settings returns 401 for unauthenticated users")
    
    def test_favorites_requires_auth(self):
        """Favorites GET should return 401 for non-authenticated users"""
        resp = requests.get(f"{BASE_URL}/api/favorites")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Favorites GET returns 401 for unauthenticated users")
    
    def test_favorites_add_requires_auth(self):
        """Favorites POST should return 401 for non-authenticated users"""
        resp = requests.post(f"{BASE_URL}/api/favorites/12345")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Favorites POST returns 401 for unauthenticated users")
    
    def test_favorites_delete_requires_auth(self):
        """Favorites DELETE should return 401 for non-authenticated users"""
        resp = requests.delete(f"{BASE_URL}/api/favorites/12345")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Favorites DELETE returns 401 for unauthenticated users")
    
    def test_favorites_sync_requires_auth(self):
        """Favorites sync should return 401 for non-authenticated users"""
        resp = requests.post(f"{BASE_URL}/api/favorites/sync", json={"items": [1, 2, 3]})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Favorites sync returns 401 for unauthenticated users")
    
    def test_auth_me_requires_auth(self):
        """Auth me should return 401 for non-authenticated users"""
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Auth me returns 401 for unauthenticated users")


class TestMarketItemDetails:
    """Test single item endpoint with commission"""
    
    def test_item_details_with_commission(self):
        """Single item should have commission applied"""
        # First get an item ID from search
        search_resp = requests.get(f"{BASE_URL}/api/market/search/valorant?page=1")
        assert search_resp.status_code == 200
        items = search_resp.json().get("items", [])
        assert len(items) > 0, "No items to test"
        
        item_id = items[0].get("item_id")
        resp = requests.get(f"{BASE_URL}/api/market/item/{item_id}")
        assert resp.status_code == 200
        data = resp.json()
        
        item = data.get("item", data)
        assert "original_price" in item, "Item missing original_price"
        print(f"✓ Item {item_id} details returned with commission")


class TestPagination:
    """Test pagination still works with new features"""
    
    def test_pagination_works(self):
        """Pagination should work correctly"""
        resp1 = requests.get(f"{BASE_URL}/api/market/search/valorant?page=1")
        resp2 = requests.get(f"{BASE_URL}/api/market/search/valorant?page=2")
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        
        items1 = resp1.json().get("items", [])
        items2 = resp2.json().get("items", [])
        
        assert len(items1) > 0, "Page 1 has no items"
        assert len(items2) > 0, "Page 2 has no items"
        
        # Items should be different
        ids1 = set(i.get("item_id") for i in items1)
        ids2 = set(i.get("item_id") for i in items2)
        assert ids1 != ids2, "Page 1 and 2 have same items"
        print(f"✓ Pagination works: Page 1 has {len(items1)} items, Page 2 has {len(items2)} items")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """API should be healthy"""
        resp = requests.get(f"{BASE_URL}/api/")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
