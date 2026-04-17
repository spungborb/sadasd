import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LS_KEY = 'gv_pref_v1';

export const LANGUAGES = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'RU', label: 'Русский', flag: '🇷🇺' },
  { code: 'TR', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'PT', label: 'Português', flag: '🇵🇹' },
];

export const CURRENCIES = [
  { code: 'usd', label: 'USD', symbol: '$', rate: 1 },
  { code: 'eur', label: 'EUR', symbol: '€', rate: 0.93 },
  { code: 'gbp', label: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'rub', label: 'RUB', symbol: '₽', rate: 92 },
  { code: 'try', label: 'TRY', symbol: '₺', rate: 34 },
];

export function convertPrice(usdPrice, targetCurrency) {
  const c = CURRENCIES.find(x => x.code === targetCurrency);
  if (!c || !usdPrice) return usdPrice;
  return Number(usdPrice) * c.rate;
}

export function formatPrice(usdPrice, targetCurrency, decimals = 2) {
  const c = CURRENCIES.find(x => x.code === targetCurrency) || CURRENCIES[0];
  const converted = convertPrice(usdPrice, targetCurrency);
  if (converted === null || converted === undefined || isNaN(converted)) return `${c.symbol}—`;
  // Use compact formatting for RUB/TRY large numbers
  if (targetCurrency === 'rub' || targetCurrency === 'try') {
    return `${c.symbol}${Math.round(converted).toLocaleString('en-US')}`;
  }
  return `${c.symbol}${converted.toFixed(decimals)}`;
}

const PrefCtx = createContext(null);

export function PrefProvider({ children }) {
  const [lang, setLang] = useState('EN');
  const [currency, setCurrency] = useState('usd');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.lang) setLang(p.lang);
        if (p.currency) setCurrency(p.currency);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ lang, currency })); } catch { /* ignore */ }
  }, [lang, currency]);

  const value = useMemo(() => ({ lang, setLang, currency, setCurrency }), [lang, currency]);
  return <PrefCtx.Provider value={value}>{children}</PrefCtx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefCtx);
  if (!ctx) throw new Error('usePrefs outside provider');
  return ctx;
}
