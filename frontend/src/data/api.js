const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ==================== MARKET ====================
export async function fetchMarketSearch(category = 'valorant', params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') sp.set(k, String(v)); });
  const resp = await fetch(`${API}/market/search/${category}?${sp.toString()}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function fetchByProfile(profileId, params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') sp.set(k, String(v)); });
  const resp = await fetch(`${API}/market/profile/${profileId}?${sp.toString()}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}
export async function fetchMarketItem(id) {
  const resp = await fetch(`${API}/market/item/${id}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
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

// ==================== RANK HELPERS ====================
const VALORANT_RANKS = {0:'Unranked',3:'Iron 1',4:'Iron 2',5:'Iron 3',6:'Bronze 1',7:'Bronze 2',8:'Bronze 3',9:'Silver 1',10:'Silver 2',11:'Silver 3',12:'Gold 1',13:'Gold 2',14:'Gold 3',15:'Platinum 1',16:'Platinum 2',17:'Platinum 3',18:'Diamond 1',19:'Diamond 2',20:'Diamond 3',21:'Ascendant 1',22:'Ascendant 2',23:'Ascendant 3',24:'Immortal 1',25:'Immortal 2',26:'Immortal 3',27:'Radiant'};
export function getValorantRankName(r) { return VALORANT_RANKS[r] || 'Unranked'; }
export function getRankColorFromInt(r) { if(r<=2)return '#a1a1aa';if(r<=5)return '#8c8c8c';if(r<=8)return '#b87333';if(r<=11)return '#c0c0c0';if(r<=14)return '#ffd700';if(r<=17)return '#00bcd4';if(r<=20)return '#b388ff';if(r<=23)return '#00e676';if(r<=26)return '#ff4655';if(r===27)return '#ffe57f';return '#a1a1aa'; }
export function getOriginLabel(o) { return {personal:'Personal',brute:'Brute',resale:'Resale',autoreg:'Auto-Reg',phishing:'Phish',stealer:'Stealer',dummy:'Dummy',self_registration:'Self-Reg'}[o]||o; }
export function getOriginColor(o) { return {personal:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',brute:'bg-red-500/20 text-red-400 border-red-500/30',resale:'bg-amber-500/20 text-amber-400 border-amber-500/30',autoreg:'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',phishing:'bg-orange-500/20 text-orange-400 border-orange-500/30',stealer:'bg-rose-500/20 text-rose-400 border-rose-500/30'}[o]||'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'; }
export function getCurrencySymbol(c) { return {usd:'$',eur:'\u20AC',rub:'\u20BD',gbp:'\u00A3',cny:'\u00A5',try:'\u20BA'}[c]||'$'; }
