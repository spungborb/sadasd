const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Keys that LZT expects in array-bracket form (even for single values).
const ARRAY_KEYS = new Set([
  'valorant_region', 'lol_region', 'origin', 'not_origin',
  'rank', 'valorant_inventory_skin',
]);

function buildQuery(params) {
  const sp = new URLSearchParams();
  if (!params) return '';
  for (const [rawK, rawV] of Object.entries(params)) {
    if (rawV === undefined || rawV === null || rawV === '' || rawV === false) continue;
    const values = Array.isArray(rawV) ? rawV : [rawV];
    const key = ARRAY_KEYS.has(rawK) ? `${rawK}[]` : rawK;
    for (const v of values) {
      if (v === undefined || v === null || v === '') continue;
      sp.append(key, String(v));
    }
  }
  return sp.toString();
}

// ==================== MARKET ====================
export async function fetchMarketSearch(category = 'valorant', params = {}) {
  const qs = buildQuery(params);
  const resp = await fetch(`${API}/market/search/${category}?${qs}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function fetchByProfile(profileId, params = {}) {
  const qs = buildQuery(params);
  const resp = await fetch(`${API}/market/profile/${profileId}?${qs}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function fetchMarketItem(id) {
  const resp = await fetch(`${API}/market/item/${id}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function fetchLiveStats() {
  const resp = await fetch(`${API}/stats/live`);
  if (!resp.ok) throw new Error('stats error');
  return resp.json();
}
export async function fetchFeatured(category) {
  const resp = await fetch(`${API}/featured/${category}`);
  if (!resp.ok) throw new Error('featured error');
  return resp.json();
}

// ==================== PROFILES ====================
export async function fetchProfiles() {
  const resp = await fetch(`${API}/profiles`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function createProfile(data) {
  const resp = await fetch(`${API}/profiles`, { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(data) });
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || `Error: ${resp.status}`); }
  return resp.json();
}
export async function updateProfile(profileId, data) {
  const resp = await fetch(`${API}/profiles/${profileId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(data) });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}
export async function deleteProfile(profileId) {
  const resp = await fetch(`${API}/profiles/${profileId}`, { method: 'DELETE', credentials: 'include' });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}

// ==================== AUTH ====================
export async function exchangeSession(sessionId) {
  const resp = await fetch(`${API}/auth/session`, { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({session_id: sessionId}) });
  if (!resp.ok) throw new Error('Auth failed');
  return resp.json();
}
export async function fetchMe() {
  const resp = await fetch(`${API}/auth/me`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Not authenticated');
  return resp.json();
}
export async function logout() { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); }

// ==================== ADMIN ====================
export async function fetchAdminSettings() {
  const resp = await fetch(`${API}/admin/settings`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}
export async function updateAdminSettings(data) {
  const resp = await fetch(`${API}/admin/settings`, { method: 'PUT', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(data) });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}
export async function fetchAdminAnalytics() {
  const resp = await fetch(`${API}/admin/analytics`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}
export async function clearAdminCache(scope = 'search') {
  const resp = await fetch(`${API}/admin/cache/clear`, { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ scope }) });
  if (!resp.ok) throw new Error(`Error: ${resp.status}`);
  return resp.json();
}

// ==================== ORDERS / WALLET / TICKETS ====================
export async function fetchWallet() {
  const resp = await fetch(`${API}/wallet`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Not authenticated');
  return resp.json();
}
export async function createOrder(payload) {
  const resp = await fetch(`${API}/orders`, { method: 'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(payload) });
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || `Error: ${resp.status}`); }
  return resp.json();
}
export async function fetchOrders() {
  const resp = await fetch(`${API}/orders`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Not authenticated');
  return resp.json();
}
export async function revealOrderCredentials(orderId) {
  const resp = await fetch(`${API}/orders/${orderId}/reveal`, { method: 'POST', credentials: 'include' });
  if (!resp.ok) throw new Error('Reveal failed');
  return resp.json();
}
export async function fetchTickets() {
  const resp = await fetch(`${API}/tickets`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Not authenticated');
  return resp.json();
}
export async function fetchTicket(ticketId) {
  const resp = await fetch(`${API}/tickets/${ticketId}`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Not authenticated');
  return resp.json();
}
export async function createTicket(payload) {
  const resp = await fetch(`${API}/tickets`, { method: 'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(payload) });
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || `Error: ${resp.status}`); }
  return resp.json();
}
export async function replyTicket(ticketId, text) {
  const resp = await fetch(`${API}/tickets/${ticketId}/messages`, { method: 'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ text }) });
  if (!resp.ok) throw new Error('Reply failed');
  return resp.json();
}
export async function pollTicket(ticketId, since = '') {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  const resp = await fetch(`${API}/tickets/${ticketId}/poll${qs}`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Poll failed');
  return resp.json();
}
export async function fetchAdminTickets(status = '') {
  const qs = status ? `?status=${status}` : '';
  const resp = await fetch(`${API}/admin/tickets${qs}`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Admin only');
  return resp.json();
}
export async function adminReplyTicket(ticketId, text) {
  const resp = await fetch(`${API}/admin/tickets/${ticketId}/reply`, { method: 'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ text }) });
  if (!resp.ok) throw new Error('Reply failed');
  return resp.json();
}
export async function adminSetTicketStatus(ticketId, status) {
  const resp = await fetch(`${API}/admin/tickets/${ticketId}/status`, { method: 'POST', headers:{'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({ status }) });
  if (!resp.ok) throw new Error('Status update failed');
  return resp.json();
}

// ==================== FAVORITES ====================
const FAV_KEY = 'lzt_vault_favorites';
export function getLocalFavorites() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
function setLocalFavorites(items) { localStorage.setItem(FAV_KEY, JSON.stringify(items)); }
export function toggleLocalFavorite(id) { const f = getLocalFavorites(); const i = f.indexOf(id); if (i>=0) f.splice(i,1); else f.push(id); setLocalFavorites(f); return f; }
export function isLocalFavorite(id) { return getLocalFavorites().includes(id); }
export async function syncFavorites() { const local = getLocalFavorites(); const resp = await fetch(`${API}/favorites/sync`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify({items:local}) }); if (!resp.ok) return local; const data = await resp.json(); setLocalFavorites(data.items||[]); return data.items||[]; }
export async function addServerFavorite(id) { await fetch(`${API}/favorites/${id}`, { method:'POST', credentials:'include' }); }
export async function removeServerFavorite(id) { await fetch(`${API}/favorites/${id}`, { method:'DELETE', credentials:'include' }); }

// ==================== GAME DATA ====================
export async function fetchValorantSkins() { const resp = await fetch(`${API}/valorant/skins`); if (!resp.ok) throw new Error('Failed'); return resp.json(); }
export async function fetchValorantAgents() { const resp = await fetch(`${API}/valorant/agents`); if (!resp.ok) throw new Error('Failed'); return resp.json(); }
export async function fetchLolChampions() { const resp = await fetch(`${API}/lol/champions`); if (!resp.ok) throw new Error('Failed'); return resp.json(); }
export async function fetchLolSkinsAll() { const resp = await fetch(`${API}/lol/skins-all`); if (!resp.ok) throw new Error('Failed'); return resp.json(); }

// ==================== RANK HELPERS ====================
const VALORANT_RANKS = {0:'Unranked',3:'Iron 1',4:'Iron 2',5:'Iron 3',6:'Bronze 1',7:'Bronze 2',8:'Bronze 3',9:'Silver 1',10:'Silver 2',11:'Silver 3',12:'Gold 1',13:'Gold 2',14:'Gold 3',15:'Platinum 1',16:'Platinum 2',17:'Platinum 3',18:'Diamond 1',19:'Diamond 2',20:'Diamond 3',21:'Ascendant 1',22:'Ascendant 2',23:'Ascendant 3',24:'Immortal 1',25:'Immortal 2',26:'Immortal 3',27:'Radiant'};
export function getValorantRankName(r) { return VALORANT_RANKS[r] || 'Unranked'; }
export function getRankColorFromInt(r) { if(r<=2)return '#a1a1aa';if(r<=5)return '#8c8c8c';if(r<=8)return '#b87333';if(r<=11)return '#c0c0c0';if(r<=14)return '#ffd700';if(r<=17)return '#00bcd4';if(r<=20)return '#b388ff';if(r<=23)return '#00e676';if(r<=26)return '#ff4655';if(r===27)return '#ffe57f';return '#a1a1aa'; }
export function getCurrencySymbol(c) { return {usd:'$',eur:'\u20AC',rub:'\u20BD',gbp:'\u00A3',cny:'\u00A5',try:'\u20BA'}[c]||'$'; }

// ==================== TIER VALUE ORDER (Valorant skin sort) ====================
// Exclusive > Ultra > Premium > Deluxe > Select > Standard
export const SKIN_TIER_PRIORITY = { Exclusive: 6, Ultra: 5, Premium: 4, Deluxe: 3, Select: 2, Standard: 1 };
export function sortSkinsByValue(skins) {
  return [...skins].sort((a, b) => {
    const ap = SKIN_TIER_PRIORITY[a?.tier] || 0;
    const bp = SKIN_TIER_PRIORITY[b?.tier] || 0;
    if (bp !== ap) return bp - ap;
    return (a?.displayName || '').localeCompare(b?.displayName || '');
  });
}

// ==================== ORIGIN / TAG BLACKLIST ====================
// Internal scraping tags that must NEVER surface to buyers.
const BLACKLISTED_ORIGINS = new Set(['brute','resale','personal','personel','autoreg','auto_reg','auto reg','aute reg','self_registration','self-registration']);
export function isOriginBlacklisted(origin) {
  if (!origin) return true; // treat missing as hidden
  return BLACKLISTED_ORIGINS.has(String(origin).toLowerCase().trim());
}
// Re-exported no-ops kept for back-compat (components should not render origin)
export function getOriginLabel() { return ''; }
export function getOriginColor() { return ''; }

// ==================== VP / RP CALCULATORS ====================
export function getValorantWallet(item) {
  return {
    vp: Number(item?.riot_valorant_wallet_vp || 0),
    rp: Number(item?.riot_valorant_wallet_rp || 0),
    fa: Number(item?.riot_valorant_wallet_fa || 0),
  };
}
export function getLolWallet(item) {
  return {
    be: Number(item?.riot_lol_wallet_blue || 0),
    oe: Number(item?.riot_lol_wallet_orange || 0),
    mythic: Number(item?.riot_lol_wallet_mythic || 0),
    rp: Number(item?.riot_lol_wallet_riot || 0),
  };
}
export function formatCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num/1_000).toFixed(1)}K`;
  return String(num);
}
