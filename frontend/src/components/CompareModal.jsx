import { motion } from 'framer-motion';
import { X, Crosshair, Sparkles, TrendingUp, Gem, Swords, Gamepad2, Globe } from 'lucide-react';
import { getValorantRankName, getRankColorFromInt, getCurrencySymbol } from '@/data/api';

function Stat({ label, valueA, valueB, icon: Icon, color }) {
  const numA = typeof valueA === 'number' ? valueA : 0;
  const numB = typeof valueB === 'number' ? valueB : 0;
  const better = numA > numB ? 'A' : numA < numB ? 'B' : null;
  return (
    <div className="grid grid-cols-3 gap-2 items-center py-2">
      <div className={`text-right text-sm font-semibold ${better === 'A' ? 'text-emerald-400' : 'text-white'}`}>{String(valueA)}</div>
      <div className="text-center flex flex-col items-center">
        {Icon && <Icon className="w-4 h-4 mb-0.5" style={{ color }} />}
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-left text-sm font-semibold ${better === 'B' ? 'text-emerald-400' : 'text-white'}`}>{String(valueB)}</div>
    </div>
  );
}

export default function CompareModal({ items, category, onClose }) {
  const [a, b] = items;
  const cs = getCurrencySymbol(a.price_currency);

  return (
    <motion.div data-testid="compare-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass rounded-2xl p-6">
        <button data-testid="close-compare-btn" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
        <h2 className="text-xl font-heading font-bold text-white mb-6">Account Comparison</h2>

        {/* Headers */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-right">
            <p className="text-sm font-heading font-bold text-white truncate">{a.title}</p>
            <p className="text-xs text-valorant font-bold">{cs}{a.price?.toFixed(2)}</p>
          </div>
          <div className="text-center text-xs text-zinc-600 font-bold uppercase">VS</div>
          <div className="text-left">
            <p className="text-sm font-heading font-bold text-white truncate">{b.title}</p>
            <p className="text-xs text-valorant font-bold">{cs}{b.price?.toFixed(2)}</p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-1">
          <Stat label="Price" valueA={`${cs}${a.price?.toFixed(2)}`} valueB={`${cs}${b.price?.toFixed(2)}`} icon={null} />
          <Stat label="Region" valueA={a.riot_valorant_region || '-'} valueB={b.riot_valorant_region || '-'} icon={Globe} color="#a1a1aa" />
          <Stat label="Rank" valueA={a.valorantRankTitle || getValorantRankName(a.riot_valorant_rank||0)} valueB={b.valorantRankTitle || getValorantRankName(b.riot_valorant_rank||0)} icon={Crosshair} color={getRankColorFromInt(a.riot_valorant_rank||0)} />
          <Stat label="Level" valueA={a.riot_valorant_level||0} valueB={b.riot_valorant_level||0} icon={TrendingUp} color="#00e5ff" />
          <Stat label="Skins" valueA={a.riot_valorant_skin_count||0} valueB={b.riot_valorant_skin_count||0} icon={Sparkles} color="#fbbf24" />
          <Stat label="Knives" valueA={a.riot_valorant_knife_count||0} valueB={b.riot_valorant_knife_count||0} icon={Swords} color="#ff4655" />
          <Stat label="VP" valueA={a.riot_valorant_wallet_vp||0} valueB={b.riot_valorant_wallet_vp||0} icon={Gem} color="#a78bfa" />
          <Stat label="RP" valueA={a.riot_valorant_wallet_rp||0} valueB={b.riot_valorant_wallet_rp||0} icon={Sparkles} color="#fbbf24" />
          <Stat label="Agents" valueA={a.riot_valorant_agent_count||0} valueB={b.riot_valorant_agent_count||0} icon={Gamepad2} color="#00e5ff" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a href={`https://lzt.market/${a.item_id}/`} target="_blank" rel="noopener noreferrer" data-testid="compare-buy-a"
            className="py-3 bg-valorant text-white font-heading font-bold text-sm uppercase tracking-widest rounded-lg text-center hover:bg-valorant-hover transition-all">
            Buy #{a.item_id}
          </a>
          <a href={`https://lzt.market/${b.item_id}/`} target="_blank" rel="noopener noreferrer" data-testid="compare-buy-b"
            className="py-3 bg-valorant text-white font-heading font-bold text-sm uppercase tracking-widest rounded-lg text-center hover:bg-valorant-hover transition-all">
            Buy #{b.item_id}
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
