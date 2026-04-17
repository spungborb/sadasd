import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Shield, Sparkles, ArrowRight, Globe, TrendingUp, GitCompare, Zap } from 'lucide-react';

function FeatureCard({ icon: Icon, title, desc, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }}
      className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h3 className="text-base font-heading font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StatPill({ value, label }) {
  return <div className="text-center"><p className="text-2xl sm:text-3xl font-heading font-bold text-white">{value}</p><p className="text-xs text-zinc-500 mt-0.5">{label}</p></div>;
}

export default function LandingPage() {
  const navigate = useNavigate();
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

      <section className="relative max-w-[1200px] mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-valorant/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-electric/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-400 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Verified Accounts
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
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
          className="relative z-10 mt-20 flex justify-center gap-12 sm:gap-20">
          <StatPill value="35K+" label="Accounts Listed" />
          <StatPill value="Verified" label="Inventories" />
          <StatPill value="24/7" label="Live Sync" />
        </motion.div>
      </section>

      <section id="features" className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">Why Game Vault?</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">Every feature built for serious account traders.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard icon={Sparkles} title="Real Skin Gallery" desc="See actual weapon skins from the account's inventory with hi-res images." color="#fbbf24" delay={0.1} />
          <FeatureCard icon={Shield} title="Verified Data" desc="Every stat — rank, level, VP, Radianite — comes directly from verified sources." color="#00e5ff" delay={0.15} />
          <FeatureCard icon={GitCompare} title="Side-by-Side Compare" desc="Compare two accounts head-to-head on every metric before you buy." color="#a78bfa" delay={0.2} />
          <FeatureCard icon={Globe} title="Multi-Region" desc="Filter by EU, NA, AP, KR, BR, LATAM — or browse all regions at once." color="#00e676" delay={0.25} />
          <FeatureCard icon={TrendingUp} title="Smart Filters" desc="Rank range, min skins, knife toggle, price range — find exactly what you need." color="#ff4655" delay={0.3} />
          <FeatureCard icon={Zap} title="Instant Preview" desc="Click any account for a rich detail modal with stats, skins, and tracker links." color="#fbbf24" delay={0.35} />
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 pb-24">
        <div className="relative p-10 sm:p-14 rounded-2xl bg-zinc-900/60 border border-white/5 overflow-hidden text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-valorant/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white">Ready to Find Your Account?</h3>
            <p className="text-sm text-zinc-500 mt-2">Browse 35,000+ accounts with real data and verified inventories.</p>
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
