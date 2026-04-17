# Game Vault - Premium Game Account Marketplace

## Architecture
- Frontend: React + Tailwind + Framer Motion | Backend: FastAPI + MongoDB
- Auth: Emergent Google OAuth | APIs: LZT Market, Valorant-API, DataDragon

## Routes
- / → Landing | /market → Marketplace | /admin → Admin (sidebar layout)

## Features
- White-labeled "Game Vault" brand (zero LZT exposure to buyers)
- URL Profile system (admin pastes market URLs → sub-category tabs)
- Base/Default URLs for "All" categories (integrated in profile tab)
- Visual galleries: Valorant agents+skins, LoL champions+skin splashes
- Tracker links: Valorant Tracker, op.gg, u.gg
- Pricing: commission markup + fake 25% higher strikethrough
- Character splash backgrounds (agents/champions at 18% opacity)
- Admin sidebar: Fetch Profiles, Pricing, Settings
- Live API indicator: admin-only
- Currencies: USD, EUR, TRY, RUB
- Advanced filters with icons, rank range, min skins, knife toggle

## Test: 18/18 passed (100%)
