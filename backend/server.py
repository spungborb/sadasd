from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

LZT_BASE_URL = os.environ.get('LZT_MARKET_BASE_URL', 'https://prod-api.lzt.market')
LZT_TOKEN = os.environ.get('LZT_MARKET_TOKEN', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

http_client = httpx.AsyncClient(timeout=60.0, verify=False, headers={"Authorization": f"Bearer {LZT_TOKEN}"})
val_http = httpx.AsyncClient(timeout=30.0)

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
CACHE_TTL_SEARCH = 300
CACHE_TTL_ITEM = 900
CACHE_TTL_SKINS = 86400

DEFAULT_SETTINGS = {
    "settings_id": "global",
    "default_region": "eu",
    "commission": {"valorant": 100, "lol": 100},
    "admin_email": ADMIN_EMAIL,
    "base_urls": {"valorant": "", "lol": ""},
}

# ======================== HELPERS ========================

async def get_settings():
    s = await db.admin_settings.find_one({"settings_id": "global"}, {"_id": 0})
    if not s:
        await db.admin_settings.insert_one(dict(DEFAULT_SETTINGS))
        return dict(DEFAULT_SETTINGS)
    return s

def parse_lzt_url(url_str: str) -> dict:
    """Parse an LZT Market URL and extract the API path + query params."""
    parsed = urlparse(url_str)
    path = parsed.path.rstrip('/')
    # LZT URLs: https://lzt.market/riot?... or https://lzt.market/steam?...
    # API base path mapping
    api_path = path if path else '/riot'
    # Parse query params — parse_qs returns lists, flatten single values
    raw_params = parse_qs(parsed.query, keep_blank_values=False)
    params = {}
    for k, v in raw_params.items():
        # Keep array params as repeated key-value pairs
        if len(v) == 1:
            params[k] = v[0]
        else:
            params[k] = v  # keep as list for array params
    return {"api_path": api_path, "params": params}

# ======================== AUTH ========================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as ac:
        ar = await ac.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if ar.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    ad = ar.json()
    email, name, picture, session_token = ad.get("email"), ad.get("name",""), ad.get("picture",""), ad.get("session_token","")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": user_id, "email": email, "name": name, "picture": picture, "created_at": datetime.now(timezone.utc).isoformat()})
    settings = await get_settings()
    current_admin = settings.get("admin_email", "")
    if not current_admin:
        await db.admin_settings.update_one({"settings_id": "global"}, {"$set": {"admin_email": email}}, upsert=True)
    elif current_admin:
        admin_exists = await db.users.find_one({"email": current_admin}, {"_id": 0})
        if not admin_exists:
            await db.admin_settings.update_one({"settings_id": "global"}, {"$set": {"admin_email": email}}, upsert=True)
    await db.user_sessions.delete_many({"user_id": user_id})
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()})
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    settings = await get_settings()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user["is_admin"] = (user.get("email") == settings.get("admin_email"))
    return user

async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "): token = ah[7:]
    if not token: return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session: return None
    ea = session.get("expires_at", "")
    if isinstance(ea, str): ea = datetime.fromisoformat(ea)
    if ea.tzinfo is None: ea = ea.replace(tzinfo=timezone.utc)
    if ea < datetime.now(timezone.utc): return None
    return await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    settings = await get_settings()
    user["is_admin"] = (user.get("email") == settings.get("admin_email"))
    return user

@api_router.post("/auth/logout")
async def logout_user(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token: await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True, httponly=True)
    return {"message": "Logged out"}

# ======================== ADMIN SETTINGS ========================

async def check_admin(request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    settings = await get_settings()
    if user.get("email") != settings.get("admin_email"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.get("/admin/settings")
async def get_admin_settings(request: Request):
    await check_admin(request)
    return await get_settings()

@api_router.put("/admin/settings")
async def update_admin_settings(request: Request):
    await check_admin(request)
    body = await request.json()
    update = {}
    for k in ("default_region", "commission", "admin_email", "base_urls"):
        if k in body: update[k] = body[k]
    if update:
        await db.admin_settings.update_one({"settings_id": "global"}, {"$set": update}, upsert=True)
    return await get_settings()

# ======================== URL PROFILES ========================

@api_router.get("/profiles")
async def list_profiles():
    """Public endpoint — returns all fetch profiles for frontend sub-categories."""
    cursor = db.profiles.find({}, {"_id": 0}).sort("created_at", 1)
    profiles = await cursor.to_list(length=100)
    return {"profiles": profiles}

@api_router.post("/profiles")
async def create_profile(request: Request):
    await check_admin(request)
    body = await request.json()
    name = body.get("name", "").strip()
    category = body.get("category", "").strip()
    lzt_url = body.get("lzt_url", "").strip()
    if not name or not category or not lzt_url:
        raise HTTPException(status_code=400, detail="name, category, lzt_url required")
    if category not in ("valorant", "lol"):
        raise HTTPException(status_code=400, detail="category must be 'valorant' or 'lol'")
    parsed = parse_lzt_url(lzt_url)
    profile_id = f"prof_{uuid.uuid4().hex[:10]}"
    doc = {
        "profile_id": profile_id,
        "name": name,
        "category": category,
        "lzt_url": lzt_url,
        "api_path": parsed["api_path"],
        "parsed_params": parsed["params"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.profiles.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, request: Request):
    await check_admin(request)
    body = await request.json()
    update = {}
    if "name" in body: update["name"] = body["name"].strip()
    if "category" in body:
        if body["category"] not in ("valorant", "lol"):
            raise HTTPException(status_code=400, detail="category must be 'valorant' or 'lol'")
        update["category"] = body["category"]
    if "lzt_url" in body:
        parsed = parse_lzt_url(body["lzt_url"].strip())
        update["lzt_url"] = body["lzt_url"].strip()
        update["api_path"] = parsed["api_path"]
        update["parsed_params"] = parsed["params"]
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.profiles.update_one({"profile_id": profile_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    doc = await db.profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc

@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str, request: Request):
    await check_admin(request)
    result = await db.profiles.delete_one({"profile_id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Deleted", "profile_id": profile_id}

@api_router.get("/market/profile/{profile_id}")
async def search_by_profile(profile_id: str, request: Request):
    """Fetch LZT data using a saved profile's parsed params."""
    profile = await db.profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    settings = await get_settings()
    category = profile["category"]
    # Merge profile params with request query params (page, currency overrides)
    params = dict(profile.get("parsed_params", {}))
    for k, v in request.query_params.items():
        params[k] = v
    if "currency" not in params:
        params["currency"] = "usd"
    cache_key = f"profile:{profile_id}:{str(sorted(str(params).encode()))}"
    cached = await db.lzt_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached and cached.get("data"):
        result = apply_commission(cached["data"], category, settings)
        result["profile"] = profile
        return result
    api_path = profile.get("api_path", "/riot")
    url = f"{LZT_BASE_URL}{api_path}"
    # Flatten list params for httpx
    flat_params = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                flat_params.append((k, item))
        else:
            flat_params.append((k, v))
    logger.info(f"LZT Profile fetch: {url} params={flat_params[:10]}...")
    try:
        resp = await http_client.get(url, params=flat_params)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"LZT API error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=f"LZT API error")
    except Exception as e:
        logger.error(f"LZT error: {e}")
        raise HTTPException(status_code=502, detail=f"LZT API error: {str(e)}")
    try:
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SEARCH)
        await db.lzt_cache.update_one({"cache_key": cache_key}, {"$set": {"cache_key": cache_key, "data": data, "expires_at": ea}}, upsert=True)
    except: pass
    result = apply_commission(data, category, settings)
    result["profile"] = profile
    return result

# ======================== FAVORITES ========================

@api_router.get("/favorites")
async def get_favorites(request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.favorites.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"items": doc.get("items", []) if doc else []}

@api_router.post("/favorites/sync")
async def sync_favorites(request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    body = await request.json()
    local_items = body.get("items", [])
    doc = await db.favorites.find_one({"user_id": user["user_id"]}, {"_id": 0})
    server_items = doc.get("items", []) if doc else []
    merged = list(set(server_items + local_items))
    await db.favorites.update_one({"user_id": user["user_id"]}, {"$set": {"items": merged}}, upsert=True)
    return {"items": merged}

@api_router.post("/favorites/{item_id}")
async def add_favorite(item_id: int, request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    await db.favorites.update_one({"user_id": user["user_id"]}, {"$addToSet": {"items": item_id}}, upsert=True)
    doc = await db.favorites.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"items": doc.get("items", [])}

@api_router.delete("/favorites/{item_id}")
async def remove_favorite(item_id: int, request: Request):
    user = await get_current_user(request)
    if not user: raise HTTPException(status_code=401, detail="Not authenticated")
    await db.favorites.update_one({"user_id": user["user_id"]}, {"$pull": {"items": item_id}})
    doc = await db.favorites.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"items": doc.get("items", []) if doc else []}

# ======================== VALORANT SKINS + AGENTS ========================

@api_router.get("/valorant/skins")
async def get_valorant_skins():
    cached = await db.lzt_cache.find_one({"cache_key": "valorant_skins_all"}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]
    try:
        resp = await val_http.get("https://valorant-api.com/v1/weapons/skins?language=en-US")
        resp.raise_for_status()
        raw = resp.json()
        tiers_resp = await val_http.get("https://valorant-api.com/v1/contenttiers")
        tiers_data = {}
        if tiers_resp.status_code == 200:
            for t in tiers_resp.json().get("data", []):
                tiers_data[t["uuid"]] = {"name": t["devName"], "icon": t.get("displayIcon"), "color": t.get("highlightColor")}
        skins = []
        for s in raw.get("data", []):
            if not s.get("displayIcon"): continue
            skins.append({"uuid": s["uuid"], "displayName": s["displayName"], "displayIcon": s["displayIcon"], "contentTierUuid": s.get("contentTierUuid"), "tier": tiers_data.get(s.get("contentTierUuid"), {}).get("name", "Standard"), "tierColor": tiers_data.get(s.get("contentTierUuid"), {}).get("color")})
        result = {"skins": skins, "tiers": tiers_data}
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SKINS)
        await db.lzt_cache.update_one({"cache_key": "valorant_skins_all"}, {"$set": {"cache_key": "valorant_skins_all", "data": result, "expires_at": ea}}, upsert=True)
        return result
    except Exception as e:
        logger.error(f"Valorant API error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch Valorant skin data")

@api_router.get("/valorant/agents")
async def get_valorant_agents():
    cached = await db.lzt_cache.find_one({"cache_key": "valorant_agents"}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]
    try:
        resp = await val_http.get("https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US")
        resp.raise_for_status()
        agents = [{"uuid": a["uuid"], "displayName": a["displayName"], "displayIcon": a.get("displayIcon"), "fullPortrait": a.get("fullPortrait"), "background": a.get("background"), "bustPortrait": a.get("bustPortrait")} for a in resp.json().get("data", []) if a.get("displayIcon")]
        result = {"agents": agents}
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SKINS)
        await db.lzt_cache.update_one({"cache_key": "valorant_agents"}, {"$set": {"cache_key": "valorant_agents", "data": result, "expires_at": ea}}, upsert=True)
        return result
    except Exception as e:
        logger.error(f"Valorant agents error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch agents")

@api_router.get("/lol/champions")
async def get_lol_champions():
    cached = await db.lzt_cache.find_one({"cache_key": "lol_champions"}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]
    try:
        ver_resp = await val_http.get("https://ddragon.leagueoflegends.com/api/versions.json")
        ver = ver_resp.json()[0]
        resp = await val_http.get(f"https://ddragon.leagueoflegends.com/cdn/{ver}/data/en_US/champion.json")
        resp.raise_for_status()
        raw = resp.json().get("data", {})
        champs = {}
        for name, data in raw.items():
            champs[data["key"]] = {"id": name, "name": data["name"], "icon": f"https://ddragon.leagueoflegends.com/cdn/{ver}/img/champion/{name}.png", "splash": f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{name}_0.jpg"}
        result = {"champions": champs, "version": ver}
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SKINS)
        await db.lzt_cache.update_one({"cache_key": "lol_champions"}, {"$set": {"cache_key": "lol_champions", "data": result, "expires_at": ea}}, upsert=True)
        return result
    except Exception as e:
        logger.error(f"LoL champions error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch champions")

# ======================== LZT MARKET (generic fallback) ========================

@api_router.get("/market/search/{category}")
async def search_market(category: str, request: Request):
    if category not in ("valorant", "lol"):
        raise HTTPException(status_code=400, detail=f"Unsupported category: {category}")
    settings = await get_settings()
    # Start with base URL params if configured
    base_urls = settings.get("base_urls", {})
    base_url_str = base_urls.get(category, "")
    if base_url_str:
        base_parsed = parse_lzt_url(base_url_str)
        params = dict(base_parsed.get("params", {}))
    else:
        params = {}
    # Override/merge with request query params
    for k, v in request.query_params.items():
        params[k] = v
    if "currency" not in params: params["currency"] = "usd"
    # Flatten list params for cache key
    cache_key = f"search:{category}:{str(sorted(str(params).encode()))}"
    cached = await db.lzt_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached and cached.get("data"):
        result = apply_commission(cached["data"], category, settings)
        result["default_region"] = settings.get("default_region", "all")
        return result
    url = f"{LZT_BASE_URL}/riot"
    # Flatten list params for httpx
    flat_params = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v: flat_params.append((k, item))
        else:
            flat_params.append((k, v))
    try:
        resp = await http_client.get(url, params=flat_params)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"LZT API error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LZT API error: {str(e)}")
    try:
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SEARCH)
        await db.lzt_cache.update_one({"cache_key": cache_key}, {"$set": {"cache_key": cache_key, "data": data, "expires_at": ea}}, upsert=True)
    except: pass
    result = apply_commission(data, category, settings)
    result["default_region"] = settings.get("default_region", "all")
    return result

def apply_commission(data, category, settings):
    pct = settings.get("commission", {}).get(category, 100) / 100.0
    for item in data.get("items", []):
        original = item.get("price", 0)
        final_price = round(original * (1 + pct), 2)
        # NEVER expose base price. Create fake "compare-at" price (25% above final)
        item["price"] = final_price
        item["compare_price"] = round(final_price * 1.25, 2)
        # Remove any trace of original
        item.pop("original_price", None)
    return data

@api_router.get("/market/item/{item_id}")
async def get_market_item(item_id: int, request: Request):
    cache_key = f"item:{item_id}"
    cached = await db.lzt_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached and cached.get("data"):
        return apply_item_commission(cached["data"])
    url = f"{LZT_BASE_URL}/{item_id}"
    try:
        resp = await http_client.get(url)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="LZT API error")
    except Exception as e:
        raise HTTPException(status_code=502, detail="LZT API error")
    try:
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_ITEM)
        await db.lzt_cache.update_one({"cache_key": cache_key}, {"$set": {"cache_key": cache_key, "data": data, "expires_at": ea}}, upsert=True)
    except: pass
    return apply_item_commission(data)

def apply_item_commission(data):
    item = data.get("item", data)
    if isinstance(item, dict) and "price" in item:
        final_price = round(item["price"] * 2, 2)
        item["price"] = final_price
        item["compare_price"] = round(final_price * 1.25, 2)
        item.pop("original_price", None)
    return data

# ======================== HEALTH ========================
@api_router.get("/")
async def root():
    return {"message": "LZT Vault API", "status": "ok"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    await ensure_cache_indexes()
    await get_settings()
    logger.info("LZT Vault API started")

async def ensure_cache_indexes():
    try: await db.lzt_cache.create_index("expires_at", expireAfterSeconds=0)
    except: pass

@app.on_event("shutdown")
async def shutdown_db_client():
    await http_client.aclose()
    await val_http.aclose()
    client.close()
