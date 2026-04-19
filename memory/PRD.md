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
- Full repo mirrored to /app, LZT token configured
- **Wave 1:** cards with agent portraits, VP/RP pills, tier-sorted skins, LoL real skin names, origin blacklist, premium FilterPanel, dynamic landing, admin Overview/Sync tabs
- **Wave 2:** filter bugfix (LZT case-sensitive regions + multi_items), advanced filters (skin search, dual sliders), Language/Currency to Navbar (global PrefContext + formatPrice), Featured carousels removed, ProductCard unified stats row
- **Wave 3 (Apr 17-19, 2026) — User Dashboard + Ticket System + Telegram:**
  - New route `/dashboard` with 4 tabs: Account Settings (Google profile, timezone, language), Store Balance (wallet card + transactions), Purchase Vault (orders with credential reveal + live warranty countdown), Support Tickets (create/reply with polling)
  - Demo "Buy" button on ProductModal → creates mock order with dummy credentials; warranty 7d if `is_trusted_seller` (extended_guarantee>0 OR item_origin in personal/autoreg OR nsb==1), else 0d
  - Tickets: TKT-{seq:04d} IDs from `db.counters`, embedded messages array, statuses open/pending_user/closed
  - Admin Support panel (`/admin → Support`): filter by status, thread view, reply, close/reopen
  - **2-way Telegram webhook**: outbound on ticket events → sends formatted message to admin chat; inbound `/api/webhook/social-reply` parses `"#seq message"` or `"seq: message"` → appends admin reply, status → pending_user
  - Secret-gated webhook (`X-Telegram-Bot-Api-Secret-Token`), admin chat restriction (bypassed while placeholder)
  - Frontend polling every 20-30s on open ticket thread

## Test Status
- **Iteration 11 (Apr 19, 2026):** Backend 30/30 passed (100%) — dashboard + tickets + webhook
- **Iteration 10:** 16/16 — filter pipeline
- **Iteration 9:** 29/29 — landing + admin analytics endpoints
- **Iteration 8:** 17/17 — baseline

## Known Non-Issues
- `/api/featured/lol` returns 0 items when LoL cache empty (expected graceful fallback).

## Next Action Items / Backlog
- P0: Obtain & set `LZT_MARKET_TOKEN` in `/app/backend/.env` to enable live market listings
- P0: Sign in once via Google OAuth to seed `ADMIN_EMAIL` (first signed-in user becomes admin)
- P1: Admin creates Fetch Profiles from LZT URLs → enables sub-category tabs in marketplace
- P2: Frontend E2E test (login, filter, favorite, compare, buy modal)
