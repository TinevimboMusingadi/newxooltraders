import { createContext, useContext, useMemo, useState } from 'react';
import { isValidSymbol, readStoredSymbol, sanitizeSymbol } from '../lib/symbolUtils';

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    const clean = readStoredSymbol();
    try {
      localStorage.setItem('newxool_symbol', clean);
    } catch {
      /* ignore */
    }
    return clean;
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('newxool_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const selectSymbol = (symbol) => {
    if (!isValidSymbol(symbol)) return;
    const clean = sanitizeSymbol(symbol);
    setSelectedSymbol(clean);
    localStorage.setItem('newxool_symbol', clean);
  };

  const toggleFavorite = (symbol) => {
    if (!isValidSymbol(symbol)) return;
    setFavorites((prev) => {
      const next = prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      localStorage.setItem('newxool_favorites', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ selectedSymbol, selectSymbol, favorites, toggleFavorite }),
    [selectedSymbol, favorites],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
