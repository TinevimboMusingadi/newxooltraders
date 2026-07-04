import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { CATEGORIES } from '../lib/symbolGroups';

export default function Markets() {
  const { symbols, loading } = useActiveSymbols();
  const { selectSymbol, favorites, toggleFavorite } = useMarket();
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = symbols.filter((s) => {
    const matchCat = category === 'all' || s.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || s.symbol.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const pick = (symbol) => {
    selectSymbol(symbol);
    navigate('/trade');
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
          placeholder="Search symbols…"
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

      {loading && <p className="text-muted">Loading markets…</p>}

      <div className="markets-grid">
        {filtered.map((s) => (
          <div key={s.symbol} className="market-card card">
            <div className="market-card-top">
              <span className="market-category">{s.category}</span>
              <button type="button" className="fav-btn" onClick={() => toggleFavorite(s.symbol)}>
                <Star size={16} fill={favorites.includes(s.symbol) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <h3 className="heading-md">{s.displayName || s.symbol}</h3>
            <p className="text-muted">{s.symbol}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => pick(s.symbol)}>
              Trade
            </button>
          </div>
        ))}
      </div>

      {favorites.length > 0 && (
        <div className="favorites-section">
          <h3 className="heading-md">Favorites</h3>
          <div className="favorites-row">
            {favorites.map((sym) => (
              <Link key={sym} to="/trade" className="account-chip" onClick={() => selectSymbol(sym)}>
                {sym}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
