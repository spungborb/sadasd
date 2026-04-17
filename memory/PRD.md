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
- Full repo mirrored to /app, LZT token configured, 41K+ live listings
- **Refactor Wave 1:** cards with agent portraits, VP/RP pills, tier-sorted skins, LoL real skin names, origin blacklist, premium FilterPanel, dynamic landing, admin Overview/Sync tabs
- **Refactor Wave 2 (Apr 17, 2026):**
  - Fixed broken filters: backend uses `query_params.multi_items()`, frontend uses bracketed array keys for LZT; region codes uppercase (LZT is case-sensitive)
  - Advanced filters added: Skin Search text input, dual-range sliders for Level/Skins/VP/RP (Valorant) and Level/Skins/BE/RP (LoL); LoL rank dropdown
  - Language & Currency moved from sidebar to Navbar via `LangCurrencySwitcher` + global `PrefContext`
  - Client-side currency conversion with fixed USD rates (USD/EUR/GBP/RUB/TRY), applied globally through `formatPrice()` in cards / modals / compare view
  - Featured Valorant/LoL carousels removed from Landing — flow now Hero → Live Stats → Why Game Vault
  - ProductCard redesign: image contains only top-left icons + top-right region badge (no bottom overlay); title = rank only; price prominent; unified stats pill row (LV, Skins, Agents, Knives, VP, RP / LV, Skins, Champs, BE, RP)

## Test Status
- **Iteration 10 (Apr 17, 2026):** Backend 16/16 passed (100%) — filter pipeline validated
- **Iteration 9:** 29/29 passed — new endpoints + auth gates
- **Iteration 8:** 17/17 passed — baseline

## Known Non-Issues
- `/api/featured/lol` returns 0 items when LoL cache empty (expected graceful fallback).

## Next Action Items / Backlog
- P0: Obtain & set `LZT_MARKET_TOKEN` in `/app/backend/.env` to enable live market listings
- P0: Sign in once via Google OAuth to seed `ADMIN_EMAIL` (first signed-in user becomes admin)
- P1: Admin creates Fetch Profiles from LZT URLs → enables sub-category tabs in marketplace
- P2: Frontend E2E test (login, filter, favorite, compare, buy modal)
