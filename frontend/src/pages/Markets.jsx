import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { useActiveSymbols, useRealtimePrices } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { CATEGORIES, categoryLabel, priceDecimals } from '../lib/symbolGroups';
import { isValidSymbol } from '../lib/symbolUtils';
import { Skeleton } from '../components/ui/Skeleton';

export default function Markets() {
  const { symbols, loading, error } = useActiveSymbols();
  const { selectSymbol, favorites, toggleFavorite } = useMarket();
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => symbols.filter((s) => {
    const matchCat = category === 'all' || s.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || s.symbol.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  }), [symbols, category, search]);

  const priceSymbols = useMemo(() => filtered.slice(0, 40).map((s) => s.symbol), [filtered]);
  const { prices } = useRealtimePrices(priceSymbols);

  const pick = (symbol) => {
    if (!isValidSymbol(symbol)) return;
    selectSymbol(symbol);
    navigate('/trade');
  };

  const formatPrice = (s, quote) => {
    if (quote == null) return null;
    return Number(quote).toFixed(priceDecimals(s.symbol, s.pip));
  };

  return (
    <div className="markets-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Markets</h1>
        <p className="text-secondary">Browse volatility, synthetic, forex, crypto, and indices.</p>
      </div>

      <div className="markets-toolbar card">
        <input
          type="search"
          className="markets-search"
          placeholder="Search symbols..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="category-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`preset-btn ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="markets-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="market-card card">
              <Skeleton width="50%" height="0.8rem" />
              <Skeleton width="80%" height="1.1rem" style={{ marginTop: '8px' }} />
              <Skeleton width="60%" height="0.85rem" style={{ marginTop: '6px' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="auth-error-banner">Failed to load live markets: {error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-muted markets-empty">No markets in this category. Try another tab or search.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="markets-grid">
          {filtered.map((s) => {
            const price = prices[s.symbol];
            const formatted = formatPrice(s, price?.quote);
            return (
              <div key={s.symbol} className="market-card card" data-tick={price?.dir}>
                <div className="market-card-top">
                  <span className="market-category">{categoryLabel(s.category)}</span>
                  <button type="button" className="fav-btn" onClick={() => toggleFavorite(s.symbol)}>
                    <Star size={14} fill={favorites.includes(s.symbol) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <h3 className="market-name">{s.displayName || s.symbol}</h3>
                <p className="market-symbol-code mono text-muted">{s.symbol}</p>
                <div className="market-price-row">
                  <span className="market-price mono">{formatted ?? '—'}</span>
                  {price?.dir === 'up' && <TrendingUp size={14} className="profit" />}
                  {price?.dir === 'down' && <TrendingDown size={14} className="loss" />}
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => pick(s.symbol)}>
                  Trade
                </button>
              </div>
            );
          })}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="favorites-section">
          <h3 className="heading-md">Watchlist</h3>
          <div className="favorites-row">
            {favorites.map((sym) => {
              const meta = symbols.find((s) => s.symbol === sym);
              const p = prices[sym];
              return (
                <Link key={sym} to="/trade" className="watchlist-chip" onClick={() => selectSymbol(sym)}>
                  <span className="watchlist-sym">{meta?.displayName || sym}</span>
                  {p?.quote != null && (
                    <span className={`mono ${p.dir === 'up' ? 'profit' : p.dir === 'down' ? 'loss' : ''}`}>
                      {Number(p.quote).toFixed(priceDecimals(sym, meta?.pip))}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
