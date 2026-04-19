import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, Hash, Shield, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { fetchAdminTickets, fetchTicket, adminReplyTicket, adminSetTicketStatus } from '@/data/api';

const STATUS_META = {
  open: { color: 'emerald', label: 'Open', dot: 'bg-emerald-400' },
  pending_user: { color: 'amber', label: 'Awaiting User', dot: 'bg-amber-400' },
  closed: { color: 'zinc', label: 'Closed', dot: 'bg-zinc-500' },
};

export default function AdminSupportPanel() {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ open: 0, pending_user: 0, closed: 0 });
  const [filter, setFilter] = useState('open');
  const [openTicket, setOpenTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchAdminTickets(filter === 'all' ? '' : filter);
      setTickets(d.tickets || []);
      setCounts(d.counts || { open: 0, pending_user: 0, closed: 0 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);

  const openThread = async (ticket_id) => {
    try { const t = await fetchTicket(ticket_id); setOpenTicket(t); }
    catch (e) {
      // admin-view path
      const all = await fetchAdminTickets('');
      const t = (all.tickets || []).find(x => x.ticket_id === ticket_id);
      if (t) setOpenTicket(t);
    }
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [openTicket?.messages?.length]);

  const send = async () => {
    if (!reply.trim() || !openTicket) return;
    setSending(true);
    try {
      const r = await adminReplyTicket(openTicket.ticket_id, reply);
      setOpenTicket(prev => ({ ...prev, messages: [...(prev.messages || []), r.message], status: 'pending_user' }));
      setReply('');
      load();
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  const setStatus = async (s) => {
    if (!openTicket) return;
    try { await adminSetTicketStatus(openTicket.ticket_id, s); setOpenTicket(prev => ({ ...prev, status: s })); load(); }
    catch (e) { alert(e.message); }
  };

  if (openTicket) {
    const statusMeta = STATUS_META[openTicket.status] || STATUS_META.open;
    return (
      <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] rounded-xl bg-zinc-900/40 border border-white/5 overflow-hidden" data-testid="admin-ticket-thread">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/60">
          <button onClick={() => setOpenTicket(null)} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" />All Tickets</button>
          <div className="text-center min-w-0 flex-1 px-4">
            <p className="text-sm font-heading font-bold text-white truncate">{openTicket.subject} <span className="text-xs font-mono text-zinc-500">#{openTicket.seq}</span></p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{openTicket.user_name || openTicket.user_email}{openTicket.order_id ? ` · Order ${openTicket.order_id}` : ''}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-${statusMeta.color}-500/15 text-${statusMeta.color}-400`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
            </span>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/40">
          {(openTicket.messages || []).map(m => (
            <div key={m.msg_id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl ${m.from === 'admin' ? 'bg-valorant/15 border border-valorant/25 rounded-br-sm' : 'bg-zinc-900 border border-white/5 rounded-bl-sm'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5">
                  {m.from === 'admin' ? <><Shield className="w-2.5 h-2.5" />{m.author_name || 'Admin'}</> : m.author_name || 'User'}
                  {m.source === 'telegram' && <span className="text-[8px] text-electric">· telegram</span>}
                </p>
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{m.text}</p>
                <p className="text-[9px] text-zinc-600 mt-1">{new Date(m.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        {openTicket.status !== 'closed' ? (
          <div className="p-3 border-t border-white/5 bg-zinc-900/60">
            <div className="flex gap-2">
              <textarea data-testid="admin-reply-input" value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type reply... (Enter to send, Shift+Enter for newline)"
                className="flex-1 px-3 py-2 bg-zinc-800/60 border border-white/10 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-valorant/40 resize-none" rows={2} />
              <div className="flex flex-col gap-2">
                <button data-testid="admin-reply-send-btn" onClick={send} disabled={sending || !reply.trim()}
                  className="px-4 py-2 bg-valorant text-white rounded-lg font-bold hover:bg-valorant-hover disabled:opacity-40"><Send className="w-4 h-4" /></button>
                <button data-testid="admin-close-ticket-btn" onClick={() => setStatus('closed')}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700">Close</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 bg-zinc-900/60 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Ticket is closed.</span>
            <button data-testid="admin-reopen-btn" onClick={() => setStatus('open')} className="px-4 py-2 bg-electric/15 text-electric rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-electric/25">Reopen</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="admin-support-panel">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {['open', 'pending_user', 'closed', 'all'].map(f => {
          const meta = STATUS_META[f];
          const cnt = f === 'all' ? (counts.open + counts.pending_user + counts.closed) : counts[f];
          const active = filter === f;
          return (
            <button key={f} data-testid={`support-filter-${f}`} onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${active ? 'bg-valorant/15 text-valorant border-valorant/40' : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}`}>
              {meta ? <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> : null}
              {f === 'all' ? 'All' : meta.label}
              <span className="text-[10px] text-zinc-500">{cnt}</span>
            </button>
          );
        })}
        <button onClick={load} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="p-10 rounded-xl bg-zinc-900/40 border border-white/5 text-center">
          <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No tickets in this view.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => {
            const meta = STATUS_META[t.status] || STATUS_META.open;
            const lastMsg = (t.messages || [])[(t.messages || []).length - 1];
            return (
              <button key={t.ticket_id} data-testid={`admin-ticket-row-${t.ticket_id}`} onClick={() => openThread(t.ticket_id) || setOpenTicket(t)}
                className="w-full flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/15 hover:bg-zinc-900/70 transition-all text-left">
                <div className={`w-1.5 h-12 rounded-full ${meta.dot} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Hash className="w-3 h-3 text-zinc-500" /><span className="text-[10px] font-mono text-zinc-500">{t.seq}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-${meta.color}-500/15 text-${meta.color}-400`}>{meta.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                  {lastMsg && <p className="text-[11px] text-zinc-500 truncate mt-0.5"><span className="font-bold">{lastMsg.from === 'admin' ? 'You' : t.user_name || 'User'}:</span> {lastMsg.text}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-zinc-500 whitespace-nowrap">{new Date(t.last_activity).toLocaleDateString()}</p>
                  <p className="text-[10px] text-zinc-600 whitespace-nowrap">{(t.messages || []).length} msg{(t.messages || []).length !== 1 ? 's' : ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
