import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, DollarSign, ArrowUpDown, MapPin, Crosshair, Swords, Sparkles, ChevronDown, Filter, Globe, Search, Gem, CircleDollarSign, TrendingUp, Crown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VAL_RANK_NAMES = ['Unranked','','','Iron 1','Iron 2','Iron 3','Bronze 1','Bronze 2','Bronze 3','Silver 1','Silver 2','Silver 3','Gold 1','Gold 2','Gold 3','Plat 1','Plat 2','Plat 3','Dia 1','Dia 2','Dia 3','Asc 1','Asc 2','Asc 3','Imm 1','Imm 2','Imm 3','Radiant'];

function Section({ icon: Icon, title, accent = '#ff4655', children, defaultOpen = true, testId }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId} className="border-b border-white/5 last:border-b-0">
      <button type="button" onClick={() => setOpen(o => !o)}
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

function DualSlider({ testId, minKey, maxKey, min, max, step, filters, onFilterChange, accent = '#ff4655', format = v => v, suffix = '' }) {
  const vMin = filters[minKey] ?? min;
  const vMax = filters[maxKey] ?? max;
  return (
    <div className="px-1 space-y-3">
      <Slider data-testid={testId}
        value={[Number(vMin), Number(vMax)]}
        onValueChange={([a, b]) => {
          onFilterChange(minKey, a <= min ? undefined : a);
          onFilterChange(maxKey, b >= max ? undefined : b);
        }}
        min={min} max={max} step={step}
        style={{ '--accent': accent }}
        className="[&_[role=slider]]:bg-[var(--accent,#ff4655)] [&_[role=slider]]:border-[var(--accent,#ff4655)]/50 [&_[role=slider]]:shadow-[0_0_10px_var(--accent,#ff4655)] [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative_.absolute]:bg-[var(--accent,#ff4655)]" />
      <div className="flex justify-between text-[11px]">
        <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5"><span className="text-zinc-500">min </span><span className="text-white font-semibold">{format(vMin)}{suffix}</span></div>
        <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5"><span className="text-zinc-500">max </span><span className="text-white font-semibold">{format(vMax)}{vMax >= max ? '+' : ''}{suffix}</span></div>
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, onFilterChange, onReset, resultCount, category }) {
  const isVal = category === 'valorant';
  const isLol = category === 'lol';
  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'order_by') return false;
    if (v === undefined || v === null || v === '' || v === 0 || v === false) return false;
    if (k === 'pmax' && Number(v) >= 500) return false;
    return true;
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
          <button type="button" data-testid="reset-filters-btn" onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 uppercase tracking-wider transition-colors">
            <RotateCcw className="w-3 h-3" />Reset
          </button>
        </div>
      </div>

      <div className="px-5">
        {/* Sort */}
        <Section icon={ArrowUpDown} title="Sort By" accent="#00e5ff" testId="section-sort">
          <Select value={filters.order_by || 'pdate_to_down'} onValueChange={v => onFilterChange('order_by', v)}>
            <SelectTrigger data-testid="sort-select" className="bg-zinc-900/80 border-white/10 text-white text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value="pdate_to_down">Newest First</SelectItem>
              <SelectItem value="pdate_to_up">Oldest First</SelectItem>
              <SelectItem value="price_to_up">Cheapest First</SelectItem>
              <SelectItem value="price_to_down">Priciest First</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        {/* Exact Skin Search */}
        <Section icon={Search} title="Skin Search" accent="#fbbf24" testId="section-skin-search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input data-testid="skin-search-input" type="text"
              placeholder={isVal ? 'e.g. "Kuronami", "Prime Vandal"' : 'e.g. "DJ Sona", "KDA Ahri"'}
              value={filters.title || ''}
              onChange={e => onFilterChange('title', e.target.value || undefined)}
              className="w-full pl-9 pr-3 py-2.5 bg-zinc-900/80 border border-white/10 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 transition-colors" />
          </div>
          <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">Searches listing titles &amp; descriptions for specific skin names.</p>
        </Section>

        {/* Price */}
        <Section icon={DollarSign} title="Price Range" accent="#ff4655" testId="section-price">
          <DualSlider testId="price-range-slider" minKey="pmin" maxKey="pmax" min={0} max={2000} step={10}
            filters={filters} onFilterChange={onFilterChange} accent="#ff4655"
            format={v => `$${v}`} />
        </Section>

        {/* Region */}
        {isVal && (
          <Section icon={Globe} title="Region" accent="#00e676" testId="section-region">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: 'default', label: 'All' },
                { v: 'EU', label: 'EU' },
                { v: 'NA', label: 'NA' },
                { v: 'AP', label: 'AP' },
                { v: 'KR', label: 'KR' },
                { v: 'BR', label: 'BR' },
                { v: 'LATAM', label: 'LATAM' },
              ].map(r => {
                const active = (filters.valorant_region || 'default') === r.v;
                return (
                  <button type="button" key={r.v} data-testid={`region-chip-${r.v}`}
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
            <div className="px-1 space-y-3">
              <Slider data-testid="rank-range-slider"
                value={[filters.rmin || 0, filters.rmax || 27]}
                onValueChange={([min, max]) => { onFilterChange('rmin', min || undefined); onFilterChange('rmax', max >= 27 ? undefined : max); }}
                min={0} max={27} step={1}
                className="[&_[role=slider]]:bg-electric [&_[role=slider]]:border-electric/50 [&_[role=slider]]:shadow-[0_0_10px_rgba(0,229,255,0.5)] [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_.relative_.absolute]:bg-electric" />
              <div className="flex justify-between text-[11px]">
                <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5"><span className="text-white font-semibold">{VAL_RANK_NAMES[filters.rmin || 0]}</span></div>
                <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-white/5"><span className="text-white font-semibold">{VAL_RANK_NAMES[filters.rmax || 27]}</span></div>
              </div>
            </div>
          </Section>
        )}

        {/* Valorant numeric ranges */}
        {isVal && (
          <>
            <Section icon={TrendingUp} title="Account Level" accent="#00e5ff" testId="section-val-level">
              <DualSlider testId="val-level-range" minKey="lmin" maxKey="lmax" min={0} max={500} step={5}
                filters={filters} onFilterChange={onFilterChange} accent="#00e5ff" suffix="" />
            </Section>

            <Section icon={Sparkles} title="Total Skins" accent="#fbbf24" testId="section-val-skins">
              <DualSlider testId="val-skins-range" minKey="valorant_smin" maxKey="valorant_smax" min={0} max={300} step={5}
                filters={filters} onFilterChange={onFilterChange} accent="#fbbf24" />
            </Section>

            <Section icon={Gem} title="Valorant Points (VP)" accent="#a78bfa" testId="section-val-vp">
              <DualSlider testId="val-vp-range" minKey="valorant_vp_min" maxKey="valorant_vp_max" min={0} max={50000} step={100}
                filters={filters} onFilterChange={onFilterChange} accent="#a78bfa"
                format={v => Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(1)}K` : v} />
            </Section>

            <Section icon={Sparkles} title="Radianite Points (RP)" accent="#fbbf24" testId="section-val-rp" defaultOpen={false}>
              <DualSlider testId="val-rp-range" minKey="valorant_rp_min" maxKey="valorant_rp_max" min={0} max={10000} step={50}
                filters={filters} onFilterChange={onFilterChange} accent="#fbbf24" />
            </Section>

            <Section icon={Swords} title="Knives" accent="#ff4655" testId="section-val-knife" defaultOpen={false}>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5 text-valorant" />
                  <span className="text-xs font-semibold text-white">Has Knife</span>
                </div>
                <Switch data-testid="knife-toggle" checked={!!filters.knife}
                  onCheckedChange={v => onFilterChange('knife', v || undefined)}
                  className="data-[state=checked]:bg-valorant scale-90" />
              </div>
            </Section>
          </>
        )}

        {/* LoL numeric ranges */}
        {isLol && (
          <>
            <Section icon={MapPin} title="Region" accent="#00e676" testId="section-lol-region">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: 'default', label: 'All' },
                  { v: 'EUW1', label: 'EUW' },
                  { v: 'EUN1', label: 'EUNE' },
                  { v: 'NA1', label: 'NA' },
                  { v: 'KR', label: 'KR' },
                  { v: 'BR1', label: 'BR' },
                  { v: 'TR1', label: 'TR' },
                  { v: 'RU', label: 'RU' },
                  { v: 'JP1', label: 'JP' },
                ].map(r => {
                  const active = (filters.lol_region || 'default') === r.v;
                  return (
                    <button type="button" key={r.v} data-testid={`lol-region-chip-${r.v}`}
                      onClick={() => onFilterChange('lol_region', r.v === 'default' ? undefined : r.v)}
                      className={`h-9 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${active ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]' : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}`}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section icon={Crown} title="Rank" accent="#a78bfa" testId="section-lol-rank">
              <Select value={filters.lol_rank || 'any'} onValueChange={v => onFilterChange('lol_rank', v === 'any' ? undefined : v)}>
                <SelectTrigger data-testid="lol-rank-select" className="bg-zinc-900/80 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Any rank" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="any">Any Rank</SelectItem>
                  <SelectItem value="iron">Iron</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="grandmaster">Grandmaster</SelectItem>
                  <SelectItem value="challenger">Challenger</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Section icon={TrendingUp} title="Account Level" accent="#00e5ff" testId="section-lol-level">
              <DualSlider testId="lol-level-range" minKey="lmin" maxKey="lmax" min={0} max={900} step={5}
                filters={filters} onFilterChange={onFilterChange} accent="#00e5ff" />
            </Section>

            <Section icon={Sparkles} title="Total Skins" accent="#fbbf24" testId="section-lol-skins">
              <DualSlider testId="lol-skins-range" minKey="lol_smin" maxKey="lol_smax" min={0} max={500} step={5}
                filters={filters} onFilterChange={onFilterChange} accent="#fbbf24" />
            </Section>

            <Section icon={Gem} title="Blue Essence (BE)" accent="#3b82f6" testId="section-lol-be" defaultOpen={false}>
              <DualSlider testId="lol-be-range" minKey="lol_be_min" maxKey="lol_be_max" min={0} max={500000} step={1000}
                filters={filters} onFilterChange={onFilterChange} accent="#3b82f6"
                format={v => Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(0)}K` : v} />
            </Section>

            <Section icon={CircleDollarSign} title="Riot Points (RP)" accent="#fbbf24" testId="section-lol-rp" defaultOpen={false}>
              <DualSlider testId="lol-rp-range" minKey="lol_rp_min" maxKey="lol_rp_max" min={0} max={50000} step={100}
                filters={filters} onFilterChange={onFilterChange} accent="#fbbf24"
                format={v => Number(v) >= 1000 ? `${(Number(v)/1000).toFixed(1)}K` : v} />
            </Section>
          </>
        )}
      </div>

      <div className="h-3" />
    </div>
  );
}
