import { createContext, useContext, useMemo, useState } from 'react';

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [selectedSymbol, setSelectedSymbol] = useState(
    () => localStorage.getItem('newxool_symbol') || '1HZ100V',
  );
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('newxool_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const selectSymbol = (symbol) => {
    setSelectedSymbol(symbol);
    localStorage.setItem('newxool_symbol', symbol);
  };

  const toggleFavorite = (symbol) => {
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
