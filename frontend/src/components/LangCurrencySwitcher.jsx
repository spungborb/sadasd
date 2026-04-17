import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, DollarSign, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefs, LANGUAGES, CURRENCIES } from '@/context/PrefContext';

function Dropdown({ items, value, onChange, renderTrigger, testId, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref} data-testid={testId}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 hover:border-white/20 hover:bg-zinc-900 transition-colors text-xs font-semibold text-white">
        {renderTrigger}
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} min-w-[180px] z-50 rounded-xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden`}>
            <div className="p-1">
              {items.map(it => {
                const active = it.code === value;
                return (
                  <button key={it.code} data-testid={`${testId}-opt-${it.code}`}
                    onClick={() => { onChange(it.code); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${active ? 'bg-valorant/10 text-valorant' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}>
                    <span className="flex items-center gap-2">
                      {it.flag && <span>{it.flag}</span>}
                      {it.symbol && <span className="font-bold w-4 text-center">{it.symbol}</span>}
                      <span className="font-semibold">{it.label}</span>
                    </span>
                    {active && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LangCurrencySwitcher() {
  const { lang, setLang, currency, setCurrency } = usePrefs();
  const curObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const langObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  return (
    <div className="flex items-center gap-1.5">
      <Dropdown testId="lang-switcher" items={LANGUAGES} value={lang} onChange={setLang}
        renderTrigger={<span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-zinc-400" /><span>{langObj.code}</span></span>} />
      <Dropdown testId="currency-switcher" items={CURRENCIES.map(c => ({ ...c, code: c.code }))} value={currency} onChange={setCurrency}
        renderTrigger={<span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-zinc-400" /><span>{curObj.label}</span></span>} />
    </div>
  );
}
