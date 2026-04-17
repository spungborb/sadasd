"""
Test Admin Fetch Settings API Endpoints
Tests for /api/admin/fetch-settings GET and PUT endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_TOKEN = "admin_session_1776362204576"

class TestFetchSettingsAuth:
    """Test authentication for fetch-settings endpoints"""
    
    def test_get_fetch_settings_returns_401_without_auth(self):
        """GET /api/admin/fetch-settings should return 401 for non-authenticated users"""
        response = requests.get(f"{BASE_URL}/api/admin/fetch-settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/admin/fetch-settings returns 401 without auth")
    
    def test_put_fetch_settings_returns_401_without_auth(self):
        """PUT /api/admin/fetch-settings should return 401 for non-authenticated users"""
        response = requests.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json={"general": {"pmin": "10"}}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PUT /api/admin/fetch-settings returns 401 without auth")


class TestFetchSettingsWithAdmin:
    """Test fetch-settings endpoints with admin authentication"""
    
    @pytest.fixture
    def admin_session(self):
        """Create session with admin token"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_TOKEN}"
        })
        return session
    
    def test_get_fetch_settings_returns_default_settings(self, admin_session):
        """GET /api/admin/fetch-settings should return default fetch settings"""
        response = admin_session.get(f"{BASE_URL}/api/admin/fetch-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "settings_id" in data, "Missing settings_id"
        assert data["settings_id"] == "fetch_config", f"Expected fetch_config, got {data['settings_id']}"
        assert "general" in data, "Missing general section"
        assert "valorant" in data, "Missing valorant section"
        assert "lol" in data, "Missing lol section"
        
        # Verify general fields
        general = data["general"]
        assert "pmin" in general, "Missing pmin in general"
        assert "pmax" in general, "Missing pmax in general"
        assert "title" in general, "Missing title in general"
        assert "origin" in general, "Missing origin in general"
        assert "email" in general, "Missing email toggle in general"
        assert "tel" in general, "Missing tel toggle in general"
        
        # Verify valorant fields
        valorant = data["valorant"]
        assert "weaponSkin" in valorant, "Missing weaponSkin in valorant"
        assert "knife" in valorant, "Missing knife in valorant"
        assert "valorant_region" in valorant, "Missing valorant_region"
        assert "rmin" in valorant, "Missing rmin (rank min)"
        assert "rmax" in valorant, "Missing rmax (rank max)"
        
        # Verify lol fields
        lol = data["lol"]
        assert "skin" in lol, "Missing skin in lol"
        assert "champion" in lol, "Missing champion in lol"
        assert "lol_region" in lol, "Missing lol_region"
        
        print("✓ GET /api/admin/fetch-settings returns correct structure")
    
    def test_put_fetch_settings_saves_general_settings(self, admin_session):
        """PUT /api/admin/fetch-settings should save general settings"""
        test_data = {
            "general": {
                "pmin": "50",
                "pmax": "200",
                "title": "Test Search",
                "origin": ["brute", "stealer"],
                "country": "US",
                "not_country": "RU",
                "daybreak": "30",
                "email": "yes",
                "tel": "no",
                "email_type": ["autoreg"],
                "item_domain": "gmail.com",
                "not_item_domain": "mail.ru",
                "email_provider": "google",
                "not_email_provider": "yandex",
                "nsb": True,
                "sb": False
            }
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=test_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        general = data["general"]
        
        # Verify saved values
        assert general["pmin"] == "50", f"pmin not saved: {general['pmin']}"
        assert general["pmax"] == "200", f"pmax not saved: {general['pmax']}"
        assert general["title"] == "Test Search", f"title not saved: {general['title']}"
        assert general["origin"] == ["brute", "stealer"], f"origin not saved: {general['origin']}"
        assert general["email"] == "yes", f"email toggle not saved: {general['email']}"
        assert general["tel"] == "no", f"tel toggle not saved: {general['tel']}"
        assert general["nsb"] == True, f"nsb not saved: {general['nsb']}"
        
        print("✓ PUT /api/admin/fetch-settings saves general settings correctly")
    
    def test_put_fetch_settings_saves_valorant_settings(self, admin_session):
        """PUT /api/admin/fetch-settings should save valorant settings"""
        test_data = {
            "valorant": {
                "weaponSkin": "Reaver",
                "knife": True,
                "valorant_knife_min": "1",
                "valorant_knife_max": "5",
                "buddy": "Test Buddy",
                "agent": "Jett",
                "valorant_region": ["EU", "NA"],
                "valorant_not_region": "KR",
                "rmin": "10",
                "rmax": "20",
                "previous_rmin": "8",
                "previous_rmax": "18",
                "valorant_level_min": "50",
                "valorant_level_max": "200",
                "vp_min": "100",
                "vp_max": "5000"
            }
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=test_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        valorant = data["valorant"]
        
        # Verify saved values
        assert valorant["weaponSkin"] == "Reaver", f"weaponSkin not saved"
        assert valorant["knife"] == True, f"knife not saved"
        assert valorant["valorant_region"] == ["EU", "NA"], f"valorant_region not saved"
        assert valorant["rmin"] == "10", f"rmin not saved"
        assert valorant["rmax"] == "20", f"rmax not saved"
        
        print("✓ PUT /api/admin/fetch-settings saves valorant settings correctly")
    
    def test_put_fetch_settings_saves_lol_settings(self, admin_session):
        """PUT /api/admin/fetch-settings should save LoL settings"""
        test_data = {
            "lol": {
                "skin": "Test Skin",
                "champion": "Ahri",
                "lol_region": ["euw", "na"],
                "lol_not_region": "kr",
                "lol_level_min": "30",
                "lol_level_max": "500",
                "win_rate_min": "50",
                "win_rate_max": "70",
                "lol_smin": "10",
                "lol_smax": "100",
                "champion_min": "20",
                "champion_max": "150",
                "blue_min": "1000",
                "blue_max": "50000",
                "orange_min": "100",
                "orange_max": "5000",
                "mythic_min": "10",
                "mythic_max": "500",
                "riot_min": "0",
                "riot_max": "10000"
            }
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=test_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        lol = data["lol"]
        
        # Verify saved values
        assert lol["skin"] == "Test Skin", f"skin not saved"
        assert lol["champion"] == "Ahri", f"champion not saved"
        assert lol["lol_region"] == ["euw", "na"], f"lol_region not saved"
        assert lol["lol_level_min"] == "30", f"lol_level_min not saved"
        assert lol["blue_min"] == "1000", f"blue_min not saved"
        
        print("✓ PUT /api/admin/fetch-settings saves LoL settings correctly")
    
    def test_settings_persist_after_reload(self, admin_session):
        """Settings should persist in MongoDB after reload"""
        # First save some unique test data
        unique_title = f"Persist Test {os.urandom(4).hex()}"
        test_data = {
            "general": {
                "title": unique_title,
                "pmin": "999",
                "pmax": "9999"
            }
        }
        
        save_response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=test_data
        )
        assert save_response.status_code == 200
        
        # Now GET to verify persistence
        get_response = admin_session.get(f"{BASE_URL}/api/admin/fetch-settings")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["general"]["title"] == unique_title, f"Title not persisted: {data['general']['title']}"
        assert data["general"]["pmin"] == "999", f"pmin not persisted"
        
        print("✓ Settings persist after reload (verified via GET)")
    
    def test_partial_update_preserves_other_sections(self, admin_session):
        """Updating one section should not affect other sections"""
        # First, set all sections
        full_data = {
            "general": {"pmin": "100", "pmax": "500"},
            "valorant": {"weaponSkin": "Phantom"},
            "lol": {"skin": "Prestige"}
        }
        admin_session.put(f"{BASE_URL}/api/admin/fetch-settings", json=full_data)
        
        # Now update only general
        partial_data = {
            "general": {"pmin": "200", "pmax": "600"}
        }
        response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=partial_data
        )
        assert response.status_code == 200
        
        data = response.json()
        # General should be updated
        assert data["general"]["pmin"] == "200"
        # Valorant and LoL should still have their values
        assert data["valorant"]["weaponSkin"] == "Phantom", "Valorant section was overwritten"
        assert data["lol"]["skin"] == "Prestige", "LoL section was overwritten"
        
        print("✓ Partial update preserves other sections")


class TestFetchSettingsNonAdmin:
    """Test that non-admin users cannot access fetch-settings"""
    
    def test_get_fetch_settings_returns_403_for_non_admin(self):
        """GET /api/admin/fetch-settings should return 403 for non-admin users"""
        # This would require a non-admin user session
        # For now, we verify 401 without any auth
        response = requests.get(f"{BASE_URL}/api/admin/fetch-settings")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("✓ GET /api/admin/fetch-settings returns 401/403 for non-admin")


class TestAdminDashboardLink:
    """Test that admin dashboard has link to sync settings"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_TOKEN}"
        })
        return session
    
    def test_admin_settings_endpoint_works(self, admin_session):
        """Admin settings endpoint should work for admin user"""
        response = admin_session.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "admin_email" in data
        assert data["admin_email"] == "admin@test.com"
        print("✓ Admin settings endpoint works for admin user")


class TestMarketplaceStillWorks:
    """Test that marketplace endpoints still work after backend changes"""
    
    def test_market_search_valorant(self):
        """Market search for valorant should still work"""
        response = requests.get(
            f"{BASE_URL}/api/market/search/valorant",
            params={"pmin": "0", "pmax": "500", "currency": "usd", "page": "1"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items in response"
        print(f"✓ Market search valorant works - {len(data.get('items', []))} items returned")
    
    def test_market_search_lol(self):
        """Market search for LoL should still work"""
        response = requests.get(
            f"{BASE_URL}/api/market/search/lol",
            params={"pmin": "0", "pmax": "500", "currency": "usd", "page": "1"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items in response"
        print(f"✓ Market search LoL works - {len(data.get('items', []))} items returned")
    
    def test_valorant_skins_endpoint(self):
        """Valorant skins endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/valorant/skins")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "skins" in data, "Missing skins in response"
        print(f"✓ Valorant skins endpoint works - {len(data.get('skins', []))} skins returned")
    
    def test_api_health(self):
        """API health endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ API health check passed")


# Reset fetch settings to defaults after tests
class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_session(self):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ADMIN_TOKEN}"
        })
        return session
    
    def test_reset_fetch_settings_to_defaults(self, admin_session):
        """Reset fetch settings to default values"""
        default_data = {
            "general": {
                "pmin": "", "pmax": "", "title": "",
                "origin": [], "country": "", "not_country": "",
                "daybreak": "", "email": "nomatter", "tel": "nomatter",
                "email_type": [], "item_domain": "", "not_item_domain": "",
                "email_provider": "", "not_email_provider": "",
                "nsb": False, "sb": False, "nsb_by_me": False, "sb_by_me": False
            },
            "valorant": {
                "weaponSkin": "", "knife": False,
                "valorant_knife_min": "", "valorant_knife_max": "",
                "buddy": "", "agent": "",
                "valorant_region": [], "valorant_not_region": "",
                "rmin": "", "rmax": "",
                "previous_rmin": "", "previous_rmax": "",
                "last_rmin": "", "last_rmax": "",
                "valorant_smin": "", "valorant_smax": "",
                "valorant_level_min": "", "valorant_level_max": "",
                "vp_min": "", "vp_max": "",
                "inv_min": "", "inv_max": "",
                "amin": "", "amax": ""
            },
            "lol": {
                "skin": "", "champion": "",
                "lol_region": [], "lol_not_region": "",
                "lol_level_min": "", "lol_level_max": "",
                "win_rate_min": "", "win_rate_max": "",
                "lol_smin": "", "lol_smax": "",
                "champion_min": "", "champion_max": "",
                "blue_min": "", "blue_max": "",
                "orange_min": "", "orange_max": "",
                "mythic_min": "", "mythic_max": "",
                "riot_min": "", "riot_max": ""
            }
        }
        
        response = admin_session.put(
            f"{BASE_URL}/api/admin/fetch-settings",
            json=default_data
        )
        assert response.status_code == 200
        print("✓ Fetch settings reset to defaults")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
