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
- Python & Node deps installed, supervisor running
- LZT_MARKET_TOKEN configured → 35K+ live listings live
- **Refactor Wave 1 (Apr 17, 2026):**
  - Product cards: real Valorant agent portraits (fullPortrait + gradient bg) + LoL splash art, defensive image fallback
  - Valorant skin inventory sorted by tier value (Exclusive → Ultra → Premium → Deluxe → Select → Standard)
  - LoL skin names mapped via CommunityDragon (real skin names, not just champion name)
  - Tag blacklist enforced: brute/resale/personal/personel/autoreg never rendered
  - Origin filter removed entirely
  - VP/RP totals on product cards (pills) AND modal (gradient highlight cards)
  - New premium `FilterPanel.jsx` with collapsible sections, chip region selector, glassmorphism
  - Dynamic landing page: animated count-up live stats + Featured Valorant/LoL carousels
  - Admin panel expanded: Overview (recharts: line/pie/bar), Sync Status (cache metrics + quick-clear actions)
  - New backend endpoints: /api/stats/live, /api/featured/{category}, /api/lol/skins-all, /api/admin/analytics, /api/admin/cache/clear
  - /api/valorant/agents now returns backgroundGradientColors

## Test Status
- **Iteration 9 (Apr 17, 2026):** Backend 29/29 passed (100%). No critical/minor issues.
- **Iteration 8:** Baseline 17/17 passed.

## Known Non-Issues
- `/api/featured/lol` returns 0 items when LoL cache empty (expected graceful fallback).

## Next Action Items / Backlog
- P0: Obtain & set `LZT_MARKET_TOKEN` in `/app/backend/.env` to enable live market listings
- P0: Sign in once via Google OAuth to seed `ADMIN_EMAIL` (first signed-in user becomes admin)
- P1: Admin creates Fetch Profiles from LZT URLs → enables sub-category tabs in marketplace
- P2: Frontend E2E test (login, filter, favorite, compare, buy modal)
