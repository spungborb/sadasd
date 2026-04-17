# Game Vault - LZT Market Prototype (Valorant/LoL Edition)

## Original Request
Clone https://github.com/spung2/sadasdasd into /app and run it.

## Architecture
- **Frontend:** React 19 + Tailwind + Framer Motion + CRACO
- **Backend:** FastAPI + Motor (MongoDB)
- **Auth:** Emergent-managed Google OAuth (session cookie)
- **External APIs:** LZT Market (proxied with commission markup), Valorant-API, DataDragon (LoL)

## Routes
- `/` → Landing page
- `/market` → Marketplace (Valorant / LoL tabs)
- `/admin` → Admin dashboard (profiles, pricing, settings)

## Core Features
- White-labeled "Game Vault" brand (hides LZT)
- URL Profile system: admin pastes LZT URL → parsed into sub-category tab
- Commission markup pricing + fake 25% strike-through "compare" price
- Visual galleries (Valorant agents/skins, LoL champions)
- Favorites (authed)
- Multi-currency (USD/EUR/TRY/RUB)
- MongoDB TTL cache for external API responses

## What's Been Implemented (Apr 17, 2026)
- Full repo mirrored to /app (backend + frontend + memory + tests)
- Python & Node deps installed (pip install -r requirements.txt, yarn install)
- Backend .env seeded (empty LZT_MARKET_TOKEN / ADMIN_EMAIL placeholders)
- Frontend .env preserves Emergent preview URL
- Supervisor restarted – both services RUNNING

## Test Status (Iteration 8, Apr 17, 2026)
- **Backend:** 17/17 passed (100%)
  - All public endpoints (/api/, /valorant/agents, /valorant/skins, /lol/champions, /profiles)
  - All auth gates (401/403 on unauthed/non-admin requests)
  - Error handling (400 invalid category, 502 graceful LZT fallback with empty token)
  - External API proxy + MongoDB cache verified

## Known Non-Issues
- `/api/market/search/{valorant|lol}` returns 502 because **LZT_MARKET_TOKEN is empty**. Expected; user must add a real LZT Market API token to `/app/backend/.env` for live market data.

## Next Action Items / Backlog
- P0: Obtain & set `LZT_MARKET_TOKEN` in `/app/backend/.env` to enable live market listings
- P0: Sign in once via Google OAuth to seed `ADMIN_EMAIL` (first signed-in user becomes admin)
- P1: Admin creates Fetch Profiles from LZT URLs → enables sub-category tabs in marketplace
- P2: Frontend E2E test (login, filter, favorite, compare, buy modal)
