import { useState, useMemo, useEffect } from 'react';
import { Star, Search, X } from 'lucide-react';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { buildCategoryTree, symbolsForCategory } from '../lib/symbolGroups';
import { useMarketCategories } from '../hooks/queries';
import { formatSymbolLabel, isValidSymbol } from '../lib/symbolUtils';

export default function MarketPicker({ symbol, onSelect, trigger }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeMarket, setActiveMarket] = useState('synthetic_index');
  const { symbols, loading } = useActiveSymbols();
  const { data: catData } = useMarketCategories();
  const { favorites, toggleFavorite } = useMarket();

  const categories = catData?.categories?.length
    ? catData.categories
    : buildCategoryTree(symbols);

  useEffect(() => {
    if (categories.length && !categories.find((c) => c.id === activeMarket)) {
      setActiveMarket(categories[0].id);
    }
  }, [categories, activeMarket]);

  const activeCategory = categories.find((c) => c.id === activeMarket) || categories[0];

  const filteredSymbols = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q) {
      return symbols.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q),
      );
    }
    if (activeMarket === 'favorites') {
      return favorites.map((f) => symbols.find((s) => s.symbol === f)).filter(Boolean);
    }
    return symbolsForCategory(activeCategory);
  }, [search, symbols, activeCategory, activeMarket, favorites]);

  const current = symbols.find((s) => s.symbol === symbol);

  const pick = (sym) => {
    if (!isValidSymbol(sym)) return;
    onSelect(sym);
    setOpen(false);
    setSearch('');
  };

  const displayName = formatSymbolLabel(symbol, current?.displayName);

  return (
    <div className="market-picker">
      {trigger ? (
        <div onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <button type="button" className="market-picker-trigger card" onClick={() => setOpen(true)}>
          <span className="market-picker-name">{displayName}</span>
          {isValidSymbol(symbol) && <span className="mono text-muted">{symbol}</span>}
        </button>
      )}

      {open && (
        <div className="market-picker-overlay" onClick={() => setOpen(false)}>
          <div className="market-picker-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="market-picker-top">
              <h3>Markets</h3>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            <div className="market-picker-search">
              <Search size={14} />
              <input
                type="search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="market-picker-body">
              <aside className="market-picker-sidebar">
                <button
                  type="button"
                  className={`market-cat-item ${activeMarket === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveMarket('favorites')}
                >
                  <Star size={14} /> Favorites
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`market-cat-item ${activeMarket === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveMarket(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </aside>

              <div className="market-picker-list">
                {loading && <p className="text-muted">Loading live markets…</p>}
                {!loading && filteredSymbols.length === 0 && (
                  <p className="text-muted">No markets in this section.</p>
                )}
                {filteredSymbols.map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    className={`market-picker-row ${s.symbol === symbol ? 'active' : ''}`}
                    onClick={() => pick(s.symbol)}
                  >
                    <span>{s.displayName || s.symbol}</span>
                    <span className="market-picker-row-actions">
                      <span className="mono text-muted">{s.symbol}</span>
                      <Star
                        size={14}
                        className="fav-star"
                        fill={favorites.includes(s.symbol) ? 'currentColor' : 'none'}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(s.symbol); }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
