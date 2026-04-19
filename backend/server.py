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
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_ADMIN_CHAT_ID = os.environ.get('TELEGRAM_ADMIN_CHAT_ID', '')
TELEGRAM_WEBHOOK_SECRET = os.environ.get('TELEGRAM_WEBHOOK_SECRET', '')

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
    # Merge profile params with request query params (preserve duplicates for LZT array keys)
    params = dict(profile.get("parsed_params", {}))
    for k, v in request.query_params.multi_items():
        if k in params and isinstance(params[k], list):
            params[k].append(v)
        elif k in params:
            params[k] = [params[k], v]
        else:
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
    cached = await db.lzt_cache.find_one({"cache_key": "valorant_agents_v2"}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]
    try:
        resp = await val_http.get("https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US")
        resp.raise_for_status()
        agents = [{
            "uuid": a["uuid"],
            "displayName": a["displayName"],
            "displayIcon": a.get("displayIcon"),
            "fullPortrait": a.get("fullPortrait"),
            "background": a.get("background"),
            "bustPortrait": a.get("bustPortrait"),
            "backgroundGradientColors": a.get("backgroundGradientColors", []),
        } for a in resp.json().get("data", []) if a.get("displayIcon")]
        result = {"agents": agents}
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SKINS)
        await db.lzt_cache.update_one({"cache_key": "valorant_agents_v2"}, {"$set": {"cache_key": "valorant_agents_v2", "data": result, "expires_at": ea}}, upsert=True)
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

@api_router.get("/lol/skins-all")
async def get_lol_skins_all():
    """Community Dragon: real LoL skin names map { skinId: {name, splash} }."""
    cached = await db.lzt_cache.find_one({"cache_key": "lol_skins_all_cd"}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]
    try:
        resp = await val_http.get("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json")
        resp.raise_for_status()
        raw = resp.json()
        skins = {}
        for sid, s in raw.items():
            try:
                int(sid)  # validate
                name = s.get("name", "")
                # CommunityDragon image path
                splash = s.get("splashPath", "") or s.get("tilePath", "")
                if splash.startswith("/lol-game-data/assets"):
                    splash = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default" + splash.lower().replace("/lol-game-data/assets", "")
                skins[sid] = {"name": name, "splash": splash, "isBase": s.get("isBase", False)}
            except Exception:
                continue
        result = {"skins": skins, "count": len(skins)}
        ea = datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SKINS)
        await db.lzt_cache.update_one({"cache_key": "lol_skins_all_cd"}, {"$set": {"cache_key": "lol_skins_all_cd", "data": result, "expires_at": ea}}, upsert=True)
        return result
    except Exception as e:
        logger.error(f"LoL skins-all error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch LoL skins")

# ======================== LIVE STATS + FEATURED ========================

@api_router.get("/stats/live")
async def get_live_stats():
    """Live counters sampled from most recent cached market search responses."""
    stats = {"valorant": {"total": 0, "min_price": 0, "max_price": 0}, "lol": {"total": 0, "min_price": 0, "max_price": 0}, "updated_at": datetime.now(timezone.utc).isoformat()}
    for cat in ("valorant", "lol"):
        cursor = db.lzt_cache.find({"cache_key": {"$regex": f"^search:{cat}:"}}, {"_id": 0, "data": 1}).sort("expires_at", -1).limit(1)
        async for c in cursor:
            d = c.get("data", {})
            stats[cat]["total"] = d.get("totalItems", 0)
            items = d.get("items", [])
            prices = [i.get("price", 0) for i in items if i.get("price")]
            if prices:
                stats[cat]["min_price"] = round(min(prices), 2)
                stats[cat]["max_price"] = round(max(prices), 2)
    # Fallback: if nothing cached, do a light live fetch
    if stats["valorant"]["total"] == 0 and LZT_TOKEN:
        try:
            resp = await http_client.get(f"{LZT_BASE_URL}/riot", params={"pmax": 1000, "currency": "usd"})
            if resp.status_code == 200:
                d = resp.json()
                stats["valorant"]["total"] = d.get("totalItems", 0)
        except Exception:
            pass
    return stats

@api_router.get("/featured/{category}")
async def get_featured(category: str):
    """Featured accounts: top items by skin count or inventory value from cache."""
    if category not in ("valorant", "lol"):
        raise HTTPException(status_code=400, detail="Invalid category")
    settings = await get_settings()
    cursor = db.lzt_cache.find({"cache_key": {"$regex": f"^search:{category}:"}}, {"_id": 0, "data": 1}).sort("expires_at", -1).limit(3)
    all_items = []
    async for c in cursor:
        all_items.extend(c.get("data", {}).get("items", []))
    if not all_items and LZT_TOKEN:
        try:
            resp = await http_client.get(f"{LZT_BASE_URL}/riot", params={"pmax": 1000, "currency": "usd"})
            if resp.status_code == 200:
                all_items = resp.json().get("items", [])
        except Exception:
            pass
    # Dedupe
    seen = set(); unique = []
    for it in all_items:
        iid = it.get("item_id")
        if iid and iid not in seen:
            seen.add(iid); unique.append(it)
    # Rank by value heuristic
    if category == "valorant":
        unique.sort(key=lambda x: (x.get("riot_valorant_skin_count", 0) * 10 + x.get("riot_valorant_knife_count", 0) * 100 + x.get("riot_valorant_wallet_vp", 0) / 100), reverse=True)
    else:
        unique.sort(key=lambda x: (x.get("riot_lol_skin_count", 0) * 10 + x.get("riot_lol_champion_count", 0)), reverse=True)
    top = unique[:8]
    # Apply commission
    data = {"items": top, "totalItems": len(top)}
    result = apply_commission(data, category, settings)
    return result

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
    # Override/merge with request query params (preserve duplicate keys for array-style LZT params)
    for k, v in request.query_params.multi_items():
        if k in params and isinstance(params[k], list):
            params[k].append(v)
        elif k in params:
            params[k] = [params[k], v]
        else:
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
        logger.info(f"LZT search: {category} params={dict(flat_params[:10])}")
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
    except Exception:
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

@api_router.get("/admin/analytics")
async def admin_analytics(request: Request):
    """Admin-only analytics: cache health, category breakdown, recent fetch stats."""
    await check_admin(request)
    # Cache entries
    search_cache_count = await db.lzt_cache.count_documents({"cache_key": {"$regex": "^search:"}})
    item_cache_count = await db.lzt_cache.count_documents({"cache_key": {"$regex": "^item:"}})
    profile_cache_count = await db.lzt_cache.count_documents({"cache_key": {"$regex": "^profile:"}})
    total_cache = await db.lzt_cache.count_documents({})
    # Users/sessions/favorites/profiles
    users_count = await db.users.count_documents({})
    active_sessions = await db.user_sessions.count_documents({})
    favorites_docs = await db.favorites.count_documents({})
    profiles_count = await db.profiles.count_documents({})
    # Category breakdown of profiles
    val_profiles = await db.profiles.count_documents({"category": "valorant"})
    lol_profiles = await db.profiles.count_documents({"category": "lol"})
    # Simulate last 7 days trend by sampling recent cache expires
    days_trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day_start = now - timedelta(days=i+1)
        day_end = now - timedelta(days=i)
        # Count cache items whose expires_at falls in this range (proxy for activity)
        count = await db.lzt_cache.count_documents({"expires_at": {"$gte": day_start, "$lt": day_end}})
        days_trend.append({"day": day_start.strftime("%a"), "fetches": count})
    # Latest live stats
    val_search = await db.lzt_cache.find_one({"cache_key": {"$regex": "^search:valorant:"}}, {"_id": 0, "data.totalItems": 1, "expires_at": 1}, sort=[("expires_at", -1)])
    lol_search = await db.lzt_cache.find_one({"cache_key": {"$regex": "^search:lol:"}}, {"_id": 0, "data.totalItems": 1, "expires_at": 1}, sort=[("expires_at", -1)])
    return {
        "cache": {"total": total_cache, "search": search_cache_count, "item": item_cache_count, "profile": profile_cache_count},
        "users": {"total": users_count, "active_sessions": active_sessions, "with_favorites": favorites_docs},
        "profiles": {"total": profiles_count, "valorant": val_profiles, "lol": lol_profiles},
        "listings": {
            "valorant": (val_search or {}).get("data", {}).get("totalItems", 0),
            "lol": (lol_search or {}).get("data", {}).get("totalItems", 0),
        },
        "trend": days_trend,
        "lzt_token_configured": bool(LZT_TOKEN),
        "updated_at": now.isoformat(),
    }

@api_router.post("/admin/cache/clear")
async def admin_clear_cache(request: Request):
    """Admin-only: clear market cache to force fresh fetches."""
    await check_admin(request)
    body = await request.json() if request.headers.get("content-length") else {}
    scope = body.get("scope", "search")  # search | item | profile | all
    if scope == "all":
        result = await db.lzt_cache.delete_many({})
    elif scope in ("search", "item", "profile"):
        result = await db.lzt_cache.delete_many({"cache_key": {"$regex": f"^{scope}:"}})
    else:
        raise HTTPException(status_code=400, detail="Invalid scope")
    return {"deleted": result.deleted_count, "scope": scope}

# ======================== ORDERS / WALLET / TICKETS / TELEGRAM ========================

def _is_trusted_listing(item: dict) -> bool:
    """Decide warranty based on listing provenance signals."""
    if item.get("extended_guarantee", 0) and int(item.get("extended_guarantee", 0)) > 0:
        return True
    origin = str(item.get("item_origin", "")).lower()
    if origin in ("personal", "autoreg"):
        return True
    if item.get("nsb") == 1:
        return True
    return False

def _gen_dummy_credentials(category: str, item_id: int) -> dict:
    """Mock credentials for demo purchases."""
    rid = f"GV{item_id}{uuid.uuid4().hex[:4].upper()}"
    return {
        "login": f"user_{rid.lower()}",
        "password": f"Temp!{uuid.uuid4().hex[:8]}",
        "email": f"{rid.lower()}@vault-demo.local",
        "email_password": f"Mail!{uuid.uuid4().hex[:6]}",
        "notes": f"Demo credentials for {category} listing #{item_id}. Contact support for real delivery.",
    }

async def _ensure_wallet(user_id: str) -> dict:
    w = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not w:
        w = {"user_id": user_id, "balance_usd": 0.0, "currency": "usd", "created_at": datetime.now(timezone.utc).isoformat()}
        await db.wallets.insert_one(dict(w))
    return w

@api_router.get("/wallet")
async def get_wallet(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    w = await _ensure_wallet(user["user_id"])
    # Transactions (last 20)
    tx_cursor = db.wallet_transactions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(20)
    tx = await tx_cursor.to_list(length=20)
    return {"balance_usd": float(w.get("balance_usd", 0)), "transactions": tx}

@api_router.post("/orders")
async def create_order(request: Request):
    """Demo 'buy' — creates an order from a listing with dummy credentials."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    body = await request.json()
    item_id = body.get("item_id")
    category = body.get("category", "valorant")
    if not item_id:
        raise HTTPException(status_code=400, detail="item_id required")
    # Get listing snapshot
    try:
        url = f"{LZT_BASE_URL}/{int(item_id)}"
        resp = await http_client.get(url)
        listing = resp.json() if resp.status_code == 200 else {}
        item = listing.get("item", listing) if isinstance(listing, dict) else {}
    except Exception:
        item = {}
    # Apply commission to snapshot the final price user saw
    settings = await get_settings()
    price_usd = float(item.get("price", body.get("price", 0)))
    pct = settings.get("commission", {}).get(category, 100) / 100.0
    final_price = round(price_usd * (1 + pct), 2) if price_usd else float(body.get("price", 0))
    is_trusted = _is_trusted_listing(item)
    warranty_days = 7 if is_trusted else 0
    now = datetime.now(timezone.utc)
    warranty_expires = (now + timedelta(days=warranty_days)).isoformat() if warranty_days > 0 else None
    order_id = f"ORD_{uuid.uuid4().hex[:10].upper()}"
    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "item_id": int(item_id),
        "category": category,
        "title": item.get("title") or item.get("title_en") or f"Listing #{item_id}",
        "region": item.get("riot_valorant_region") or item.get("riot_lol_region") or "",
        "rank_name": item.get("riot_valorant_rank_title") or item.get("riot_lol_rank") or "",
        "price_usd": final_price,
        "credentials": _gen_dummy_credentials(category, int(item_id)),
        "is_trusted_seller": is_trusted,
        "warranty_days": warranty_days,
        "warranty_expires_at": warranty_expires,
        "status": "delivered",
        "reveals_count": 0,
        "created_at": now.isoformat(),
    }
    await db.orders.insert_one(dict(order_doc))
    order_doc.pop("_id", None)
    return order_doc

@api_router.get("/orders")
async def list_orders(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.orders.find({"user_id": user["user_id"]}, {"_id": 0, "credentials": 0}).sort("created_at", -1).limit(200)
    orders = await cursor.to_list(length=200)
    return {"orders": orders}

@api_router.post("/orders/{order_id}/reveal")
async def reveal_credentials(order_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"order_id": order_id}, {"$inc": {"reveals_count": 1}, "$set": {"last_reveal_at": datetime.now(timezone.utc).isoformat()}})
    return {"credentials": order.get("credentials", {}), "reveals_count": order.get("reveals_count", 0) + 1}

# ---- Tickets ----

async def _next_ticket_seq() -> int:
    res = await db.counters.find_one_and_update(
        {"_id": "ticket_seq"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    if res is None:
        # Motor 3.3 returns None with return_document=True on upsert when missing; re-read
        doc = await db.counters.find_one({"_id": "ticket_seq"})
        return int(doc.get("seq", 1)) if doc else 1
    return int(res.get("seq", 1))

async def _send_telegram(text: str, parse_mode: str = "HTML") -> bool:
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_HERE" or not TELEGRAM_ADMIN_CHAT_ID or TELEGRAM_ADMIN_CHAT_ID == "YOUR_CHAT_ID_HERE":
        logger.info(f"[TELEGRAM MOCK] {text}")
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        async with httpx.AsyncClient(timeout=10.0) as ac:
            r = await ac.post(url, json={"chat_id": TELEGRAM_ADMIN_CHAT_ID, "text": text, "parse_mode": parse_mode, "disable_web_page_preview": True})
        return r.status_code == 200
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False

@api_router.post("/tickets")
async def create_ticket(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    body = await request.json()
    subject = (body.get("subject") or "").strip() or "General Inquiry"
    first_message = (body.get("message") or "").strip()
    order_id = body.get("order_id")
    if not first_message:
        raise HTTPException(status_code=400, detail="message required")
    seq = await _next_ticket_seq()
    ticket_id = f"TKT-{seq:04d}"
    now = datetime.now(timezone.utc).isoformat()
    msg = {"msg_id": uuid.uuid4().hex[:10], "from": "user", "text": first_message, "author_email": user.get("email", ""), "author_name": user.get("name", ""), "created_at": now}
    doc = {
        "ticket_id": ticket_id,
        "seq": seq,
        "user_id": user["user_id"],
        "user_email": user.get("email", ""),
        "user_name": user.get("name", ""),
        "order_id": order_id,
        "subject": subject,
        "status": "open",  # open | pending_user | closed
        "messages": [msg],
        "last_activity": now,
        "created_at": now,
    }
    await db.tickets.insert_one(dict(doc))
    # Outbound telegram
    preview = first_message[:300] + ("..." if len(first_message) > 300 else "")
    await _send_telegram(
        f"🎫 <b>New Ticket #{seq}</b>\n"
        f"From: <b>{user.get('name') or user.get('email')}</b>\n"
        f"Subject: <i>{subject}</i>\n"
        f"Order: {order_id or '—'}\n\n"
        f"{preview}\n\n"
        f"<b>Reply format:</b> <code>#{seq} your response</code>"
    )
    doc.pop("_id", None)
    return doc

@api_router.get("/tickets")
async def list_tickets(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("last_activity", -1).limit(100)
    return {"tickets": await cursor.to_list(length=100)}

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    t = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@api_router.post("/tickets/{ticket_id}/messages")
async def reply_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    body = await request.json()
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    t = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0, "seq": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.now(timezone.utc).isoformat()
    msg = {"msg_id": uuid.uuid4().hex[:10], "from": "user", "text": text, "author_email": user.get("email", ""), "author_name": user.get("name", ""), "created_at": now}
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$push": {"messages": msg}, "$set": {"last_activity": now, "status": "open"}})
    seq = t.get("seq", 0)
    preview = text[:300] + ("..." if len(text) > 300 else "")
    await _send_telegram(f"💬 <b>Ticket #{seq}</b> — user reply:\n{preview}\n\n<code>#{seq} your response</code>")
    return {"message": msg}

# Polling endpoint — returns any NEW admin messages since `since` ISO timestamp
@api_router.get("/tickets/{ticket_id}/poll")
async def poll_ticket(ticket_id: str, since: str = "", request: Request = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    t = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0, "messages": 1, "status": 1, "last_activity": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msgs = t.get("messages", [])
    new_msgs = [m for m in msgs if m.get("created_at", "") > (since or "")] if since else []
    return {"status": t.get("status"), "last_activity": t.get("last_activity"), "new_messages": new_msgs, "total": len(msgs)}

# ---- Admin ticket endpoints ----

@api_router.get("/admin/tickets")
async def admin_list_tickets(request: Request, status: str = ""):
    await check_admin(request)
    q = {"status": status} if status else {}
    cursor = db.tickets.find(q, {"_id": 0}).sort("last_activity", -1).limit(200)
    tickets = await cursor.to_list(length=200)
    # summary
    open_count = await db.tickets.count_documents({"status": "open"})
    pending_count = await db.tickets.count_documents({"status": "pending_user"})
    closed_count = await db.tickets.count_documents({"status": "closed"})
    return {"tickets": tickets, "counts": {"open": open_count, "pending_user": pending_count, "closed": closed_count}}

@api_router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_ticket(ticket_id: str, request: Request):
    user = await check_admin(request)
    body = await request.json()
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    t = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0, "seq": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.now(timezone.utc).isoformat()
    msg = {"msg_id": uuid.uuid4().hex[:10], "from": "admin", "text": text, "author_email": user.get("email", "admin"), "author_name": user.get("name", "Admin"), "created_at": now}
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$push": {"messages": msg}, "$set": {"last_activity": now, "status": "pending_user"}})
    return {"message": msg}

@api_router.post("/admin/tickets/{ticket_id}/status")
async def admin_set_status(ticket_id: str, request: Request):
    await check_admin(request)
    body = await request.json()
    status_new = body.get("status", "")
    if status_new not in ("open", "pending_user", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": status_new, "last_activity": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"ticket_id": ticket_id, "status": status_new}

# ---- Inbound Telegram webhook (2-way logic) ----

@api_router.post("/webhook/social-reply")
async def social_reply_webhook(request: Request):
    """Inbound webhook — Telegram bot sends admin replies here.
    Format expected: "#1024 your message" OR "1024: your message".
    Admin sets their Telegram bot webhook to this URL with secret_token header for auth.
    """
    # Verify secret (Telegram sends X-Telegram-Bot-Api-Secret-Token header if set)
    if TELEGRAM_WEBHOOK_SECRET:
        got = request.headers.get("x-telegram-bot-api-secret-token", "")
        if got != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid secret")
    body = await request.json()
    # Support Telegram's update structure
    message = body.get("message") or body.get("edited_message") or {}
    from_user = message.get("from", {}) or {}
    chat = message.get("chat", {}) or {}
    text = (message.get("text") or "").strip()
    # Only accept replies from admin chat (if configured)
    if TELEGRAM_ADMIN_CHAT_ID and TELEGRAM_ADMIN_CHAT_ID != "YOUR_CHAT_ID_HERE":
        if str(chat.get("id", "")) != str(TELEGRAM_ADMIN_CHAT_ID):
            logger.warning(f"Webhook ignored: chat_id {chat.get('id')} != admin {TELEGRAM_ADMIN_CHAT_ID}")
            return {"ok": True, "ignored": "chat_not_admin"}
    if not text:
        return {"ok": True, "ignored": "no_text"}
    # Parse ticket id: "#1024 ..." or "1024: ..." or "1024 ..."
    import re
    m = re.match(r"^\s*#?(\d{1,6})[\s:,-]+(.+)$", text, flags=re.DOTALL)
    if not m:
        return {"ok": True, "ignored": "no_ticket_id"}
    seq = int(m.group(1))
    msg_text = m.group(2).strip()
    t = await db.tickets.find_one({"seq": seq}, {"_id": 0, "ticket_id": 1})
    if not t:
        await _send_telegram(f"⚠️ Ticket #{seq} not found.")
        return {"ok": True, "ignored": "ticket_not_found"}
    now = datetime.now(timezone.utc).isoformat()
    admin_name = from_user.get("first_name") or from_user.get("username") or "Admin"
    msg_doc = {"msg_id": uuid.uuid4().hex[:10], "from": "admin", "text": msg_text, "author_email": f"telegram:{from_user.get('username','admin')}", "author_name": admin_name, "created_at": now, "source": "telegram"}
    await db.tickets.update_one({"ticket_id": t["ticket_id"]}, {"$push": {"messages": msg_doc}, "$set": {"last_activity": now, "status": "pending_user"}})
    # Optionally ack back
    await _send_telegram(f"✅ Reply sent to Ticket #{seq}.")
    return {"ok": True, "ticket_id": t["ticket_id"], "seq": seq}

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
