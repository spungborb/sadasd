import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, ShieldCheck, ShieldAlert, Crosshair, Sparkles, Star, Clock, TrendingUp, Swords, Gem, Eye, Heart, Gamepad2, Globe, Users, Tag, Loader2, Crown, Trophy, Coins, CircleDollarSign, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { getValorantRankName, getRankColorFromInt, isLocalFavorite, toggleLocalFavorite, fetchMarketItem, fetchValorantSkins, fetchValorantAgents, fetchLolChampions, fetchLolSkinsAll, getCurrencySymbol, addServerFavorite, removeServerFavorite, sortSkinsByValue, formatCompact } from '@/data/api';

const TIER_COLORS = { Deluxe:'from-emerald-800 to-emerald-950 border-emerald-500/30', Premium:'from-purple-800 to-purple-950 border-purple-500/30', Select:'from-zinc-700 to-zinc-800 border-zinc-500/30', Ultra:'from-amber-800 to-amber-950 border-amber-500/30', Exclusive:'from-red-800 to-red-950 border-valorant/30', Standard:'from-zinc-800 to-zinc-900 border-zinc-600/30' };
const LOL_RANK_COLORS = { IRON:'#8c8c8c', BRONZE:'#b87333', SILVER:'#c0c0c0', GOLD:'#ffd700', PLATINUM:'#00bcd4', EMERALD:'#00e676', DIAMOND:'#b388ff', MASTER:'#9d4dbb', GRANDMASTER:'#ff4655', CHALLENGER:'#ffe57f' };
function getLolRankColor(rank) { if (!rank) return '#a1a1aa'; return LOL_RANK_COLORS[rank.split(' ')[0].toUpperCase()] || '#a1a1aa'; }

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900/80 border border-white/5">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${color}15` }}><Icon className="w-5 h-5" style={{ color }} /></div>
      <span className="text-lg font-heading font-bold text-white">{value}</span>
      <span className="text-[10px] font-body text-zinc-500 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function SkinGalleryCard({ skin }) {
  const tc = TIER_COLORS[skin.tier] || TIER_COLORS.Standard;
  return (
    <div className={`break-inside-avoid mb-3 rounded-lg bg-gradient-to-br ${tc} border overflow-hidden hover:scale-[1.02] transition-transform`}>
      {skin.displayIcon && <img src={skin.displayIcon} alt={skin.displayName} className="w-full h-20 object-contain p-2 bg-black/20" loading="lazy" />}
      <div className="p-2.5">
        <p className="text-xs font-heading font-bold text-white truncate">{skin.displayName}</p>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/30 text-zinc-300 uppercase">{skin.tier}</span>
      </div>
    </div>
  );
}

// Map region codes for tracker URLs
const VAL_REGION_MAP = { 'EU':'eu', 'NA':'na', 'AP':'ap', 'KR':'kr', 'BR':'br', 'LATAM':'latam' };
const LOL_REGION_MAP = { 'EUW1':'euw', 'EUN1':'eune', 'NA1':'na', 'KR':'kr', 'JP1':'jp', 'OC1':'oce', 'BR1':'br', 'LA1':'lan', 'LA2':'las', 'RU':'ru', 'TR1':'tr', 'SG2':'sg', 'PH2':'ph', 'TW2':'tw', 'VN2':'vn', 'TH2':'th' };

function buildTrackerUrl(item, category) {
  const riotId = item.riot_username || '';
  if (!riotId) return null;
  // Riot ID format: "Name#Tag"
  const encoded = encodeURIComponent(riotId.replace('#', '%23'));
  const plainEncoded = riotId.replace('#', '%23');
  if (category === 'valorant') {
    return `https://tracker.gg/valorant/profile/riot/${plainEncoded}/overview`;
  }
  return null;
}

function buildOpggUrl(item) {
  const riotId = item.riot_username || '';
  const region = LOL_REGION_MAP[item.riot_lol_region] || 'euw';
  if (!riotId) return null;
  const namePart = riotId.replace('#', '-');
  return `https://www.op.gg/summoners/${region}/${encodeURIComponent(namePart)}`;
}

function buildUggUrl(item) {
  const riotId = item.riot_username || '';
  const region = LOL_REGION_MAP[item.riot_lol_region] || 'euw';
  if (!riotId) return null;
  const namePart = riotId.replace('#', '-');
  return `https://u.gg/lol/profile/${region}/${encodeURIComponent(namePart)}/overview`;
}

export default function LztPreviewModal({ product, category, onClose }) {
  const [fav, setFav] = useState(isLocalFavorite(product.item_id));
  const [detailedItem, setDetailedItem] = useState(null);
  const [allSkins, setAllSkins] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [lolChampData, setLolChampData] = useState(null);
  const [lolSkinsAll, setLolSkinsAll] = useState(null);
  const [skinsLoading, setSkinsLoading] = useState(true);

  useEffect(() => {
    fetchMarketItem(product.item_id).then(d => { if (d?.item) setDetailedItem(d.item); }).catch(() => {});
  }, [product.item_id]);

  useEffect(() => {
    if (category === 'valorant') {
      Promise.all([
        fetchValorantSkins().then(d => setAllSkins(d.skins || [])),
        fetchValorantAgents().then(d => setAllAgents(d.agents || [])),
      ]).catch(() => {}).finally(() => setSkinsLoading(false));
    } else if (category === 'lol') {
      Promise.all([
        fetchLolChampions().then(d => setLolChampData(d)),
        fetchLolSkinsAll().then(d => setLolSkinsAll(d.skins || {})).catch(() => setLolSkinsAll({})),
      ]).catch(() => {}).finally(() => setSkinsLoading(false));
    } else {
      setSkinsLoading(false);
    }
  }, [category]);

  const item = detailedItem || product;
  const isVal = category === 'valorant';
  const isLol = category === 'lol';
  const cs = getCurrencySymbol(item.price_currency);
  const publishedDate = item.published_date ? new Date(item.published_date * 1000) : null;

  // Valorant
  const valRankInt = item.riot_valorant_rank || 0;
  const valRankName = item.valorantRankTitle || getValorantRankName(valRankInt);
  const valRankColor = getRankColorFromInt(valRankInt);
  const valRegion = item.riot_valorant_region || '';
  const valSkinCount = item.riot_valorant_skin_count || 0;
  const valLevel = item.riot_valorant_level || 0;
  const vp = item.riot_valorant_wallet_vp || 0;
  const rp = item.riot_valorant_wallet_rp || 0;
  const agentCount = item.riot_valorant_agent_count || 0;
  const knifeCount = item.riot_valorant_knife_count || 0;
  const lastActivity = item.riot_last_activity ? new Date(item.riot_last_activity * 1000) : null;
  const daysAgo = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / (1000*60*60*24)) : null;
  const isRecentlyActive = daysAgo !== null && daysAgo < 7;

  // LoL
  const lolRegion = item.lolRegionPhrase || item.riot_lol_region || '';
  const lolSkinCount = item.riot_lol_skin_count || 0;
  const lolChampCount = item.riot_lol_champion_count || 0;
  const lolLevel = item.riot_lol_level || 0;
  const lolRank = item.riot_lol_rank || 'Unranked';
  const lolRankColor = getLolRankColor(lolRank);
  const lolBlue = item.riot_lol_wallet_blue || 0;
  const lolOrange = item.riot_lol_wallet_orange || 0;
  const lolMythic = item.riot_lol_wallet_mythic || 0;
  const lolRiot = item.riot_lol_wallet_riot || 0;

  const region = isVal ? valRegion : lolRegion;
  const rankName = isVal ? valRankName : lolRank;
  const rankColor = isVal ? valRankColor : lolRankColor;
  const skinCount = isVal ? valSkinCount : lolSkinCount;
  const level = isVal ? valLevel : lolLevel;

  const feedbackData = typeof item.feedback_data === 'string' ? JSON.parse(item.feedback_data || '{}') : (item.feedback_data || {});
  const catFb = feedbackData[String(item.category_id)] || feedbackData['13'] || {};

  // Pricing — use compare_price (fake higher), NEVER show base price
  const comparePrice = item.compare_price || (item.price ? Math.round(item.price * 1.25 * 100) / 100 : null);

  // Tracker URLs
  const trackerUrl = isVal ? buildTrackerUrl(item, 'valorant') : null;
  const opggUrl = isLol ? buildOpggUrl(item) : null;
  const uggUrl = isLol ? buildUggUrl(item) : null;

  // Valorant: match actual skin inventory by UUID + sort by tier value (Exclusive → Standard)
  const matchedSkins = useMemo(() => {
    if (!isVal || allSkins.length === 0) return [];
    const inv = item.valorantInventory || detailedItem?.valorantInventory;
    if (!inv?.WeaponSkins) return [];
    const uuids = new Set(Array.isArray(inv.WeaponSkins) ? inv.WeaponSkins : Object.values(inv.WeaponSkins));
    const matched = allSkins.filter(s => uuids.has(s.uuid));
    return sortSkinsByValue(matched);
  }, [item, detailedItem, allSkins, isVal]);

  // Valorant: match actual agents
  const matchedAgents = useMemo(() => {
    if (!isVal || allAgents.length === 0) return [];
    const inv = item.valorantInventory || detailedItem?.valorantInventory;
    if (!inv?.Agent) return [];
    const agentUuids = new Set(inv.Agent);
    return allAgents.filter(a => agentUuids.has(a.uuid));
  }, [item, detailedItem, allAgents, isVal]);

  // LoL: match champions
  const matchedChampions = useMemo(() => {
    if (!isLol || !lolChampData) return [];
    const inv = item.lolInventory || detailedItem?.lolInventory;
    if (!inv?.Champion) return [];
    return inv.Champion.map(key => lolChampData.champions?.[String(key)]).filter(Boolean).slice(0, 40);
  }, [item, detailedItem, lolChampData, isLol]);

  // LoL: match skins — use CommunityDragon skin_id map for REAL names (not just champion name)
  const matchedLolSkins = useMemo(() => {
    if (!isLol || !lolChampData) return [];
    const inv = item.lolInventory || detailedItem?.lolInventory;
    if (!inv?.Skin) return [];
    const skinEntries = Array.isArray(inv.Skin) ? inv.Skin : Object.values(inv.Skin);
    return skinEntries.map(skinId => {
      const id = Number(skinId);
      const champKey = String(Math.floor(id / 1000));
      const skinNum = id % 1000;
      const champ = lolChampData.champions?.[champKey];
      if (!champ) return null;
      // Prefer real skin name from Community Dragon map
      const real = lolSkinsAll?.[String(id)];
      const displayName = (real?.name && real.name.toLowerCase() !== champ.name.toLowerCase())
        ? real.name
        : (skinNum === 0 ? `${champ.name} (Classic)` : `${champ.name} Skin ${skinNum}`);
      const splash = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ.id}_${skinNum}.jpg`;
      return { name: displayName, splash, champName: champ.name, skinId: id };
    }).filter(Boolean).slice(0, 40);
  }, [item, detailedItem, lolChampData, lolSkinsAll, isLol]);

  const handleFav = () => { const nf = toggleLocalFavorite(product.item_id); setFav(nf.includes(product.item_id)); addServerFavorite(product.item_id).catch(() => {}); };

  return (
    <motion.div data-testid="preview-modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} transition={{type:'spring',damping:25,stiffness:300}}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto glass rounded-2xl">
        <div>
          {/* Header */}
          <div className="relative h-44 sm:h-52 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
            <div className="absolute inset-0 overflow-hidden"><div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 blur-2xl" style={{backgroundColor:rankColor}} /></div>
            <button data-testid="close-modal-btn" onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            <button data-testid="modal-fav-btn" onClick={handleFav} className="absolute top-4 right-16 z-10 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center"><Heart className={`w-4 h-4 ${fav?'fill-valorant text-valorant':'text-zinc-400'}`} /></button>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-900/95 to-transparent">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {region && <Badge className="text-[10px] bg-zinc-800/80 text-zinc-300 border-zinc-700/50">{region}</Badge>}
                    {item.nsb === 1 && <Badge className="text-[10px] bg-electric/10 text-electric border-electric/30">NSB</Badge>}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-bold text-white truncate">{region} | {rankName} | {skinCount} Skins</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.view_count||0}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-emerald-400" />+{catFb.positive||0}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl sm:text-4xl font-heading font-bold text-white">{cs}{item.price?.toFixed?.(2)}</p>
                  {comparePrice && <p className="text-xs text-zinc-500 line-through">{cs}{comparePrice.toFixed(2)}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Buy + Tracker buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button data-testid="buy-now-btn" className="flex-1 py-3.5 bg-valorant text-white font-heading font-bold text-sm uppercase tracking-widest rounded-lg text-center hover:bg-valorant-hover animate-neon-pulse transition-all">
                Buy Now - {cs}{item.price?.toFixed?.(2)}
              </button>
              {isVal && trackerUrl && (
                <a data-testid="tracker-btn" href={trackerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-800/80 border border-white/10 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 hover:text-white transition-all">
                  <ExternalLink className="w-4 h-4" />Valorant Tracker
                </a>
              )}
              {isLol && opggUrl && (
                <a data-testid="opgg-btn" href={opggUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-800/80 border border-white/10 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 hover:text-white transition-all">
                  <ExternalLink className="w-4 h-4" />op.gg
                </a>
              )}
              {isLol && uggUrl && (
                <a data-testid="ugg-btn" href={uggUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-800/80 border border-white/10 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 hover:text-white transition-all">
                  <ExternalLink className="w-4 h-4" />u.gg
                </a>
              )}
            </div>

            {/* Security */}
            <div data-testid="security-banner" className={`flex items-center gap-3 p-4 rounded-xl border-l-4 ${isRecentlyActive ? 'bg-amber-500/5 border-amber-500 text-amber-400' : 'bg-emerald-500/5 border-emerald-500 text-emerald-400'}`}>
              {isRecentlyActive ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <ShieldCheck className="w-5 h-5 shrink-0" />}
              <div><p className="text-sm font-semibold">{isRecentlyActive ? 'Recently Active' : 'Account Safe'}</p><p className="text-xs opacity-70 mt-0.5">{isRecentlyActive ? `Active ${daysAgo===0?'today':`${daysAgo}d ago`}` : daysAgo!==null ? `Inactive ${daysAgo}d` : 'Status nominal'}</p></div>
            </div>

            {/* VALORANT STATS */}
            {isVal && (
              <>
                <div data-testid="stat-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox icon={Crosshair} label="Rank" value={valRankName} color={valRankColor} />
                  <StatBox icon={TrendingUp} label="Level" value={valLevel} color="#00e5ff" />
                  <StatBox icon={Gem} label="VP" value={vp.toLocaleString()} color="#a78bfa" />
                  <StatBox icon={Sparkles} label="Radianite" value={rp} color="#fbbf24" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Gamepad2 className="w-4 h-4 text-zinc-500" /><div><p className="text-xs text-zinc-500">Agents</p><p className="text-sm font-semibold text-white">{agentCount}</p></div></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Swords className="w-4 h-4 text-zinc-500" /><div><p className="text-xs text-zinc-500">Knives</p><p className="text-sm font-semibold text-white">{knifeCount}</p></div></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Sparkles className="w-4 h-4 text-zinc-500" /><div><p className="text-xs text-zinc-500">Skins</p><p className="text-sm font-semibold text-white">{valSkinCount}</p></div></div>
                </div>
                {/* Total Wallet highlight */}
                <div data-testid="val-wallet-totals" className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center"><Gem className="w-4 h-4 text-purple-300" /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-purple-300/70">Total VP</p><p className="text-lg font-heading font-extrabold text-white">{formatCompact(vp)}</p></div></div>
                    <span className="text-[10px] text-purple-300/50 font-mono">{vp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-amber-300" /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/70">Total RP</p><p className="text-lg font-heading font-extrabold text-white">{formatCompact(rp)}</p></div></div>
                    <span className="text-[10px] text-amber-300/50 font-mono">{rp.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}

            {/* LOL STATS */}
            {isLol && (
              <>
                <div data-testid="stat-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox icon={Crown} label="Rank" value={lolRank} color={lolRankColor} />
                  <StatBox icon={TrendingUp} label="Level" value={lolLevel} color="#00e5ff" />
                  <StatBox icon={Trophy} label="Champions" value={lolChampCount} color="#a78bfa" />
                  <StatBox icon={Sparkles} label="Skins" value={lolSkinCount} color="#fbbf24" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Coins className="w-4 h-4 text-blue-400" /><div><p className="text-xs text-zinc-500">Blue Essence</p><p className="text-sm font-semibold text-white">{lolBlue.toLocaleString()}</p></div></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Coins className="w-4 h-4 text-orange-400" /><div><p className="text-xs text-zinc-500">Orange Essence</p><p className="text-sm font-semibold text-white">{lolOrange.toLocaleString()}</p></div></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><Gem className="w-4 h-4 text-purple-400" /><div><p className="text-xs text-zinc-500">Mythic Essence</p><p className="text-sm font-semibold text-white">{lolMythic}</p></div></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-white/5"><CircleDollarSign className="w-4 h-4 text-amber-400" /><div><p className="text-xs text-zinc-500">Riot Points</p><p className="text-sm font-semibold text-white">{lolRiot}</p></div></div>
                </div>
              </>
            )}

            <Separator className="bg-white/5" />

            {/* VALORANT AGENT GALLERY */}
            {isVal && matchedAgents.length > 0 && (
              <div data-testid="agent-gallery">
                <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">Agents ({matchedAgents.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {matchedAgents.map(a => (
                    <div key={a.uuid} className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-white/5" title={a.displayName}>
                      <img src={a.displayIcon} alt={a.displayName} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VALORANT SKIN INVENTORY */}
            {isVal && (
              <div data-testid="skin-gallery">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Weapon Skins</h3>
                  <span className="text-xs text-zinc-500">{skinsLoading ? 'Loading...' : `${matchedSkins.length} matched / ${valSkinCount} total`}</span>
                </div>
                {skinsLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
                : matchedSkins.length > 0 ? <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">{matchedSkins.map((s,i) => <SkinGalleryCard key={`${s.uuid}-${i}`} skin={s} />)}</div>
                : <p className="text-xs text-zinc-600 text-center py-4">{detailedItem ? 'No inventory data available.' : 'Loading...'}</p>}
              </div>
            )}

            {/* LOL CHAMPION GALLERY */}
            {isLol && matchedChampions.length > 0 && (
              <div data-testid="champion-gallery">
                <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">Champions ({matchedChampions.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {matchedChampions.map(c => (
                    <div key={c.id} className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-white/5" title={c.name}>
                      <img src={c.icon} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOL SKIN GALLERY */}
            {isLol && matchedLolSkins.length > 0 && (
              <div data-testid="lol-skin-gallery">
                <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">Skins ({matchedLolSkins.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {matchedLolSkins.map((s,i) => (
                    <div key={i} className="rounded-lg overflow-hidden bg-zinc-800 border border-white/5 hover:scale-[1.02] transition-transform">
                      <img src={s.splash} alt={s.name} onError={e => { e.currentTarget.style.display = 'none'; }} className="w-full h-20 object-cover" loading="lazy" />
                      <div className="p-2"><p className="text-xs font-heading font-bold text-white truncate" title={s.name}>{s.name}</p><p className="text-[9px] text-zinc-400">{s.champName}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.description && (
              <div data-testid="seller-notes">
                <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">Description</h3>
                <blockquote className="relative p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                  <Tag className="absolute top-3 left-3 w-5 h-5 text-zinc-700" />
                  <p className="pl-7 text-sm text-zinc-400 leading-relaxed">{item.description}</p>
                </blockquote>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-500">
              {publishedDate && <div className="flex items-center gap-2"><Clock className="w-3 h-3" />Published: {publishedDate.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</div>}
              {lastActivity && <div className="flex items-center gap-2"><Clock className="w-3 h-3" />Last active: {lastActivity.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</div>}
              {item.email_type && <div className="flex items-center gap-2"><Globe className="w-3 h-3" />Email: {item.email_type}</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
