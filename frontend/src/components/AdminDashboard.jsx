import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe, fetchAdminSettings, updateAdminSettings, fetchProfiles, createProfile, deleteProfile, fetchAdminAnalytics, clearAdminCache } from '@/data/api';
import { Save, Settings, Percent, Link as LinkIcon, Plus, Trash2, Crosshair, Crown, ShoppingBag, LayoutDashboard, Globe, Database, RefreshCw, Activity, Users, TrendingUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profiles', label: 'Fetch Profiles', icon: LinkIcon },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'sync', label: 'Sync Status', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function MetricCard({ icon: Icon, label, value, accent = '#ff4655', sub }) {
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-zinc-900/70 to-zinc-950 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-heading font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.18em] mt-1">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [profiles, setProfiles] = useState([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('valorant');
  const [newUrl, setNewUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [clearing, setClearing] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        if (!me.is_admin) { setError('Admin access required.'); setLoading(false); return; }
        const [s, p] = await Promise.all([fetchAdminSettings(), fetchProfiles()]);
        setSettings(s); setLocalSettings(s); setProfiles(p.profiles || []);
        fetchAdminAnalytics().then(setAnalytics).catch(() => {});
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const refreshAnalytics = async () => {
    try { const a = await fetchAdminAnalytics(); setAnalytics(a); } catch {}
  };

  const handleSave = async () => {
    setSaving(true); setSuccess(false);
    try {
      const updated = await updateAdminSettings({ default_region: localSettings.default_region, commission: localSettings.commission, admin_email: localSettings.admin_email, base_urls: localSettings.base_urls });
      setSettings(updated); setLocalSettings(updated); setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleCreateProfile = async () => {
    if (!newName.trim() || !newUrl.trim()) { setProfileError('Name and URL required'); return; }
    setCreating(true); setProfileError('');
    try {
      const prof = await createProfile({ name: newName.trim(), category: newCategory, lzt_url: newUrl.trim() });
      setProfiles(prev => [...prev, prof]); setNewName(''); setNewUrl('');
    } catch (e) { setProfileError(e.message); }
    finally { setCreating(false); }
  };

  const handleDeleteProfile = async (id) => {
    try { await deleteProfile(id); setProfiles(prev => prev.filter(p => p.profile_id !== id)); }
    catch (e) { setProfileError(e.message); }
  };

  const handleClearCache = async (scope) => {
    setClearing(scope);
    try { await clearAdminCache(scope); await refreshAnalytics(); }
    catch (e) { setProfileError(e.message); }
    finally { setClearing(''); }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-8 h-8 border-2 border-valorant border-t-transparent rounded-full animate-spin" /></div>;
  if (error && !settings) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="text-center"><p className="text-red-400">{error}</p><button onClick={() => navigate('/')} className="mt-4 text-sm text-zinc-400 underline">Back</button></div></div>;

  const showSaveBtn = ['pricing', 'profiles', 'settings'].includes(activeTab);
  const PIE_COLORS = ['#ff4655', '#fbbf24', '#00e5ff', '#a78bfa', '#00e676'];

  return (
    <div className="min-h-screen bg-[#09090b] flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/5 bg-[#0d0d0f] flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-valorant to-valorant/60 flex items-center justify-center"><Crosshair className="w-4 h-4 text-white" /></div>
            <div><p className="text-sm font-heading font-bold text-white">Game Vault</p><p className="text-[9px] text-zinc-500">Admin Panel</p></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => (
            <button key={tab.id} data-testid={`admin-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-valorant/10 text-white border border-valorant/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
          <Separator className="bg-white/5 my-3" />
          <button onClick={() => navigate('/market')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]">
            <ShoppingBag className="w-4 h-4" />Marketplace
          </button>
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-2">
            {user?.picture && <img src={user.picture} alt="" className="w-6 h-6 rounded-full" onError={e => e.currentTarget.style.display='none'} />}
            <span className="text-xs text-zinc-400 truncate">{user?.email}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#09090b]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-heading font-bold text-white capitalize">{TABS.find(t => t.id === activeTab)?.label}</h1>
          <div className="flex items-center gap-3">
            {success && <span className="text-xs text-emerald-400">Saved!</span>}
            {activeTab === 'overview' && (
              <button data-testid="refresh-analytics-btn" onClick={refreshAnalytics} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 hover:text-white transition-all">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
            )}
            {showSaveBtn && (
              <button data-testid="admin-save-btn" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-valorant text-white font-semibold text-sm rounded-lg hover:bg-valorant-hover disabled:opacity-50 transition-all">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <>
              {!analytics ? (
                <div className="p-10 flex items-center justify-center text-zinc-500">Loading analytics...</div>
              ) : (
                <>
                  {/* LZT Token Alert */}
                  {!analytics.lzt_token_configured && (
                    <div data-testid="token-alert" className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-300">LZT Market token not configured</p>
                        <p className="text-xs text-amber-300/60 mt-0.5">Add LZT_MARKET_TOKEN to backend/.env to enable live listings.</p>
                      </div>
                    </div>
                  )}

                  {/* Metric cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard icon={Crosshair} label="Valorant Listings" value={analytics.listings.valorant.toLocaleString()} accent="#ff4655" />
                    <MetricCard icon={Crown} label="LoL Listings" value={analytics.listings.lol.toLocaleString()} accent="#fbbf24" />
                    <MetricCard icon={Users} label="Registered Users" value={analytics.users.total} accent="#00e5ff" sub={`${analytics.users.active_sessions} active`} />
                    <MetricCard icon={LinkIcon} label="Fetch Profiles" value={analytics.profiles.total} accent="#a78bfa" sub={`${analytics.profiles.valorant} VAL · ${analytics.profiles.lol} LoL`} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Trend chart */}
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-electric" />7-Day Fetch Activity</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={analytics.trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="day" stroke="#52525b" fontSize={10} />
                          <YAxis stroke="#52525b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="fetches" stroke="#ff4655" strokeWidth={2} dot={{ fill: '#ff4655', r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Cache breakdown pie */}
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2"><Database className="w-4 h-4 text-purple-400" />Cache Breakdown</h3>
                        <span className="text-xs text-zinc-500">{analytics.cache.total} entries</span>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={[
                            { name: 'Search', value: analytics.cache.search },
                            { name: 'Item', value: analytics.cache.item },
                            { name: 'Profile', value: analytics.cache.profile },
                            { name: 'Other', value: Math.max(0, analytics.cache.total - analytics.cache.search - analytics.cache.item - analytics.cache.profile) },
                          ]} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={3}>
                            {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Listings bar chart */}
                  <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                    <h3 className="text-sm font-heading font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-valorant" />Listings by Category</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { category: 'Valorant', listings: analytics.listings.valorant },
                        { category: 'LoL', listings: analytics.listings.lol },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="category" stroke="#52525b" fontSize={11} />
                        <YAxis stroke="#52525b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="listings" fill="#ff4655" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== PROFILES TAB ===== */}
          {activeTab === 'profiles' && (
            <>
              <div className="p-5 rounded-xl bg-zinc-900/40 border border-valorant/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-valorant" />
                  <h3 className="text-sm font-heading font-bold text-white">Default "All" Category URLs</h3>
                </div>
                <p className="text-xs text-zinc-500">These URLs filter the main "All" tab for each game. Use them to exclude unwanted origins from the default view.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">All Valorant</label>
                    <input data-testid="base-url-valorant" type="text" placeholder="https://lzt.market/riot?not_origin[]=phishing&..." value={localSettings?.base_urls?.valorant || ''} onChange={e => setLocalSettings(p => ({...p, base_urls:{...(p.base_urls||{}), valorant: e.target.value}}))}
                      className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">All League of Legends</label>
                    <input data-testid="base-url-lol" type="text" placeholder="https://lzt.market/riot?not_origin[]=phishing&..." value={localSettings?.base_urls?.lol || ''} onChange={e => setLocalSettings(p => ({...p, base_urls:{...(p.base_urls||{}), lol: e.target.value}}))}
                      className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40" />
                  </div>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-3">
                <h3 className="text-sm font-heading font-bold text-white">Add Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input data-testid="profile-name-input" type="text" placeholder="Profile Name" value={newName} onChange={e => setNewName(e.target.value)}
                    className="px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500" />
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger data-testid="profile-category-select" className="bg-zinc-800/60 border-zinc-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white"><SelectItem value="valorant">Valorant</SelectItem><SelectItem value="lol">League of Legends</SelectItem></SelectContent>
                  </Select>
                  <input data-testid="profile-url-input" type="text" placeholder="Paste market URL..." value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    className="sm:col-span-2 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500" />
                </div>
                <div className="flex items-center justify-between">
                  {profileError ? <p className="text-xs text-red-400">{profileError}</p> : <div />}
                  <button data-testid="add-profile-btn" onClick={handleCreateProfile} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-electric/10 text-electric text-sm font-semibold rounded-lg border border-electric/30 hover:bg-electric/20 disabled:opacity-50 transition-all"><Plus className="w-4 h-4" />{creating ? 'Adding...' : 'Add'}</button>
                </div>
              </div>

              {profiles.filter(p => p.category === 'valorant').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Crosshair className="w-3.5 h-3.5 text-valorant" />Valorant</h3>
                  {profiles.filter(p => p.category === 'valorant').map(p => (
                    <div key={p.profile_id} data-testid={`profile-${p.profile_id}`} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-white/5">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{p.name}</p><p className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">{p.lzt_url}</p></div>
                      <button data-testid={`delete-profile-${p.profile_id}`} onClick={() => handleDeleteProfile(p.profile_id)} className="p-2 text-zinc-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {profiles.filter(p => p.category === 'lol').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Crown className="w-3.5 h-3.5 text-amber-400" />League of Legends</h3>
                  {profiles.filter(p => p.category === 'lol').map(p => (
                    <div key={p.profile_id} data-testid={`profile-${p.profile_id}`} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-white/5">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{p.name}</p><p className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">{p.lzt_url}</p></div>
                      <button data-testid={`delete-profile-${p.profile_id}`} onClick={() => handleDeleteProfile(p.profile_id)} className="p-2 text-zinc-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {profiles.length === 0 && <p className="text-xs text-zinc-600 text-center py-6">No profiles yet. Add your first URL above.</p>}
            </>
          )}

          {/* ===== PRICING TAB ===== */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-500">Configure commission markup per category. 100% = Price × 2.</p>
              {['valorant','lol'].map(cat => (
                <div key={cat} className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white capitalize flex items-center gap-2">
                      {cat === 'lol' ? <Crown className="w-4 h-4 text-amber-400" /> : <Crosshair className="w-4 h-4 text-valorant" />}
                      {cat === 'lol' ? 'League of Legends' : 'Valorant'}
                    </label>
                    <span className="text-sm font-bold text-valorant">{localSettings?.commission?.[cat]||100}%</span>
                  </div>
                  <Slider data-testid={`admin-commission-${cat}`} value={[localSettings?.commission?.[cat]||100]} onValueChange={([v]) => setLocalSettings(p => ({...p, commission:{...p.commission,[cat]:v}}))} min={0} max={300} step={5}
                    className="[&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-400/50 [&_.relative_.absolute]:bg-amber-400" />
                  <div className="flex justify-between text-xs text-zinc-600"><span>0%</span><span>300%</span></div>
                </div>
              ))}
            </div>
          )}

          {/* ===== SYNC STATUS TAB ===== */}
          {activeTab === 'sync' && (
            <>
              {!analytics ? <div className="p-10 text-center text-zinc-500">Loading...</div> : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        {analytics.lzt_token_configured ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">LZT Token</span>
                      </div>
                      <p className={`text-lg font-heading font-bold ${analytics.lzt_token_configured ? 'text-emerald-400' : 'text-red-400'}`}>{analytics.lzt_token_configured ? 'Connected' : 'Not Configured'}</p>
                    </div>
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-electric" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Total Cache</span>
                      </div>
                      <p className="text-lg font-heading font-bold text-white">{analytics.cache.total} <span className="text-xs text-zinc-500 font-normal">entries</span></p>
                    </div>
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-valorant" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Last Updated</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{new Date(analytics.updated_at).toLocaleTimeString()}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(analytics.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-4">
                    <h3 className="text-sm font-heading font-bold text-white">Quick Actions</h3>
                    <p className="text-xs text-zinc-500">Force fresh fetches by clearing specific cache scopes.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button data-testid="clear-search-cache-btn" onClick={() => handleClearCache('search')} disabled={clearing === 'search'}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/60 border border-white/5 hover:bg-zinc-800 hover:border-valorant/30 transition-all group">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">Clear Search Cache</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{analytics.cache.search} entries</p>
                        </div>
                        <RefreshCw className={`w-4 h-4 text-zinc-500 group-hover:text-valorant ${clearing === 'search' ? 'animate-spin' : ''}`} />
                      </button>
                      <button data-testid="clear-item-cache-btn" onClick={() => handleClearCache('item')} disabled={clearing === 'item'}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/60 border border-white/5 hover:bg-zinc-800 hover:border-valorant/30 transition-all group">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">Clear Item Cache</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{analytics.cache.item} entries</p>
                        </div>
                        <RefreshCw className={`w-4 h-4 text-zinc-500 group-hover:text-valorant ${clearing === 'item' ? 'animate-spin' : ''}`} />
                      </button>
                      <button data-testid="clear-profile-cache-btn" onClick={() => handleClearCache('profile')} disabled={clearing === 'profile'}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/60 border border-white/5 hover:bg-zinc-800 hover:border-valorant/30 transition-all group">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">Clear Profile Cache</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{analytics.cache.profile} entries</p>
                        </div>
                        <RefreshCw className={`w-4 h-4 text-zinc-500 group-hover:text-valorant ${clearing === 'profile' ? 'animate-spin' : ''}`} />
                      </button>
                      <button data-testid="clear-all-cache-btn" onClick={() => handleClearCache('all')} disabled={clearing === 'all'}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all group">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-red-300">Clear ALL Cache</p>
                          <p className="text-[10px] text-red-300/60 mt-0.5">Destructive · forces full refresh</p>
                        </div>
                        <Trash2 className={`w-4 h-4 text-red-400 ${clearing === 'all' ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-4">
                <h3 className="text-sm font-heading font-bold text-white">Default Region</h3>
                <Select value={localSettings?.default_region || 'eu'} onValueChange={v => setLocalSettings(p => ({...p, default_region: v}))}>
                  <SelectTrigger data-testid="admin-region-select" className="bg-zinc-800/60 border-zinc-700/50 text-white text-sm w-64"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="all">All Regions</SelectItem><SelectItem value="eu">Europe</SelectItem><SelectItem value="na">North America</SelectItem><SelectItem value="ap">Asia Pacific</SelectItem><SelectItem value="kr">Korea</SelectItem><SelectItem value="br">Brazil</SelectItem><SelectItem value="latam">LATAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-4">
                <h3 className="text-sm font-heading font-bold text-white">Admin Email</h3>
                <input data-testid="admin-email-input" type="email" value={localSettings?.admin_email||''} onChange={e => setLocalSettings(p => ({...p, admin_email:e.target.value}))} className="w-full px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-valorant/50" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
