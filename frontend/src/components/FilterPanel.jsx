import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, DollarSign, ArrowUpDown, MapPin, Crosshair, Swords, Sparkles, ChevronDown, Filter, Globe } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VAL_RANK_NAMES = ['Unranked','','','Iron 1','Iron 2','Iron 3','Bronze 1','Bronze 2','Bronze 3','Silver 1','Silver 2','Silver 3','Gold 1','Gold 2','Gold 3','Plat 1','Plat 2','Plat 3','Dia 1','Dia 2','Dia 3','Asc 1','Asc 2','Asc 3','Imm 1','Imm 2','Imm 3','Radiant'];

function Section({ icon: Icon, title, accent = '#ff4655', children, defaultOpen = true, testId }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId} className="border-b border-white/5 last:border-b-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 group">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <span className="text-xs font-heading font-bold text-white uppercase tracking-[0.15em]">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
        <div className="pb-4 pt-1">{children}</div>
      </motion.div>
    </div>
  );
}

export default function FilterPanel({ filters, onFilterChange, onReset, resultCount, category }) {
  const isVal = category === 'valorant';
  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (['order_by', 'currency'].includes(k)) return false;
    if (k === 'pmin' && (v === 0 || v === undefined)) return false;
    if (k === 'pmax' && (v === 500 || v === undefined)) return false;
    return v !== undefined && v !== null && v !== '' && v !== 0 && v !== false;
  }).length;

  return (
    <div data-testid="filter-panel" className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-900/80 via-zinc-950/80 to-zinc-950/90 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      {/* Header */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-valorant/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-valorant/15 border border-valorant/30 flex items-center justify-center">
              <Filter className="w-4 h-4 text-valorant" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white tracking-tight">Filters</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                {resultCount.toLocaleString()} accounts
                {activeCount > 0 && <span className="ml-1.5 text-valorant">· {activeCount} active</span>}
              </p>
            </div>
          </div>
          <button data-testid="reset-filters-btn" onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 uppercase tracking-wider transition-colors">
            <RotateCcw className="w-3 h-3" />Reset
          </button>
        </div>
      </div>

      <div className="px-5">
        {/* Sort + Currency */}
        <Section icon={ArrowUpDown} title="Sort & Currency" accent="#00e5ff" testId="section-sort">
          <div className="grid grid-cols-2 gap-2">
            <Select value={filters.order_by || 'pdate_to_down'} onValueChange={v => onFilterChange('order_by', v)}>
              <SelectTrigger data-testid="sort-select" className="bg-zinc-900/80 border-white/10 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="pdate_to_down">Newest</SelectItem>
                <SelectItem value="pdate_to_up">Oldest</SelectItem>
                <SelectItem value="price_to_up">Cheapest</SelectItem>
                <SelectItem value="price_to_down">Priciest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.currency || 'usd'} onValueChange={v => onFilterChange('currency', v)}>
              <SelectTrigger data-testid="currency-select" className="bg-zinc-900/80 border-white/10 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="usd">USD $</SelectItem>
                <SelectItem value="eur">EUR €</SelectItem>
                <SelectItem value="try">TRY ₺</SelectItem>
                <SelectItem value="rub">RUB ₽</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        {/* Price */}
        <Section icon={DollarSign} title="Price Range" accent="#ff4655" testId="section-price">
          <div className="px-1">
            <Slider data-testid="price-range-slider"
              value={[filters.pmin || 0, filters.pmax || 500]}
              onValueChange={([min, max]) => { onFilterChange('pmin', min); onFilterChange('pmax', max); }}
              min={0} max={2000} step={10}
              className="[&_[role=slider]]:bg-valorant [&_[role=slider]]:border-valorant/50 [&_[role=slider]]:shadow-[0_0_10px_rgba(255,70,85,0.5)] [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative_.absolute]:bg-gradient-to-r [&_.relative_.absolute]:from-valorant [&_.relative_.absolute]:to-valorant/70" />
            <div className="flex justify-between mt-3 text-[11px]">
              <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5">
                <span className="text-zinc-500">min </span><span className="text-white font-semibold">${filters.pmin || 0}</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5">
                <span className="text-zinc-500">max </span><span className="text-white font-semibold">${filters.pmax || 500}+</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Region */}
        {isVal && (
          <Section icon={Globe} title="Region" accent="#00e676" testId="section-region">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: 'default', label: 'All' },
                { v: 'eu', label: 'EU' },
                { v: 'na', label: 'NA' },
                { v: 'ap', label: 'AP' },
                { v: 'kr', label: 'KR' },
                { v: 'br', label: 'BR' },
                { v: 'latam', label: 'LATAM' },
              ].map(r => {
                const active = (filters.valorant_region || 'default') === r.v;
                return (
                  <button key={r.v} data-testid={`region-chip-${r.v}`}
                    onClick={() => onFilterChange('valorant_region', r.v === 'default' ? undefined : r.v)}
                    className={`h-9 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${active ? 'bg-valorant/15 text-valorant border-valorant/40 shadow-[0_0_12px_rgba(255,70,85,0.2)]' : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}`}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Rank (Valorant) */}
        {isVal && (
          <Section icon={Crosshair} title="Rank Range" accent="#a78bfa" testId="section-rank">
            <div className="px-1">
              <Slider data-testid="rank-range-slider"
                value={[filters.rmin || 0, filters.rmax || 27]}
                onValueChange={([min, max]) => { onFilterChange('rmin', min || undefined); onFilterChange('rmax', max >= 27 ? undefined : max); }}
                min={0} max={27} step={1}
                className="[&_[role=slider]]:bg-electric [&_[role=slider]]:border-electric/50 [&_[role=slider]]:shadow-[0_0_10px_rgba(0,229,255,0.5)] [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative_.absolute]:bg-gradient-to-r [&_.relative_.absolute]:from-electric/60 [&_.relative_.absolute]:to-electric" />
              <div className="flex justify-between mt-3 text-[11px]">
                <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5">
                  <span className="text-white font-semibold">{VAL_RANK_NAMES[filters.rmin || 0]}</span>
                </div>
                <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5">
                  <span className="text-white font-semibold">{VAL_RANK_NAMES[filters.rmax || 27]}</span>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Skins & Knife */}
        {isVal && (
          <Section icon={Sparkles} title="Skins & Loadout" accent="#fbbf24" testId="section-skins">
            <div className="space-y-4 px-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Min Skins</span>
                  <span className="text-[11px] font-bold text-amber-400">{filters.valorant_smin || 0}+</span>
                </div>
                <Slider data-testid="min-skins-slider"
                  value={[filters.valorant_smin || 0]}
                  onValueChange={([v]) => onFilterChange('valorant_smin', v || undefined)}
                  min={0} max={200} step={5}
                  className="[&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-400/50 [&_[role=slider]]:shadow-[0_0_10px_rgba(251,191,36,0.5)] [&_.relative_.absolute]:bg-amber-400" />
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5 text-valorant" />
                  <span className="text-xs font-semibold text-white">Has Knife</span>
                </div>
                <Switch data-testid="knife-toggle" checked={!!filters.knife}
                  onCheckedChange={v => onFilterChange('knife', v || undefined)}
                  className="data-[state=checked]:bg-valorant scale-90" />
              </div>
            </div>
          </Section>
        )}

        {/* Level (both) */}
        <Section icon={MapPin} title="Account Level" accent="#00e5ff" testId="section-level" defaultOpen={false}>
          <div className="px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Min Level</span>
              <span className="text-[11px] font-bold text-electric">{filters.lmin || 0}+</span>
            </div>
            <Slider data-testid="min-level-slider"
              value={[filters.lmin || 0]}
              onValueChange={([v]) => onFilterChange('lmin', v || undefined)}
              min={0} max={500} step={5}
              className="[&_[role=slider]]:bg-electric [&_[role=slider]]:border-electric/50 [&_[role=slider]]:shadow-[0_0_10px_rgba(0,229,255,0.5)] [&_.relative_.absolute]:bg-electric" />
          </div>
        </Section>
      </div>

      <div className="h-3" />
    </div>
  );
}
