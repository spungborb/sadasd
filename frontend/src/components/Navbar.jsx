import { useNavigate } from 'react-router-dom';
import { Crosshair, Store, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { logout as apiLogout } from '@/data/api';
import LangCurrencySwitcher from '@/components/LangCurrencySwitcher';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  const handleLogout = async () => { await apiLogout(); setUser(null); };

  return (
    <nav data-testid="navbar" className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#09090b]/70 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-valorant to-valorant/60 flex items-center justify-center shadow-[0_0_15px_rgba(255,70,85,0.3)]">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white tracking-tight leading-none">Game <span className="text-valorant">Vault</span></h1>
            <p className="text-[10px] font-body text-zinc-500 tracking-[0.15em] uppercase">Premium Accounts</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <button data-testid="nav-marketplace" onClick={() => navigate('/market')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/5"><Store className="w-4 h-4" />Marketplace</button>
          {user && <button data-testid="nav-dashboard" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"><LayoutDashboard className="w-4 h-4" />Dashboard</button>}
          {user?.is_admin && <button data-testid="nav-admin" onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"><Settings className="w-4 h-4" />Admin</button>}
        </div>
        <div className="flex items-center gap-3">
          <LangCurrencySwitcher />
          {/* Live API indicator — admin only */}
          {user?.is_admin && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-400 font-body">Live API</span>
            </div>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5">
                {user.picture && <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />}
                <span className="text-xs text-zinc-300 font-medium hidden sm:inline max-w-[100px] truncate">{user.name || user.email}</span>
              </div>
              {user.is_admin && <button data-testid="admin-btn" onClick={() => navigate('/admin')} className="p-2 text-amber-400 hover:text-amber-300 transition-colors md:hidden"><Settings className="w-4 h-4" /></button>}
              <button data-testid="logout-btn" onClick={handleLogout} className="p-2 text-zinc-500 hover:text-white transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : (
            <button data-testid="sign-in-btn" onClick={handleLogin} className="px-4 py-2 text-sm font-semibold text-white bg-valorant/90 hover:bg-valorant rounded-lg transition-all hover:shadow-[0_0_20px_rgba(255,70,85,0.3)]">Sign In</button>
          )}
        </div>
      </div>
    </nav>
  );
}
