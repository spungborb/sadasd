import { motion } from 'framer-motion';
import { Crosshair, Sparkles, Globe, Heart, Swords, GitCompare, Check, Crown, Trophy, Gem, CircleDollarSign } from 'lucide-react';
import { getValorantRankName, getRankColorFromInt, isLocalFavorite, toggleLocalFavorite, addServerFavorite, removeServerFavorite, getCurrencySymbol, getValorantWallet, getLolWallet, formatCompact, fetchValorantAgents } from '@/data/api';
import { useState, useMemo, useEffect } from 'react';

const LOL_RANK_COLORS = { IRON:'#8c8c8c', BRONZE:'#b87333', SILVER:'#c0c0c0', GOLD:'#ffd700', PLATINUM:'#00bcd4', EMERALD:'#00e676', DIAMOND:'#b388ff', MASTER:'#9d4dbb', GRANDMASTER:'#ff4655', CHALLENGER:'#ffe57f' };
function getLolRankColor(rank) { if (!rank) return '#a1a1aa'; return LOL_RANK_COLORS[rank.split(' ')[0].toUpperCase()] || '#a1a1aa'; }

// Champion splash pool — broad, vibrant, Riot-official art
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

// Cached agents list (fetched once per tab session)
let _agentsCache = null;
async function getAgents() {
  if (_agentsCache) return _agentsCache;
  try { const d = await fetchValorantAgents(); _agentsCache = d.agents || []; } catch { _agentsCache = []; }
  return _agentsCache;
}

function hashIndex(id, mod) { const n = Math.abs(Number(id) || 0); return n % mod; }

export default function ProductCard({ product, onClick, index, category, compareItems, onToggleCompare, user }) {
  const [fav, setFav] = useState(isLocalFavorite(product.item_id));
  const [agents, setAgents] = useState([]);
  const [imgOk, setImgOk] = useState(true);
  const isVal = category === 'valorant';
  const isLol = category === 'lol';
  const cs = getCurrencySymbol(product.price_currency);
  const isComparing = compareItems?.some(p => p.item_id === product.item_id);

  useEffect(() => { if (isVal) getAgents().then(setAgents); }, [isVal]);

  // Pick agent deterministically for Valorant (full portrait + gradient colors)
  const agent = useMemo(() => {
    if (!isVal || agents.length === 0) return null;
    return agents[hashIndex(product.item_id || index, agents.length)];
  }, [isVal, agents, product.item_id, index]);

  const lolBg = useMemo(() => LOL_CHAMP_BGS[hashIndex(product.item_id || index, LOL_CHAMP_BGS.length)], [product.item_id, index]);

  // Gradient colors from agent (valorant-api backgroundGradientColors = 4 hex values)
  const gradCSS = useMemo(() => {
    if (!agent?.backgroundGradientColors?.length) return 'linear-gradient(135deg, #1a0b1e 0%, #0f0f13 100%)';
    const cols = agent.backgroundGradientColors.slice(0, 4).map(c => `#${c.slice(0,6)}`);
    return `linear-gradient(135deg, ${cols.join(', ')})`;
  }, [agent]);

  const valRankInt = product.riot_valorant_rank || 0;
  const valRankName = product.valorantRankTitle || getValorantRankName(valRankInt);
  const valRankColor = getRankColorFromInt(valRankInt);
  const valRegion = product.riot_valorant_region || '';
  const valSkinCount = product.riot_valorant_skin_count || 0;
  const valLevel = product.riot_valorant_level || 0;
  const valKnifeCount = product.riot_valorant_knife_count || 0;
  const valWallet = getValorantWallet(product);

  const lolRegion = product.riot_lol_region || product.lolRegionPhrase || '';
  const lolSkinCount = product.riot_lol_skin_count || 0;
  const lolChampCount = product.riot_lol_champion_count || 0;
  const lolLevel = product.riot_lol_level || 0;
  const lolRank = product.riot_lol_rank || '';
  const lolRankColor = getLolRankColor(lolRank);
  const lolWallet = getLolWallet(product);

  const dynamicTitle = isVal
    ? `${valRegion||'??'} · ${valRankName} · ${valSkinCount} Skins`
    : isLol
    ? `${lolRegion||'??'} · ${lolRank||'Unranked'} · ${lolSkinCount} Skins`
    : product.title || `#${product.item_id}`;
  const rankName = isVal ? valRankName : lolRank || 'Unranked';
  const rankColor = isVal ? valRankColor : lolRankColor;
  const region = isVal ? valRegion : lolRegion;
  const level = isVal ? valLevel : lolLevel;
  const skinCount = isVal ? valSkinCount : lolSkinCount;

  const handleFav = (e) => { e.stopPropagation(); const nf = toggleLocalFavorite(product.item_id); const nv = nf.includes(product.item_id); setFav(nv); if (user) { nv ? addServerFavorite(product.item_id) : removeServerFavorite(product.item_id); } };
  const handleCompare = (e) => { e.stopPropagation(); onToggleCompare?.(product); };

  return (
    <motion.div data-testid={`product-card-${product.item_id}`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.4) }}
      whileHover={{ y: -5 }} onClick={() => onClick(product)}
      className={`group cursor-pointer bg-zinc-950 border rounded-2xl overflow-hidden relative transition-all duration-300 hover:shadow-[0_12px_40px_rgba(255,70,85,0.18)] ${isComparing ? 'border-electric/50 shadow-[0_0_20px_rgba(0,229,255,0.15)]' : 'border-white/5 hover:border-valorant/40'}`}>

      {/* Hero artwork region */}
      <div className="h-44 relative overflow-hidden" style={isVal ? { background: gradCSS } : undefined}>
        {isVal && agent?.fullPortrait && imgOk && (
          <img
            src={agent.fullPortrait}
            alt=""
            onError={() => setImgOk(false)}
            loading="lazy"
            className="absolute -right-4 -bottom-2 h-[120%] w-auto object-contain opacity-90 drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] pointer-events-none transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {isLol && imgOk && (
          <img
            src={lolBg}
            alt=""
            onError={() => setImgOk(false)}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
        {/* Dark readability gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-transparent to-transparent" />

        {/* Top-left action buttons */}
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button data-testid={`fav-btn-${product.item_id}`} onClick={handleFav} aria-label="Favorite" className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 transition-colors">
            <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-valorant text-valorant' : 'text-white/80'}`} />
          </button>
          <button data-testid={`compare-btn-${product.item_id}`} onClick={handleCompare} aria-label="Compare" className={`w-8 h-8 rounded-lg backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors ${isComparing ? 'bg-electric/30 hover:bg-electric/40' : 'bg-black/60 hover:bg-black/80'}`}>
            {isComparing ? <Check className="w-3.5 h-3.5 text-electric" /> : <GitCompare className="w-3.5 h-3.5 text-white/80" />}
          </button>
        </div>

        {/* Top-right region + agent name (Valorant) */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          {region && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-white">
              <Globe className="w-2.5 h-2.5" />{region}
            </span>
          )}
        </div>

        {/* Bottom-left rank chip */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border backdrop-blur-md shrink-0"
              style={{ backgroundColor: `${rankColor}25`, borderColor: `${rankColor}60`, boxShadow: `0 0 14px ${rankColor}30` }}>
              {isLol ? <Crown className="w-4 h-4" style={{ color: rankColor }} /> : <Crosshair className="w-4 h-4" style={{ color: rankColor }} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-heading font-extrabold text-white leading-none truncate uppercase tracking-wide drop-shadow-lg">{rankName}</p>
              <p className="text-[9px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-[0.18em]">{isLol ? 'LoL' : 'Valorant'} · LV {level}</p>
            </div>
          </div>
          {isVal && agent?.displayName && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">{agent.displayName}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-sm font-heading font-semibold text-white truncate group-hover:text-valorant transition-colors">{dynamicTitle}</h3>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-heading font-extrabold text-white tracking-tight">{cs}{product.price?.toFixed?.(2)||product.price}</span>
          {product.compare_price && <span className="text-xs text-zinc-600 line-through">{cs}{product.compare_price?.toFixed?.(2)}</span>}
        </div>

        {/* VP/RP pills (Valorant) or Essence pills (LoL) */}
        {isVal && (valWallet.vp > 0 || valWallet.rp > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {valWallet.vp > 0 && (
              <span data-testid={`vp-pill-${product.item_id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                <Gem className="w-3 h-3" />VP {formatCompact(valWallet.vp)}
              </span>
            )}
            {valWallet.rp > 0 && (
              <span data-testid={`rp-pill-${product.item_id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                <Sparkles className="w-3 h-3" />RP {formatCompact(valWallet.rp)}
              </span>
            )}
          </div>
        )}
        {isLol && (lolWallet.be > 0 || lolWallet.rp > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {lolWallet.be > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-300">
                <Gem className="w-3 h-3" />BE {formatCompact(lolWallet.be)}
              </span>
            )}
            {lolWallet.rp > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                <CircleDollarSign className="w-3 h-3" />RP {formatCompact(lolWallet.rp)}
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] font-semibold text-electric">LV {level}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] font-semibold text-amber-400"><Sparkles className="w-3 h-3" />{skinCount}</span>
          {isVal && valKnifeCount > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-valorant/10 text-[10px] font-semibold text-valorant"><Swords className="w-3 h-3" />{valKnifeCount}</span>}
          {isLol && lolChampCount > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-[10px] font-semibold text-purple-400"><Trophy className="w-3 h-3" />{lolChampCount}</span>}
        </div>
      </div>
    </motion.div>
  );
}
