import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, GitCompare, Crosshair, Crown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FilterSidebar from '@/components/FilterSidebar';
import ProductGrid from '@/components/ProductGrid';
import LztPreviewModal from '@/components/LztPreviewModal';
import CompareModal from '@/components/CompareModal';
import { fetchMarketSearch, fetchByProfile, fetchMe, syncFavorites, fetchProfiles } from '@/data/api';

export default function Dashboard() {
  const location = useLocation();
  const [user, setUser] = useState(location.state?.user || null);
  const [products, setProducts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [compareItems, setCompareItems] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [filters, setFilters] = useState({ pmin: 0, pmax: 500, order_by: 'pdate_to_down', currency: 'usd' });

  // Profile system
  const [profiles, setProfiles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('valorant'); // 'valorant' or 'lol'
  const [activeProfileId, setActiveProfileId] = useState(null); // null = "All" generic search

  useEffect(() => {
    if (window.location.hash?.includes('session_id=')) return;
    if (user) return;
    fetchMe().then(u => { setUser(u); syncFavorites().catch(() => {}); }).catch(() => {});
  }, [user]);

  // Load profiles on mount
  useEffect(() => {
    fetchProfiles().then(d => setProfiles(d.profiles || [])).catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      let data;
      if (activeProfileId) {
        // Fetch using saved profile URL params
        data = await fetchByProfile(activeProfileId, { page, currency: filters.currency });
      } else {
        // Generic category search
        const params = { ...filters, page };
        if (searchQuery.trim()) params.title = searchQuery.trim();
        data = await fetchMarketSearch(activeCategory, params);
      }
      let items = data.items || [];
      // Filter by game type if generic search
      if (!activeProfileId) {
        if (activeCategory === 'valorant') {
          items = items.filter(i => (i.riot_valorant_level || 0) > 0 || (i.riot_valorant_skin_count || 0) > 0);
        } else if (activeCategory === 'lol') {
          items = items.filter(i => (i.riot_lol_level || 0) > 0 || (i.riot_lol_champion_count || 0) > 0);
        }
      }
      setProducts(items);
      setTotalItems(data.totalItems || 0);
    } catch (err) { setError(err.message); setProducts([]); }
    finally { setIsLoading(false); }
  }, [activeCategory, activeProfileId, filters, page, searchQuery]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleFilterChange = useCallback((k, v) => { setFilters(p => ({...p, [k]: v})); setPage(1); }, []);
  const resetFilters = useCallback(() => { setFilters({pmin:0,pmax:500,order_by:'pdate_to_down',currency:'usd'}); setSearchQuery(''); setPage(1); }, []);
  const handleSearch = useCallback((e) => { e.preventDefault(); setPage(1); }, []);
  const toggleCompare = useCallback((product) => {
    setCompareItems(prev => {
      const exists = prev.find(p => p.item_id === product.item_id);
      if (exists) return prev.filter(p => p.item_id !== product.item_id);
      if (prev.length >= 2) return [prev[1], product];
      return [...prev, product];
    });
  }, []);

  const valProfiles = profiles.filter(p => p.category === 'valorant');
  const lolProfiles = profiles.filter(p => p.category === 'lol');
  const currentProfiles = activeCategory === 'valorant' ? valProfiles : lolProfiles;

  // Get the active profile's category for card rendering
  const activeProfile = profiles.find(p => p.profile_id === activeProfileId);
  const cardCategory = activeProfile?.category || activeCategory;

  const totalPages = Math.ceil(totalItems / 40);

  return (
    <div className="min-h-screen bg-[#09090b] noise-bg" data-testid="dashboard">
      <Navbar user={user} setUser={setUser} />

      {/* Category + Profile tabs */}
      <div className="sticky top-16 z-30 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          {/* Main category tabs */}
          <div className="flex items-center gap-2 pt-3 pb-1">
            <button data-testid="category-tab-valorant"
              onClick={() => { setActiveCategory('valorant'); setActiveProfileId(null); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeCategory === 'valorant' ? 'bg-valorant/10 text-valorant border border-valorant/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Crosshair className="w-3.5 h-3.5" /> Valorant
            </button>
            <button data-testid="category-tab-lol"
              onClick={() => { setActiveCategory('lol'); setActiveProfileId(null); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeCategory === 'lol' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Crown className="w-3.5 h-3.5" /> League of Legends
            </button>
          </div>

          {/* Sub-category profile tabs */}
          <div className="flex items-center gap-1.5 pb-2 overflow-x-auto">
            <button data-testid="profile-tab-all"
              onClick={() => { setActiveProfileId(null); setPage(1); }}
              className={`whitespace-nowrap px-3 py-1 rounded text-xs font-medium transition-all ${!activeProfileId ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
              All
            </button>
            {currentProfiles.map(p => (
              <button key={p.profile_id} data-testid={`profile-tab-${p.profile_id}`}
                onClick={() => { setActiveProfileId(p.profile_id); setPage(1); }}
                className={`whitespace-nowrap px-3 py-1 rounded text-xs font-medium transition-all ${activeProfileId === p.profile_id ? 'bg-electric/10 text-electric border border-electric/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                {p.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-3 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input data-testid="search-input" type="text" placeholder="Search accounts by title..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-valorant/50 transition-all" />
              {searchQuery && <button type="button" data-testid="clear-search-btn" onClick={() => { setSearchQuery(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>}
            </div>
            <button data-testid="mobile-filter-toggle" type="button" onClick={() => setMobileFiltersOpen(true)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 border border-white/10 rounded-lg text-sm text-zinc-400"><SlidersHorizontal className="w-4 h-4" /></button>
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
              <span className="px-2 py-1 bg-zinc-800/50 rounded">{totalItems.toLocaleString()}</span><span>results</span>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {!activeProfileId && (
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-52">
                <FilterSidebar filters={filters} onFilterChange={handleFilterChange} onReset={resetFilters} resultCount={totalItems} category={activeCategory} />
              </div>
            </div>
          )}
          <div className={activeProfileId ? 'lg:col-span-12' : 'lg:col-span-9'}>
            {error && <div data-testid="error-banner" className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}<button onClick={loadProducts} className="ml-3 underline">Retry</button></div>}
            <ProductGrid products={products} isLoading={isLoading} onProductClick={setSelectedProduct} category={cardCategory} compareItems={compareItems} onToggleCompare={toggleCompare} user={user} />
            {totalPages > 1 && !isLoading && (
              <div data-testid="pagination" className="flex items-center justify-center gap-3 mt-8">
                <button data-testid="prev-page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page<=1} className="flex items-center gap-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" />Prev</button>
                <span className="text-sm text-zinc-500">Page <span className="text-white font-semibold">{page}</span> of {totalPages.toLocaleString()}</span>
                <button data-testid="next-page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages} className="flex items-center gap-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-30 transition-all">Next<ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare bar */}
      <AnimatePresence>{compareItems.length > 0 && (
        <motion.div initial={{y:100}} animate={{y:0}} exit={{y:100}} className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompare className="w-5 h-5 text-electric" />
              <span className="text-sm text-white font-medium">{compareItems.length}/2 selected</span>
              <div className="flex gap-2">{compareItems.map(p => <span key={p.item_id} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 flex items-center gap-1">#{p.item_id}<button onClick={() => toggleCompare(p)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button></span>)}</div>
            </div>
            <div className="flex gap-2">
              <button data-testid="clear-compare-btn" onClick={() => setCompareItems([])} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Clear</button>
              <button data-testid="compare-btn" onClick={() => setShowCompare(true)} disabled={compareItems.length<2} className="px-4 py-1.5 bg-electric text-black font-semibold text-xs rounded-lg disabled:opacity-30 hover:bg-electric/80 transition-all">Compare</button>
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{mobileFiltersOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <motion.div initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring',damping:25,stiffness:200}} className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#09090b] border-r border-white/10 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5"><h2 className="text-lg font-heading font-bold text-white">Filters</h2><button data-testid="close-mobile-filters" onClick={() => setMobileFiltersOpen(false)} className="p-1 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button></div>
            <div className="p-4"><FilterSidebar filters={filters} onFilterChange={handleFilterChange} onReset={resetFilters} resultCount={totalItems} category={activeCategory} /></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{selectedProduct && <LztPreviewModal product={selectedProduct} category={cardCategory} onClose={() => setSelectedProduct(null)} />}</AnimatePresence>
      <AnimatePresence>{showCompare && compareItems.length === 2 && <CompareModal items={compareItems} category={cardCategory} onClose={() => setShowCompare(false)} />}</AnimatePresence>
    </div>
  );
}
