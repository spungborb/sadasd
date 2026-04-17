import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Shield, Sparkles, ArrowRight, Globe, TrendingUp, GitCompare, Zap, Crown, Gem, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { fetchLiveStats, fetchFeatured, getCurrencySymbol, getValorantWallet, formatCompact } from '@/data/api';

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function AnimatedStat({ target, label, suffix = '', accent = '#ff4655' }) {
  const n = useCountUp(Number(target) || 0);
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
        <span style={{ textShadow: `0 0 30px ${accent}40` }}>{formatCompact(n)}</span>
        {suffix}
      </p>
      <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay }}
      className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1 duration-300">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h3 className="text-base font-heading font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function FeaturedCard({ item, category, onClick }) {
  const isVal = category === 'valorant';
  const cs = getCurrencySymbol(item.price_currency);
  const wallet = getValorantWallet(item);
  const skinCount = isVal ? (item.riot_valorant_skin_count || 0) : (item.riot_lol_skin_count || 0);
  const region = isVal ? (item.riot_valorant_region || '') : (item.riot_lol_region || '');
  const level = isVal ? (item.riot_valorant_level || 0) : (item.riot_lol_level || 0);
  return (
    <motion.button onClick={onClick} whileHover={{ y: -4 }}
      className="shrink-0 w-[280px] text-left rounded-xl overflow-hidden bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/10 hover:border-valorant/40 hover:shadow-[0_10px_30px_rgba(255,70,85,0.18)] transition-all duration-300">
      <div className="relative h-28 bg-gradient-to-br from-valorant/30 via-purple-900/20 to-zinc-950 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {isVal ? <Crosshair className="w-16 h-16 text-white/10" /> : <Crown className="w-16 h-16 text-white/10" />}
        </div>
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded bg-valorant/90 text-white text-[9px] font-extrabold uppercase tracking-widest">
          <Flame className="w-3 h-3" />Featured
        </div>
        {region && <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase">{region}</div>}
        <div className="absolute bottom-2.5 left-2.5 text-[10px] font-bold text-white/90 uppercase tracking-wider">LV {level}</div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-heading font-extrabold text-white">{cs}{item.price?.toFixed?.(2)}</span>
          {item.compare_price && <span className="text-xs text-zinc-600 line-through">{cs}{item.compare_price?.toFixed?.(2)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] font-bold text-amber-300"><Sparkles className="w-2.5 h-2.5" />{skinCount}</span>
          {isVal && wallet.vp > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-[9px] font-bold text-purple-300"><Gem className="w-2.5 h-2.5" />{formatCompact(wallet.vp)} VP</span>
          )}
          {isVal && wallet.rp > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] font-bold text-amber-300">{formatCompact(wallet.rp)} RP</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function FeaturedCarousel({ title, items, category, onCardClick, accent }) {
  const [scrollPos, setScrollPos] = useState(null);
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${accent}15`, borderColor: `${accent}30` }}>
            <Flame className="w-4 h-4" style={{ color: accent }} />
          </div>
          <h3 className="text-lg font-heading font-bold text-white">{title}</h3>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">· Top Picks</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setScrollPos({ d: -1, t: Date.now() })} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setScrollPos({ d: 1, t: Date.now() })} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={el => { if (el && scrollPos) el.scrollBy({ left: 300 * scrollPos.d, behavior: 'smooth' }); }}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {items.map((it, i) => (
          <div key={it.item_id || i} className="snap-start">
            <FeaturedCard item={it} category={category} onClick={() => onCardClick(it, category)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [featuredVal, setFeaturedVal] = useState([]);
  const [featuredLol, setFeaturedLol] = useState([]);

  useEffect(() => {
    fetchLiveStats().then(setStats).catch(() => setStats({ valorant: { total: 0 }, lol: { total: 0 } }));
    fetchFeatured('valorant').then(d => setFeaturedVal(d.items || [])).catch(() => {});
    fetchFeatured('lol').then(d => setFeaturedLol(d.items || [])).catch(() => {});
  }, []);

  const totalAccounts = (stats?.valorant?.total || 0) + (stats?.lol?.total || 0);
  const goMarket = (item, cat) => navigate('/market', { state: { initialCategory: cat, openItem: item } });

  return (
    <div className="min-h-screen bg-[#09090b] noise-bg overflow-hidden">
      <nav className="relative z-10 max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-valorant to-valorant/60 flex items-center justify-center shadow-[0_0_15px_rgba(255,70,85,0.3)]">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white tracking-tight leading-none">Game <span className="text-valorant">Vault</span></h1>
            <p className="text-[10px] font-body text-zinc-500 tracking-[0.15em] uppercase">Premium Accounts</p>
          </div>
        </div>
        <button data-testid="landing-sign-in-btn" onClick={() => {
          const redirectUrl = window.location.origin + '/';
          window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        }} className="px-4 py-2 text-sm font-semibold text-white bg-valorant/90 hover:bg-valorant rounded-lg transition-all hover:shadow-[0_0_20px_rgba(255,70,85,0.3)]">Sign In</button>
      </nav>

      {/* HERO */}
      <section className="relative max-w-[1200px] mx-auto px-6 pt-14 sm:pt-20 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-valorant/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-electric/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-400 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {totalAccounts > 0 ? `${formatCompact(totalAccounts)} live accounts · verified` : 'Verified Accounts'}
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-tight max-w-3xl mx-auto">
            Premium Game Accounts,{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-valorant to-valorant/70">Curated for You</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto mt-5 leading-relaxed">
            Browse thousands of verified Valorant and League of Legends accounts with real skin inventories, ranked stats, and instant preview.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button data-testid="explore-marketplace-btn" onClick={() => navigate('/market')} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-valorant text-white font-heading font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-valorant-hover transition-all shadow-[0_0_30px_rgba(255,70,85,0.2)]">
              Explore Marketplace <ArrowRight className="w-4 h-4" />
            </button>
            <button data-testid="learn-more-btn" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-zinc-900 border border-white/10 text-zinc-300 font-body text-sm rounded-lg hover:bg-zinc-800 hover:text-white transition-all">Learn More</button>
          </motion.div>
        </div>

        {/* LIVE STATS */}
        <motion.div data-testid="live-stats" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
          className="relative z-10 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/5">
          <AnimatedStat target={stats?.valorant?.total || 0} label="Valorant" accent="#ff4655" />
          <AnimatedStat target={stats?.lol?.total || 0} label="League of Legends" accent="#fbbf24" />
          <AnimatedStat target={totalAccounts} label="Total Listings" accent="#00e5ff" />
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">24<span className="text-valorant">/</span>7</p>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-[0.2em]">Live Sync</p>
          </div>
        </motion.div>
      </section>

      {/* FEATURED CAROUSELS */}
      <section className="max-w-[1200px] mx-auto px-6 pb-10">
        <FeaturedCarousel title="Featured Valorant" items={featuredVal} category="valorant" onCardClick={goMarket} accent="#ff4655" />
        <FeaturedCarousel title="Featured League of Legends" items={featuredLol} category="lol" onCardClick={goMarket} accent="#fbbf24" />
      </section>

      {/* WHY */}
      <section id="features" className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">Why Game Vault?</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">Every feature built for serious account traders.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard icon={Sparkles} title="Real Skin Gallery" desc="See actual weapon skins from the account's inventory with hi-res images." color="#fbbf24" delay={0.05} />
          <FeatureCard icon={Shield} title="Verified Data" desc="Every stat — rank, level, VP, Radianite — comes directly from verified sources." color="#00e5ff" delay={0.1} />
          <FeatureCard icon={GitCompare} title="Side-by-Side Compare" desc="Compare two accounts head-to-head on every metric before you buy." color="#a78bfa" delay={0.15} />
          <FeatureCard icon={Globe} title="Multi-Region" desc="Filter by EU, NA, AP, KR, BR, LATAM — or browse all regions at once." color="#00e676" delay={0.2} />
          <FeatureCard icon={TrendingUp} title="Smart Filters" desc="Rank range, min skins, knife toggle, price range — find exactly what you need." color="#ff4655" delay={0.25} />
          <FeatureCard icon={Zap} title="Instant Preview" desc="Click any account for a rich detail modal with stats, skins, and tracker links." color="#fbbf24" delay={0.3} />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-6 pb-24">
        <div className="relative p-10 sm:p-14 rounded-2xl bg-zinc-900/60 border border-white/5 overflow-hidden text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-valorant/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">Ready to Find Your Account?</h3>
            <p className="text-sm text-zinc-500 mt-2">Browse {formatCompact(totalAccounts)}+ live accounts with verified inventories.</p>
            <button data-testid="cta-marketplace-btn" onClick={() => navigate('/market')} className="inline-flex items-center gap-2 px-8 py-3.5 mt-6 bg-valorant text-white font-heading font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-valorant-hover transition-all animate-neon-pulse">Open Marketplace <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-zinc-600">Game Vault - Premium Account Marketplace</p>
          <p className="text-xs text-zinc-600">Verified Accounts</p>
        </div>
      </footer>
    </div>
  );
}
