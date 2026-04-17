import { motion } from 'framer-motion';
import { Crosshair, Sparkles, Globe, Heart, Swords, GitCompare, Check, Crown, Trophy, Gem, CircleDollarSign, TrendingUp } from 'lucide-react';
import { getValorantRankName, getRankColorFromInt, isLocalFavorite, toggleLocalFavorite, addServerFavorite, removeServerFavorite, getValorantWallet, getLolWallet, formatCompact, fetchValorantAgents } from '@/data/api';
import { usePrefs, formatPrice } from '@/context/PrefContext';
import { useState, useMemo, useEffect } from 'react';

const LOL_RANK_COLORS = { IRON:'#8c8c8c', BRONZE:'#b87333', SILVER:'#c0c0c0', GOLD:'#ffd700', PLATINUM:'#00bcd4', EMERALD:'#00e676', DIAMOND:'#b388ff', MASTER:'#9d4dbb', GRANDMASTER:'#ff4655', CHALLENGER:'#ffe57f' };
function getLolRankColor(rank) { if (!rank) return '#a1a1aa'; return LOL_RANK_COLORS[rank.split(' ')[0].toUpperCase()] || '#a1a1aa'; }

const LOL_CHAMP_BGS = [
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Thresh_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/LeeSin_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Katarina_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Darius_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MissFortune_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_0.jpg',
  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/KaiSa_0.jpg',
];

let _agentsCache = null;
async function getAgents() {
  if (_agentsCache) return _agentsCache;
  try { const d = await fetchValorantAgents(); _agentsCache = d.agents || []; } catch { _agentsCache = []; }
  return _agentsCache;
}

function hashIndex(id, mod) { const n = Math.abs(Number(id) || 0); return n % Math.max(1, mod); }

function Pill({ icon: Icon, children, color = 'zinc', testId }) {
  const bg = {
    zinc:   'bg-zinc-800/80 text-zinc-300 border-white/5',
    amber:  'bg-amber-500/15 text-amber-300 border-amber-500/25',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    electric:'bg-electric/15 text-electric border-electric/25',
    valorant:'bg-valorant/15 text-valorant border-valorant/25',
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/25',
  }[color] || 'bg-zinc-800/80 text-zinc-300 border-white/5';
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold ${bg}`}>
      {Icon && <Icon className="w-3 h-3" />}{children}
    </span>
  );
}

export default function ProductCard({ product, onClick, index, category, compareItems, onToggleCompare, user }) {
  const { currency } = usePrefs();
  const [fav, setFav] = useState(isLocalFavorite(product.item_id));
  const [agents, setAgents] = useState([]);
  const [imgOk, setImgOk] = useState(true);
  const isVal = category === 'valorant';
  const isLol = category === 'lol';
  const isComparing = compareItems?.some(p => p.item_id === product.item_id);

  useEffect(() => { if (isVal) getAgents().then(setAgents); }, [isVal]);

  const agent = useMemo(() => {
    if (!isVal || agents.length === 0) return null;
    return agents[hashIndex(product.item_id || index, agents.length)];
  }, [isVal, agents, product.item_id, index]);

  const lolBg = useMemo(() => LOL_CHAMP_BGS[hashIndex(product.item_id || index, LOL_CHAMP_BGS.length)], [product.item_id, index]);

  const gradCSS = useMemo(() => {
    if (!agent?.backgroundGradientColors?.length) return 'linear-gradient(135deg, #1a0b1e 0%, #0f0f13 100%)';
    const cols = agent.backgroundGradientColors.slice(0, 4).map(c => `#${c.slice(0, 6)}`);
    return `linear-gradient(135deg, ${cols.join(', ')})`;
  }, [agent]);

  // Valorant stats
  const valRankInt = product.riot_valorant_rank || 0;
  const valRankName = product.valorantRankTitle || getValorantRankName(valRankInt);
  const valRankColor = getRankColorFromInt(valRankInt);
  const valRegion = product.riot_valorant_region || '';
  const valSkinCount = product.riot_valorant_skin_count || 0;
  const valLevel = product.riot_valorant_level || 0;
  const valKnifeCount = product.riot_valorant_knife_count || 0;
  const valAgentCount = product.riot_valorant_agent_count || 0;
  const valWallet = getValorantWallet(product);

  // LoL stats
  const lolRegion = product.riot_lol_region || product.lolRegionPhrase || '';
  const lolSkinCount = product.riot_lol_skin_count || 0;
  const lolChampCount = product.riot_lol_champion_count || 0;
  const lolLevel = product.riot_lol_level || 0;
  const lolRank = product.riot_lol_rank || '';
  const lolRankColor = getLolRankColor(lolRank);
  const lolWallet = getLolWallet(product);

  // TITLE: ONLY Rank (or "Unranked") — no region/skin count repeat.
  const titleText = isVal ? (valRankName || 'Unranked') : isLol ? (lolRank || 'Unranked') : (product.title || `#${product.item_id}`);
  const rankColor = isVal ? valRankColor : lolRankColor;
  const region = isVal ? valRegion : lolRegion;

  const handleFav = (e) => { e.stopPropagation(); const nf = toggleLocalFavorite(product.item_id); const nv = nf.includes(product.item_id); setFav(nv); if (user) { nv ? addServerFavorite(product.item_id) : removeServerFavorite(product.item_id); } };
  const handleCompare = (e) => { e.stopPropagation(); onToggleCompare?.(product); };

  return (
    <motion.div data-testid={`product-card-${product.item_id}`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.4) }}
      whileHover={{ y: -5 }} onClick={() => onClick(product)}
      className={`group cursor-pointer bg-zinc-950 border rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-[0_12px_40px_rgba(255,70,85,0.18)] ${isComparing ? 'border-electric/50 shadow-[0_0_20px_rgba(0,229,255,0.15)]' : 'border-white/5 hover:border-valorant/40'}`}>

      {/* ===== HEADER IMAGE (icons + region only) ===== */}
      <div className="h-44 relative overflow-hidden" style={isVal ? { background: gradCSS } : undefined}>
        {isVal && agent?.fullPortrait && imgOk && (
          <img src={agent.fullPortrait} alt="" onError={() => setImgOk(false)} loading="lazy"
            className="absolute -right-4 -bottom-2 h-[120%] w-auto object-contain opacity-90 drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] pointer-events-none transition-transform duration-500 group-hover:scale-105" />
        )}
        {isLol && imgOk && (
          <img src={lolBg} alt="" onError={() => setImgOk(false)} loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        )}
        {/* Soft overall dim — NO bottom-text gradient (removed rank/game/level overlay) */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/20 pointer-events-none" />

        {/* Top-left: Heart + Compare */}
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button data-testid={`fav-btn-${product.item_id}`} onClick={handleFav} aria-label="Favorite"
            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 transition-colors">
            <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-valorant text-valorant' : 'text-white/80'}`} />
          </button>
          <button data-testid={`compare-btn-${product.item_id}`} onClick={handleCompare} aria-label="Compare"
            className={`w-8 h-8 rounded-lg backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors ${isComparing ? 'bg-electric/30 hover:bg-electric/40' : 'bg-black/60 hover:bg-black/80'}`}>
            {isComparing ? <Check className="w-3.5 h-3.5 text-electric" /> : <GitCompare className="w-3.5 h-3.5 text-white/80" />}
          </button>
        </div>

        {/* Top-right: Region badge ONLY */}
        {region && (
          <div className="absolute top-3 right-3 z-10">
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-white">
              <Globe className="w-2.5 h-2.5" />{region}
            </span>
          </div>
        )}
      </div>

      {/* ===== BODY ===== */}
      <div className="p-4">
        {/* Title: clean + bold = Rank only */}
        <div className="flex items-center gap-2">
          {isLol ? <Crown className="w-4 h-4 shrink-0" style={{ color: rankColor }} /> : <Crosshair className="w-4 h-4 shrink-0" style={{ color: rankColor }} />}
          <h3 className="text-base font-heading font-extrabold text-white tracking-tight truncate group-hover:text-valorant transition-colors uppercase">
            {titleText}
          </h3>
        </div>

        {/* Price — prominent */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-heading font-extrabold text-white tracking-tight">{formatPrice(product.price, currency)}</span>
          {product.compare_price && <span className="text-xs text-zinc-600 line-through">{formatPrice(product.compare_price, currency)}</span>}
        </div>

        {/* ===== UNIFIED STATS ROW ===== */}
        <div data-testid={`stats-row-${product.item_id}`} className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
          {isVal ? (
            <>
              <Pill icon={TrendingUp} color="electric">LV {valLevel}</Pill>
              <Pill icon={Sparkles} color="amber">{valSkinCount} Skins</Pill>
              {valAgentCount > 0 && <Pill icon={Trophy} color="purple">{valAgentCount} Agents</Pill>}
              {valKnifeCount > 0 && <Pill icon={Swords} color="valorant">{valKnifeCount} Knife{valKnifeCount > 1 ? 's' : ''}</Pill>}
              {valWallet.vp > 0 && <Pill icon={Gem} color="purple" testId={`vp-pill-${product.item_id}`}>VP {formatCompact(valWallet.vp)}</Pill>}
              {valWallet.rp > 0 && <Pill icon={Sparkles} color="amber" testId={`rp-pill-${product.item_id}`}>RP {formatCompact(valWallet.rp)}</Pill>}
            </>
          ) : isLol ? (
            <>
              <Pill icon={TrendingUp} color="electric">LV {lolLevel}</Pill>
              <Pill icon={Sparkles} color="amber">{lolSkinCount} Skins</Pill>
              {lolChampCount > 0 && <Pill icon={Trophy} color="purple">{lolChampCount} Champs</Pill>}
              {lolWallet.be > 0 && <Pill icon={Gem} color="blue">BE {formatCompact(lolWallet.be)}</Pill>}
              {lolWallet.rp > 0 && <Pill icon={CircleDollarSign} color="amber">RP {formatCompact(lolWallet.rp)}</Pill>}
            </>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
