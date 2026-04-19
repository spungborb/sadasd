import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wallet, Package, MessageSquare, Crosshair, Shield, Eye, EyeOff, Clock, ShieldCheck, ShieldAlert, Copy, Check, Plus, Send, ArrowLeft, AlertCircle, CheckCircle2, Hash, Globe, Mail, CalendarClock, Receipt } from 'lucide-react';
import { fetchMe, fetchWallet, fetchOrders, revealOrderCredentials, fetchTickets, fetchTicket, createTicket, replyTicket, pollTicket, logout as apiLogout } from '@/data/api';
import { usePrefs, formatPrice, LANGUAGES } from '@/context/PrefContext';
import LangCurrencySwitcher from '@/components/LangCurrencySwitcher';

const TABS = [
  { id: 'account', label: 'Account Settings', icon: User },
  { id: 'balance', label: 'Store Balance', icon: Wallet },
  { id: 'vault', label: 'Purchase Vault', icon: Package },
  { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
];

function useWarranty(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [expiresAt]);
  if (!expiresAt) return { active: false, text: 'No warranty', days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { active: false, text: 'Expired', days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const text = days > 0 ? `${days}d ${hours}h ${minutes}m` : hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
  return { active: true, text, days, hours, minutes, seconds };
}

function CredRow({ label, value, obscured }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="text-sm font-mono text-white truncate mt-0.5">{obscured ? '••••••••••••' : value}</p>
      </div>
      {!obscured && value && (
        <button data-testid={`copy-${label.toLowerCase()}-btn`} onClick={copy} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function OrderCard({ order, onOpenTicket, onOrderUpdate }) {
  const { currency } = usePrefs();
  const [revealed, setRevealed] = useState(false);
  const [creds, setCreds] = useState(null);
  const [loading, setLoading] = useState(false);
  const w = useWarranty(order.warranty_expires_at);
  const handleReveal = async () => {
    if (revealed) { setRevealed(false); return; }
    setLoading(true);
    try { const d = await revealOrderCredentials(order.order_id); setCreds(d.credentials); setRevealed(true); onOrderUpdate?.(); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };
  return (
    <motion.div data-testid={`order-card-${order.order_id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {order.category === 'lol' ? <Crosshair className="w-3.5 h-3.5 text-amber-400" /> : <Crosshair className="w-3.5 h-3.5 text-valorant" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{order.category} · {order.region || '—'}</span>
          </div>
          <h3 className="text-sm font-heading font-bold text-white truncate">{order.rank_name || `Order #${order.order_id}`}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{order.order_id}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-heading font-extrabold text-white">{formatPrice(order.price_usd, currency)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      {/* Warranty */}
      <div className={`mt-3 flex items-center gap-2 p-2.5 rounded-lg border ${order.is_trusted_seller && w.active ? 'bg-emerald-500/5 border-emerald-500/20' : w.active ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-900/60 border-white/5'}`}>
        {order.is_trusted_seller && w.active ? <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-4 h-4 text-zinc-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${w.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {order.is_trusted_seller ? 'Trusted Seller · 7-Day Warranty' : 'AS-IS · No Warranty'}
          </p>
          {w.active && <p className="text-xs font-mono text-white mt-0.5" data-testid={`warranty-timer-${order.order_id}`}>Expires in: {w.text}</p>}
          {!w.active && order.warranty_days > 0 && <p className="text-xs text-zinc-500 mt-0.5">Warranty period ended</p>}
        </div>
      </div>
      {/* Reveal + Issue */}
      <div className="mt-3 flex gap-2">
        <button data-testid={`reveal-btn-${order.order_id}`} onClick={handleReveal} disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${revealed ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-valorant/15 text-valorant border border-valorant/30 hover:bg-valorant/25'}`}>
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{loading ? 'Loading...' : (revealed ? 'Hide Credentials' : 'Reveal Credentials')}
        </button>
        <button data-testid={`issue-btn-${order.order_id}`} onClick={() => onOpenTicket(order)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all">
          <AlertCircle className="w-3.5 h-3.5" />Issue
        </button>
      </div>
      <AnimatePresence>
        {revealed && creds && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3 space-y-2">
            <CredRow label="Login" value={creds.login} />
            <CredRow label="Password" value={creds.password} />
            <CredRow label="Email" value={creds.email} />
            <CredRow label="Email Password" value={creds.email_password} />
            {creds.notes && <p className="text-[11px] text-zinc-500 italic leading-relaxed pt-1">{creds.notes}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TicketThread({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastPollRef = useRef('');
  const scrollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const t = await fetchTicket(ticketId);
      setTicket(t);
      const msgs = t.messages || [];
      if (msgs.length) lastPollRef.current = msgs[msgs.length - 1].created_at;
    } catch { /* ignore */ }
  }, [ticketId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll every 20s for admin replies
  useEffect(() => {
    const i = setInterval(async () => {
      try {
        const p = await pollTicket(ticketId, lastPollRef.current);
        if (p.new_messages?.length) {
          setTicket(prev => prev ? { ...prev, messages: [...(prev.messages || []), ...p.new_messages], status: p.status, last_activity: p.last_activity } : prev);
          lastPollRef.current = p.new_messages[p.new_messages.length - 1].created_at;
        }
      } catch { /* ignore */ }
    }, 20000);
    return () => clearInterval(i);
  }, [ticketId]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [ticket?.messages?.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await replyTicket(ticketId, text); setText(''); await refresh(); }
    catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  if (!ticket) return <div className="p-10 text-center text-zinc-500">Loading...</div>;
  const statusColor = ticket.status === 'closed' ? 'text-zinc-500' : ticket.status === 'pending_user' ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[500px]" data-testid="ticket-thread">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="text-right">
          <p className="text-sm font-heading font-bold text-white">{ticket.subject} <span className="text-xs font-mono text-zinc-500">#{ticket.seq}</span></p>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${statusColor} mt-0.5`}>{ticket.status.replace('_', ' ')}</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(ticket.messages || []).map(m => (
          <div key={m.msg_id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded-2xl ${m.from === 'user' ? 'bg-valorant/15 border border-valorant/25 rounded-br-sm' : 'bg-zinc-900 border border-white/5 rounded-bl-sm'}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5">
                {m.from === 'admin' ? <Shield className="w-2.5 h-2.5" /> : null}{m.from === 'admin' ? 'Support' : 'You'}{m.source === 'telegram' && <span className="text-[8px] text-electric">· telegram</span>}
              </p>
              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{m.text}</p>
              <p className="text-[9px] text-zinc-600 mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      {ticket.status !== 'closed' && (
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <textarea data-testid="ticket-reply-input" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type your reply... (Enter to send)"
              className="flex-1 px-3 py-2 bg-zinc-900/80 border border-white/10 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40 resize-none" rows={2} />
            <button data-testid="ticket-send-btn" onClick={send} disabled={sending || !text.trim()}
              className="px-4 py-2 bg-valorant text-white rounded-lg font-bold text-sm hover:bg-valorant-hover disabled:opacity-40 transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTicketForm({ prefillOrderId, onCreated, onCancel }) {
  const [subject, setSubject] = useState(prefillOrderId ? 'Issue with purchase' : '');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!message.trim()) { setErr('Message is required'); return; }
    setBusy(true); setErr('');
    try { const t = await createTicket({ subject, message, order_id: prefillOrderId }); onCreated(t); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="p-5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3" data-testid="new-ticket-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold text-white">New Ticket</h3>
        {prefillOrderId && <span className="text-[10px] font-mono text-zinc-500">Order: {prefillOrderId}</span>}
      </div>
      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" data-testid="ticket-subject-input"
        className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40" />
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={4} data-testid="ticket-message-input"
        className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40 resize-none" />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Cancel</button>
        <button onClick={submit} disabled={busy} data-testid="ticket-submit-btn" className="flex items-center gap-2 px-4 py-2 bg-valorant text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-valorant-hover disabled:opacity-50 transition-all">
          <Send className="w-3 h-3" />{busy ? 'Creating...' : 'Create Ticket'}
        </button>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, currency } = usePrefs();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'account');
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openTicketId, setOpenTicketId] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketPrefillOrder, setTicketPrefillOrder] = useState(null);
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    (async () => {
      try { const me = await fetchMe(); setUser(me); }
      catch { navigate('/'); return; }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const loadWallet = useCallback(() => fetchWallet().then(setWallet).catch(() => {}), []);
  const loadOrders = useCallback(() => fetchOrders().then(d => setOrders(d.orders || [])).catch(() => {}), []);
  const loadTickets = useCallback(() => fetchTickets().then(d => setTickets(d.tickets || [])).catch(() => {}), []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'balance') loadWallet();
    if (activeTab === 'vault') loadOrders();
    if (activeTab === 'tickets') loadTickets();
  }, [activeTab, user, loadWallet, loadOrders, loadTickets]);

  // Tickets poll every 30s while on tickets tab (list view)
  useEffect(() => {
    if (activeTab !== 'tickets' || openTicketId) return;
    const i = setInterval(loadTickets, 30000);
    return () => clearInterval(i);
  }, [activeTab, openTicketId, loadTickets]);

  const openIssueForOrder = (order) => { setTicketPrefillOrder(order.order_id); setCreatingTicket(true); setActiveTab('tickets'); };
  const handleTicketCreated = (t) => { setTickets(prev => [t, ...prev]); setCreatingTicket(false); setTicketPrefillOrder(null); setOpenTicketId(t.ticket_id); };
  const handleLogout = async () => { await apiLogout(); navigate('/'); };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="w-8 h-8 border-2 border-valorant border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#09090b] flex" data-testid="user-dashboard">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0d0d0f] flex flex-col">
        <div className="p-4 border-b border-white/5">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-valorant to-valorant/60 flex items-center justify-center"><Crosshair className="w-4 h-4 text-white" /></div>
            <div className="text-left"><p className="text-sm font-heading font-bold text-white">Game Vault</p><p className="text-[9px] text-zinc-500">My Dashboard</p></div>
          </button>
        </div>
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          {user.picture && <img src={user.picture} alt="" className="w-10 h-10 rounded-full border border-white/10" onError={e => e.currentTarget.style.display='none'} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user.name || 'User'}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => (
            <button key={tab.id} data-testid={`dashboard-tab-${tab.id}`} onClick={() => { setActiveTab(tab.id); setOpenTicketId(null); setCreatingTicket(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-valorant/10 text-white border border-valorant/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-white/5 space-y-1">
            <button onClick={() => navigate('/market')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]">
              <Package className="w-4 h-4" />Marketplace
            </button>
            {user.is_admin && (
              <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]">
                <Shield className="w-4 h-4" />Admin Panel
              </button>
            )}
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/5">
              <ArrowLeft className="w-4 h-4" />Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#09090b]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-heading font-bold text-white">{TABS.find(t => t.id === activeTab)?.label}</h1>
          <LangCurrencySwitcher />
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* ===== ACCOUNT ===== */}
          {activeTab === 'account' && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-white/5">
                <h3 className="text-sm font-heading font-bold text-white mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-electric" />Google Account</h3>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-900/60 border border-white/5">
                  {user.picture && <img src={user.picture} alt="" className="w-12 h-12 rounded-full" onError={e => e.currentTarget.style.display='none'} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Verified via Google</span></div>
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-white/5">
                <h3 className="text-sm font-heading font-bold text-white mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-electric" />Timezone</h3>
                <select data-testid="tz-select" value={tz} onChange={e => setTz(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-900/80 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-valorant/40">
                  {Intl.supportedValuesOf?.('timeZone')?.slice(0, 50).map(z => <option key={z} value={z}>{z}</option>) || <option value={tz}>{tz}</option>}
                </select>
                <p className="text-[10px] text-zinc-500 mt-2">Auto-detected from browser. Orders &amp; tickets use your local timezone.</p>
              </div>
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-white/5">
                <h3 className="text-sm font-heading font-bold text-white mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-electric" />Language</h3>
                <div className="grid grid-cols-5 gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l.code} data-testid={`lang-pick-${l.code}`} onClick={() => setLang(l.code)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-bold transition-all ${lang === l.code ? 'bg-valorant/15 text-valorant border-valorant/40' : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}`}>
                      <span className="text-lg">{l.flag}</span>{l.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== BALANCE ===== */}
          {activeTab === 'balance' && (
            <div className="space-y-5">
              <div className="relative p-7 rounded-2xl bg-gradient-to-br from-valorant/20 via-purple-900/10 to-zinc-900 border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-valorant/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4 text-valorant" /><span className="text-[10px] font-bold uppercase tracking-widest text-valorant">Store Credit</span></div>
                  <p className="text-5xl font-heading font-extrabold text-white tracking-tight" data-testid="wallet-balance">{formatPrice(wallet?.balance_usd || 0, currency)}</p>
                  <p className="text-xs text-zinc-500 mt-2">Available for purchases &amp; refunds</p>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-white/5">
                <h3 className="text-sm font-heading font-bold text-white mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-electric" />Transactions</h3>
                {!wallet?.transactions?.length ? (
                  <p className="text-sm text-zinc-500 text-center py-6">No transactions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {wallet.transactions.map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-white/5">
                        <div><p className="text-sm font-semibold text-white">{tx.description || tx.type}</p><p className="text-[10px] text-zinc-500">{new Date(tx.created_at).toLocaleString()}</p></div>
                        <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{formatPrice(Math.abs(tx.amount), currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== VAULT ===== */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="p-10 rounded-xl bg-zinc-900/50 border border-white/5 text-center">
                  <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No purchases yet.</p>
                  <button onClick={() => navigate('/market')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-valorant text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-valorant-hover transition-all">Browse Marketplace</button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500">{orders.length} order{orders.length !== 1 ? 's' : ''} · reveal credentials are logged for security.</p>
                  {orders.map(o => <OrderCard key={o.order_id} order={o} onOpenTicket={openIssueForOrder} onOrderUpdate={loadOrders} />)}
                </>
              )}
            </div>
          )}

          {/* ===== TICKETS ===== */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {openTicketId ? (
                <TicketThread ticketId={openTicketId} onBack={() => { setOpenTicketId(null); loadTickets(); }} />
              ) : creatingTicket ? (
                <NewTicketForm prefillOrderId={ticketPrefillOrder} onCreated={handleTicketCreated} onCancel={() => { setCreatingTicket(false); setTicketPrefillOrder(null); }} />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
                    <button data-testid="new-ticket-btn" onClick={() => setCreatingTicket(true)} className="flex items-center gap-2 px-4 py-2 bg-valorant text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-valorant-hover transition-all">
                      <Plus className="w-3.5 h-3.5" />New Ticket
                    </button>
                  </div>
                  {tickets.length === 0 ? (
                    <div className="p-10 rounded-xl bg-zinc-900/50 border border-white/5 text-center">
                      <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">No support tickets yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tickets.map(t => (
                        <button key={t.ticket_id} data-testid={`ticket-row-${t.ticket_id}`} onClick={() => setOpenTicketId(t.ticket_id)}
                          className="w-full flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-900/70 transition-all text-left">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Hash className="w-3 h-3 text-zinc-500" /><span className="text-[10px] font-mono text-zinc-500">{t.seq}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${t.status === 'closed' ? 'bg-zinc-800 text-zinc-500' : t.status === 'pending_user' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{t.status.replace('_', ' ')}</span>
                            </div>
                            <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{(t.messages || []).length} message{(t.messages || []).length !== 1 ? 's' : ''} · {new Date(t.last_activity).toLocaleString()}</p>
                          </div>
                          <Clock className="w-4 h-4 text-zinc-600 ml-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
