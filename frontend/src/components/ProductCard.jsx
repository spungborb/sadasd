import { motion } from 'framer-motion';
import { Crosshair, Sparkles, Globe, Heart, Swords, GitCompare, Check, Crown, Trophy } from 'lucide-react';
import { getValorantRankName, getRankColorFromInt, getOriginLabel, getOriginColor, isLocalFavorite, toggleLocalFavorite, addServerFavorite, removeServerFavorite, getCurrencySymbol } from '@/data/api';
import { useState, useMemo } from 'react';

const LOL_RANK_COLORS = { IRON:'#8c8c8c', BRONZE:'#b87333', SILVER:'#c0c0c0', GOLD:'#ffd700', PLATINUM:'#00bcd4', EMERALD:'#00e676', DIAMOND:'#b388ff', MASTER:'#9d4dbb', GRANDMASTER:'#ff4655', CHALLENGER:'#ffe57f' };
function getLolRankColor(rank) { if (!rank) return '#a1a1aa'; return LOL_RANK_COLORS[rank.split(' ')[0].toUpperCase()] || '#a1a1aa'; }

// Valorant: Use agent BACKGROUND images (full-frame colored patterns, NOT transparent portraits)
const VAL_AGENT_BGS = [
  'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/background.png',
  'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/background.png',
  'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/background.png',
  'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/background.png',
  'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/background.png',
  'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/background.png',
  'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/background.png',
  'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/background.png',
  'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/background.png',
  'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/background.png',
];
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
];

export default function ProductCard({ product, onClick, index, category, compareItems, onToggleCompare, user }) {
  const [fav, setFav] = useState(isLocalFavorite(product.item_id));
  const isVal = category === 'valorant';
  const isLol = category === 'lol';
  const origin = product.item_origin || '';
  const cs = getCurrencySymbol(product.price_currency);
  const isComparing = compareItems?.some(p => p.item_id === product.item_id);

  const bgUrl = useMemo(() => {
    const bgs = isLol ? LOL_CHAMP_BGS : VAL_AGENT_BGS;
    return bgs[(product.item_id || index) % bgs.length];
  }, [product.item_id, index, isLol]);

  const valRankInt = product.riot_valorant_rank || 0;
  const valRankName = product.valorantRankTitle || getValorantRankName(valRankInt);
  const valRankColor = getRankColorFromInt(valRankInt);
  const valRegion = product.riot_valorant_region || '';
  const valSkinCount = product.riot_valorant_skin_count || 0;
  const valLevel = product.riot_valorant_level || 0;
  const valKnifeCount = product.riot_valorant_knife_count || 0;
  const lolRegion = product.riot_lol_region || product.lolRegionPhrase || '';
  const lolSkinCount = product.riot_lol_skin_count || 0;
  const lolChampCount = product.riot_lol_champion_count || 0;
  const lolLevel = product.riot_lol_level || 0;
  const lolRank = product.riot_lol_rank || '';
  const lolRankColor = getLolRankColor(lolRank);
  const dynamicTitle = isVal ? `${valRegion||'??'} | ${valRankName} | ${valSkinCount} Skins` : isLol ? `${lolRegion||'??'} | ${lolRank||'Unranked'} | ${lolSkinCount} Skins` : product.title || `#${product.item_id}`;
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
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
      whileHover={{ y: -4 }} onClick={() => onClick(product)}
      className={`group cursor-pointer bg-zinc-900 border rounded-xl overflow-hidden relative transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,70,85,0.12)] ${isComparing ? 'border-electric/50 shadow-[0_0_20px_rgba(0,229,255,0.15)]' : 'border-white/5 hover:border-valorant/40'}`}>

      <div className="h-32 relative overflow-hidden bg-zinc-950">
        <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.18] blur-[1px] scale-125" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-zinc-900" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2 z-[1]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center border backdrop-blur-sm" style={{ backgroundColor: `${rankColor}20`, borderColor: `${rankColor}40` }}>
            {isLol ? <Crown className="w-3.5 h-3.5" style={{ color: rankColor }} /> : <Crosshair className="w-3.5 h-3.5" style={{ color: rankColor }} />}
          </div>
          <div>
            <p className="text-xs font-bold text-white font-heading leading-none drop-shadow-lg">{rankName}</p>
            <p className="text-[10px] text-zinc-300 mt-0.5 drop-shadow">{isLol ? 'League of Legends' : 'Valorant'}</p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-900 to-transparent" />
        <div className="absolute top-3 right-3 flex gap-1.5 z-[1]">
          {region && <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-black/50 backdrop-blur-sm border border-white/10 text-white"><Globe className="w-3 h-3" />{region}</span>}
          {origin && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getOriginColor(origin)}`}>{getOriginLabel(origin)}</span>}
        </div>
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          <button data-testid={`fav-btn-${product.item_id}`} onClick={handleFav} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70"><Heart className={`w-3.5 h-3.5 ${fav ? 'fill-valorant text-valorant' : 'text-white/70'}`} /></button>
          <button data-testid={`compare-btn-${product.item_id}`} onClick={handleCompare} className={`w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-black/70 ${isComparing ? 'bg-electric/30' : 'bg-black/50'}`}>{isComparing ? <Check className="w-3.5 h-3.5 text-electric" /> : <GitCompare className="w-3.5 h-3.5 text-white/70" />}</button>
        </div>
      </div>

      <div className="p-4 card-pattern">
        <h3 className="text-sm font-heading font-semibold text-white truncate group-hover:text-valorant transition-colors">{dynamicTitle}</h3>
        {product.title && <p className="text-[10px] text-zinc-500 truncate mt-0.5">{product.title}</p>}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-xl font-heading font-bold text-white">{cs}{product.price?.toFixed?.(2)||product.price}</span>
          {product.compare_price && <span className="text-xs text-zinc-500 line-through">{cs}{product.compare_price?.toFixed?.(2)}</span>}
        </div>
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
