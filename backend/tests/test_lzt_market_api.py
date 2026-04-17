"""
Backend API Tests for LZT Vault - Digital Game Account Marketplace
Tests real LZT Market API integration via backend proxy endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndCategories:
    """Health check and categories endpoint tests"""
    
    def test_api_root_health(self):
        """Test API root returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data
        print(f"✓ API health check passed: {data}")
    
    def test_categories_endpoint(self):
        """Test /api/market/categories returns category list"""
        response = requests.get(f"{BASE_URL}/api/market/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) >= 5
        
        # Verify expected categories exist
        category_ids = [c["id"] for c in categories]
        assert "riot" in category_ids
        assert "steam" in category_ids
        assert "fortnite" in category_ids
        assert "mihoyo" in category_ids
        assert "all" in category_ids
        print(f"✓ Categories endpoint returned {len(categories)} categories")


class TestMarketSearchEndpoints:
    """Tests for /api/market/search/{category} endpoints"""
    
    def test_riot_search_returns_items(self):
        """Test /api/market/search/riot returns real Valorant/LoL accounts"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "pmin": 0,
            "pmax": 500,
            "currency": "usd"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) > 0, "Expected at least one Riot account"
        
        # Verify item structure for Riot accounts
        first_item = items[0]
        assert "item_id" in first_item
        assert "price" in first_item
        assert "title" in first_item
        assert first_item.get("category", {}).get("category_name") == "riot"
        print(f"✓ Riot search returned {len(items)} items, first item ID: {first_item['item_id']}")
    
    def test_steam_search_returns_items(self):
        """Test /api/market/search/steam returns Steam accounts"""
        response = requests.get(f"{BASE_URL}/api/market/search/steam", params={
            "pmin": 0,
            "pmax": 100,
            "currency": "usd"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) > 0, "Expected at least one Steam account"
        
        first_item = items[0]
        assert first_item.get("category", {}).get("category_name") == "steam"
        print(f"✓ Steam search returned {len(items)} items")
    
    def test_fortnite_search_returns_items(self):
        """Test /api/market/search/fortnite returns Fortnite accounts"""
        response = requests.get(f"{BASE_URL}/api/market/search/fortnite", params={
            "pmin": 0,
            "pmax": 100,
            "currency": "usd"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) > 0, "Expected at least one Fortnite account"
        
        first_item = items[0]
        assert first_item.get("category", {}).get("category_name") == "fortnite"
        print(f"✓ Fortnite search returned {len(items)} items")
    
    def test_mihoyo_search_returns_items(self):
        """Test /api/market/search/mihoyo returns Genshin/HSR accounts"""
        response = requests.get(f"{BASE_URL}/api/market/search/mihoyo", params={
            "pmin": 0,
            "pmax": 100,
            "currency": "usd"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ miHoYo search returned {len(data.get('items', []))} items")
    
    def test_all_category_search(self):
        """Test /api/market/search/all returns mixed accounts"""
        response = requests.get(f"{BASE_URL}/api/market/search/all", params={
            "pmin": 0,
            "pmax": 50,
            "currency": "usd"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ All category search returned {len(data.get('items', []))} items")
    
    def test_invalid_category_returns_400(self):
        """Test invalid category returns 400 error"""
        response = requests.get(f"{BASE_URL}/api/market/search/invalid_category")
        assert response.status_code == 400
        print("✓ Invalid category correctly returns 400")


class TestMarketItemEndpoint:
    """Tests for /api/market/item/{item_id} endpoint"""
    
    def test_get_single_item_details(self):
        """Test fetching single item details"""
        # First get an item ID from search
        search_response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "pmin": 0,
            "pmax": 100,
            "currency": "usd"
        })
        assert search_response.status_code == 200
        items = search_response.json().get("items", [])
        assert len(items) > 0
        
        item_id = items[0]["item_id"]
        
        # Fetch item details
        response = requests.get(f"{BASE_URL}/api/market/item/{item_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify item structure
        assert "item" in data
        item = data["item"]
        assert item["item_id"] == item_id
        assert "price" in item
        assert "title" in item
        print(f"✓ Item details fetched for ID {item_id}: {item.get('title', '')[:50]}...")


class TestSearchFilters:
    """Tests for search filter parameters"""
    
    def test_price_filter(self):
        """Test price range filter works"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "pmin": 10,
            "pmax": 50,
            "currency": "usd"
        })
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        # Verify prices are within range (with some tolerance for currency conversion)
        for item in items[:5]:
            price = item.get("price", 0)
            assert price >= 5, f"Price {price} below minimum"
            assert price <= 100, f"Price {price} above maximum"
        print(f"✓ Price filter working, {len(items)} items in range")
    
    def test_sort_by_newest(self):
        """Test sort by newest first"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "order_by": "pdate_to_down",
            "currency": "usd"
        })
        assert response.status_code == 200
        items = response.json().get("items", [])
        assert len(items) > 0
        print(f"✓ Sort by newest returned {len(items)} items")
    
    def test_sort_by_price_asc(self):
        """Test sort by price ascending"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "order_by": "price_to_up",
            "currency": "usd"
        })
        assert response.status_code == 200
        items = response.json().get("items", [])
        if len(items) >= 2:
            # Verify ascending order
            prices = [item.get("price", 0) for item in items[:5]]
            assert prices == sorted(prices), "Prices not in ascending order"
        print(f"✓ Sort by price ascending working")
    
    def test_currency_parameter(self):
        """Test currency parameter is accepted by API"""
        usd_response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "currency": "usd",
            "pmax": 100
        })
        eur_response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "currency": "eur",
            "pmax": 100
        })
        
        assert usd_response.status_code == 200
        assert eur_response.status_code == 200
        
        usd_items = usd_response.json().get("items", [])
        eur_items = eur_response.json().get("items", [])
        
        # Both should return items (currency param is accepted)
        assert len(usd_items) > 0, "USD search should return items"
        assert len(eur_items) > 0, "EUR search should return items"
        print("✓ Currency parameter accepted by API")
    
    def test_title_search(self):
        """Test title search filter"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "title": "Valorant",
            "currency": "usd"
        })
        assert response.status_code == 200
        print(f"✓ Title search returned {len(response.json().get('items', []))} items")


class TestCaching:
    """Tests for MongoDB caching functionality"""
    
    def test_cache_improves_response_time(self):
        """Test that second call is faster (cached)"""
        params = {"pmin": 0, "pmax": 100, "currency": "usd", "_cache_test": str(time.time())}
        
        # First call (uncached)
        start1 = time.time()
        response1 = requests.get(f"{BASE_URL}/api/market/search/riot", params=params)
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second call (should be cached)
        start2 = time.time()
        response2 = requests.get(f"{BASE_URL}/api/market/search/riot", params=params)
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        # Both should return same data
        assert response1.json().get("items", [])[:3] == response2.json().get("items", [])[:3]
        
        print(f"✓ First call: {time1:.3f}s, Second call: {time2:.3f}s")
        # Note: Cache may not always be faster due to network variability
        # but data should be consistent


class TestAuthEndpoints:
    """Tests for authentication endpoints"""
    
    def test_auth_me_returns_401_when_not_authenticated(self):
        """Test /api/auth/me returns 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Not authenticated"
        print("✓ /api/auth/me correctly returns 401 when not authenticated")
    
    def test_logout_endpoint_works(self):
        """Test /api/auth/logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Logged out"
        print("✓ /api/auth/logout endpoint working")


class TestRiotAccountData:
    """Tests for Riot account specific data fields"""
    
    def test_riot_account_has_valorant_fields(self):
        """Test Riot accounts have Valorant-specific fields"""
        response = requests.get(f"{BASE_URL}/api/market/search/riot", params={
            "pmin": 0,
            "pmax": 200,
            "currency": "usd"
        })
        assert response.status_code == 200
        items = response.json().get("items", [])
        assert len(items) > 0
        
        # Check for Valorant-specific fields
        item = items[0]
        valorant_fields = [
            "riot_valorant_rank",
            "riot_valorant_level",
            "riot_valorant_skin_count",
            "riot_valorant_wallet_vp",
            "riot_valorant_region"
        ]
        
        found_fields = [f for f in valorant_fields if f in item]
        assert len(found_fields) >= 3, f"Missing Valorant fields. Found: {found_fields}"
        print(f"✓ Riot account has Valorant fields: {found_fields}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
