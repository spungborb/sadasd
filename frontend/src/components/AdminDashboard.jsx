import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe, fetchAdminSettings, updateAdminSettings, fetchProfiles, createProfile, deleteProfile } from '@/data/api';
import { ArrowLeft, Save, Settings, Percent, Link, Plus, Trash2, Crosshair, Crown, Users, ShoppingBag, LayoutDashboard, Globe } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const TABS = [
  { id: 'profiles', label: 'Fetch Profiles', icon: Link },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('profiles');
  const [profiles, setProfiles] = useState([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('valorant');
  const [newUrl, setNewUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        if (!me.is_admin) { setError('Admin access required.'); setLoading(false); return; }
        const [s, p] = await Promise.all([fetchAdminSettings(), fetchProfiles()]);
        setSettings(s); setLocalSettings(s); setProfiles(p.profiles || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

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

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-8 h-8 border-2 border-valorant border-t-transparent rounded-full animate-spin" /></div>;
  if (error && !settings) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="text-center"><p className="text-red-400">{error}</p><button onClick={() => navigate('/')} className="mt-4 text-sm text-zinc-400 underline">Back</button></div></div>;

  return (
    <div className="min-h-screen bg-[#09090b] flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/5 bg-[#0d0d0f] flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-valorant to-valorant/60 flex items-center justify-center"><Crosshair className="w-4 h-4 text-white" /></div>
            <div><p className="text-sm font-heading font-bold text-white">Game Vault</p><p className="text-[9px] text-zinc-500">Admin Panel</p></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => (
            <button key={tab.id} data-testid={`admin-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>
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
            {user?.picture && <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />}
            <span className="text-xs text-zinc-400 truncate">{user?.email}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#09090b]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-heading font-bold text-white capitalize">{TABS.find(t => t.id === activeTab)?.label}</h1>
          <div className="flex items-center gap-3">
            {success && <span className="text-xs text-emerald-400">Saved!</span>}
            <button data-testid="admin-save-btn" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-valorant text-white font-semibold text-sm rounded-lg hover:bg-valorant-hover disabled:opacity-50 transition-all"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

          {/* ===== PROFILES TAB ===== */}
          {activeTab === 'profiles' && (
            <>
              {/* Base/Default URLs integrated at top of profile list */}
              <div className="p-5 rounded-xl bg-zinc-900/40 border border-valorant/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-valorant" />
                  <h3 className="text-sm font-heading font-bold text-white">Default "All" Category URLs</h3>
                </div>
                <p className="text-xs text-zinc-500">These URLs filter the main "All" tab for each game. Use them to exclude phishing/unwanted accounts from the default view.</p>
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

              {/* Add profile form */}
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

              {/* Profile list */}
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
              <p className="text-xs text-zinc-500">Configure commission markup per category. 100% = Price x 2.</p>
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
