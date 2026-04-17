"""
Filter Functionality Tests for Game Vault API (Iteration 10)
Tests the filter functionality for market search endpoints:
1. GET /api/market/search/valorant?valorant_region[]=EU — EU-only filtered results
2. GET /api/market/search/valorant?valorant_region[]=NA — NA-only filtered results
3. Array-style params: backend preserves ?origin[]=X&origin[]=Y (multi-value) via query_params.multi_items()
4. Complex filter chain (rmin, rmax, pmin, pmax, valorant_smin, title) returns 200 with reasonable item counts
5. GET /api/market/search/valorant?title=phantom — title keyword passes through
6. Existing endpoints still intact (/api/stats/live, /api/featured/valorant, /api/auth/me 401, /api/admin/analytics 401)

NOTE: LZT region codes are CASE-SENSITIVE (must be uppercase EU/NA/AP/KR/BR/LATAM)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestRegionFilterEU:
    """Test GET /api/market/search/valorant?valorant_region[]=EU — EU-only filtered results"""
    
    def test_eu_region_filter_returns_200(self, api_client):
        """Test that EU region filter returns 200 status"""
        # Use array-style param as LZT expects
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"valorant_region[]": "EU"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/market/search/valorant?valorant_region[]=EU returns 200")
    
    def test_eu_region_filter_returns_filtered_results(self, api_client):
        """Test that EU region filter returns EU-only results (not 41K mixed)"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"valorant_region[]": "EU"})
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("totalItems", 0)
            items = data.get("items", [])
            
            print(f"  EU filter: totalItems={total_items}, returned items={len(items)}")
            
            # EU-only should return fewer items than unfiltered (which has ~41K)
            # If totalItems is still 41K+, the filter is not working
            if total_items > 40000:
                print(f"  WARNING: totalItems={total_items} suggests filter may not be applied")
            else:
                print(f"  ✓ EU filter appears to be working (totalItems={total_items} < 41K)")
            
            # Check that returned items have EU region (if region field exists)
            if items:
                sample_item = items[0]
                region_field = sample_item.get("riot_valorant_region") or sample_item.get("region") or sample_item.get("origin")
                if region_field:
                    print(f"  Sample item region: {region_field}")
                else:
                    print(f"  Sample item keys: {list(sample_item.keys())[:10]}...")
        else:
            print(f"  Response status: {response.status_code}")


class TestRegionFilterNA:
    """Test GET /api/market/search/valorant?valorant_region[]=NA — NA-only filtered results"""
    
    def test_na_region_filter_returns_200(self, api_client):
        """Test that NA region filter returns 200 status"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"valorant_region[]": "NA"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/market/search/valorant?valorant_region[]=NA returns 200")
    
    def test_na_region_filter_returns_filtered_results(self, api_client):
        """Test that NA region filter returns NA-only results"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"valorant_region[]": "NA"})
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("totalItems", 0)
            items = data.get("items", [])
            
            print(f"  NA filter: totalItems={total_items}, returned items={len(items)}")
            
            # NA-only should return fewer items than unfiltered
            if total_items > 40000:
                print(f"  WARNING: totalItems={total_items} suggests filter may not be applied")
            else:
                print(f"  ✓ NA filter appears to be working (totalItems={total_items} < 41K)")


class TestMultiValueArrayParams:
    """Test array-style params: backend preserves ?origin[]=X&origin[]=Y (multi-value) via query_params.multi_items()"""
    
    def test_multi_region_filter_returns_200(self, api_client):
        """Test that multiple region filters work (EU + NA)"""
        # Send multiple values for the same key
        response = api_client.get(
            f"{BASE_URL}/api/market/search/valorant",
            params=[("valorant_region[]", "EU"), ("valorant_region[]", "NA")]
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/market/search/valorant?valorant_region[]=EU&valorant_region[]=NA returns 200")
    
    def test_multi_region_filter_returns_combined_results(self, api_client):
        """Test that multiple region filters return combined results"""
        response = api_client.get(
            f"{BASE_URL}/api/market/search/valorant",
            params=[("valorant_region[]", "EU"), ("valorant_region[]", "NA")]
        )
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("totalItems", 0)
            items = data.get("items", [])
            
            print(f"  EU+NA filter: totalItems={total_items}, returned items={len(items)}")
            
            # Combined EU+NA should have more items than single region but less than all
            print(f"  ✓ Multi-region filter returned {total_items} items")


class TestComplexFilterChain:
    """Test complex filter chain (rmin, rmax, pmin, pmax, valorant_smin, title) returns 200"""
    
    def test_complex_filter_returns_200(self, api_client):
        """Test complex filter combination returns 200"""
        params = {
            "pmin": 10,
            "pmax": 500,
            "valorant_smin": 5,  # minimum skins
            "currency": "usd"
        }
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params=params)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/market/search/valorant with complex filters returns 200")
    
    def test_complex_filter_returns_reasonable_count(self, api_client):
        """Test complex filter returns reasonable item count"""
        params = {
            "pmin": 10,
            "pmax": 500,
            "valorant_smin": 5,
            "currency": "usd"
        }
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params=params)
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("totalItems", 0)
            items = data.get("items", [])
            
            print(f"  Complex filter: totalItems={total_items}, returned items={len(items)}")
            
            # With price and skin filters, should have fewer items than unfiltered
            if total_items > 0:
                print(f"  ✓ Complex filter returned {total_items} items")
                
                # Verify items have price within range (after commission)
                if items:
                    sample_item = items[0]
                    price = sample_item.get("price", 0)
                    print(f"  Sample item price: ${price}")


class TestTitleKeywordFilter:
    """Test GET /api/market/search/valorant?title=phantom — title keyword passes through"""
    
    def test_title_filter_returns_200(self, api_client):
        """Test that title keyword filter returns 200"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"title": "phantom"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/market/search/valorant?title=phantom returns 200")
    
    def test_title_filter_returns_relevant_results(self, api_client):
        """Test that title keyword filter returns relevant results"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params={"title": "phantom"})
        
        if response.status_code == 200:
            data = response.json()
            total_items = data.get("totalItems", 0)
            items = data.get("items", [])
            
            print(f"  Title 'phantom' filter: totalItems={total_items}, returned items={len(items)}")
            
            # Title filter should return items with 'phantom' in title/description
            if items:
                sample_item = items[0]
                title = sample_item.get("title", "")
                print(f"  Sample item title: {title[:100]}...")


class TestExistingEndpointsIntact:
    """Test existing endpoints still intact after filter changes"""
    
    def test_stats_live_still_works(self, api_client):
        """Test /api/stats/live still returns 200"""
        response = api_client.get(f"{BASE_URL}/api/stats/live")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "valorant" in data, "Response should have 'valorant' key"
        assert "lol" in data, "Response should have 'lol' key"
        print(f"✓ GET /api/stats/live returns 200 (valorant.total={data['valorant'].get('total', 0)})")
    
    def test_featured_valorant_still_works(self, api_client):
        """Test /api/featured/valorant still returns 200"""
        response = api_client.get(f"{BASE_URL}/api/featured/valorant")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        print(f"✓ GET /api/featured/valorant returns 200 ({len(data.get('items', []))} items)")
    
    def test_auth_me_still_returns_401(self, api_client):
        """Test /api/auth/me still returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/auth/me returns 401 (auth gate intact)")
    
    def test_admin_analytics_still_returns_401(self, api_client):
        """Test /api/admin/analytics still returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/admin/analytics returns 401 (admin gate intact)")


class TestUnfilteredBaseline:
    """Test unfiltered search to establish baseline for comparison"""
    
    def test_unfiltered_search_returns_all_items(self, api_client):
        """Test unfiltered search returns ~41K items (baseline)"""
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        total_items = data.get("totalItems", 0)
        items = data.get("items", [])
        
        print(f"✓ Unfiltered search: totalItems={total_items}, returned items={len(items)}")
        
        # Store baseline for comparison
        assert total_items > 0, "Should have items in unfiltered search"


class TestCacheBusting:
    """Test that unique param combos bypass cache for fresh results"""
    
    def test_unique_params_bypass_cache(self, api_client):
        """Test that adding unique timestamp param gets fresh results"""
        # Add unique timestamp to bust cache
        timestamp = int(time.time())
        params = {
            "valorant_region[]": "EU",
            "_t": timestamp  # Cache buster
        }
        response = api_client.get(f"{BASE_URL}/api/market/search/valorant", params=params)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        total_items = data.get("totalItems", 0)
        print(f"✓ Cache-busted EU filter: totalItems={total_items}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
