export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'volatility', label: 'Volatility' },
  { id: 'synthetic', label: 'Synthetic' },
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'indices', label: 'Indices' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'stocks', label: 'Stocks' },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.filter((c) => c.id !== 'all').map((c) => [c.id, c.label]),
);

function pickSymbolCode(s) {
  return s.symbol || s.underlying_symbol || s.underlyingSymbol || null;
}

function pickDisplayName(s) {
  return (
    s.displayName
    || s.display_name
    || s.underlying_symbol_name
    || s.underlyingSymbolName
    || pickSymbolCode(s)
    || null
  );
}

function isVolatilitySymbol(s) {
  const sub = (s.submarket || '').toLowerCase();
  const sym = pickSymbolCode(s) || '';
  const name = pickDisplayName(s) || '';
  return (
    /volatility|random/i.test(sub)
    || /volatility/i.test(name)
    || /^R_|^1HZ/i.test(sym)
  );
}

export function mapCategoryFromSymbol(s) {
  const market = s.market;
  if (market === 'synthetic_index') {
    return isVolatilitySymbol(s) ? 'volatility' : 'synthetic';
  }
  const map = {
    forex: 'forex',
    cryptocurrency: 'crypto',
    indices: 'indices',
    commodities: 'commodities',
    stocks: 'stocks',
  };
  return map[market] || market || 'other';
}

export function mapActiveSymbol(s) {
  const symbol = pickSymbolCode(s);
  const displayName = pickDisplayName(s);
  if (!symbol) return null;
  return {
    symbol,
    displayName: displayName || symbol,
    category: mapCategoryFromSymbol({ ...s, symbol }),
    market: s.market,
    submarket: s.submarket,
    marketDisplay: s.marketDisplay || s.market_display_name || s.market,
    submarketDisplay: s.submarketDisplay || s.submarket_display_name || s.submarket,
    exchangeOpen: s.exchange_is_open ?? s.exchangeOpen,
    pip: s.pip ?? s.pip_size,
    spot: s.spot,
    spotAge: s.spot_age ?? s.spotAge,
  };
}

/** Normalize API symbols without wiping backend-mapped fields. */
export function normalizeSymbol(s) {
  const symbol = pickSymbolCode(s);
  if (!symbol) return null;
  if (s.displayName && s.market && s.symbol) {
    return {
      ...s,
      symbol,
      displayName: pickDisplayName(s) || symbol,
      category: s.category || mapCategoryFromSymbol({ ...s, symbol }),
    };
  }
  return mapActiveSymbol(s);
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Other';
}

export function groupSymbols(symbols) {
  return symbols.reduce((acc, s) => {
    const cat = s.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});
}

export function buildCategoryTree(symbols) {
  const tree = {};
  for (const s of symbols) {
    const market = s.market || 'other';
    const sub = s.submarket || 'default';
    if (!tree[market]) {
      tree[market] = {
        id: market,
        label: s.marketDisplay || market,
        submarkets: {},
        symbols: [],
      };
    }
    if (!tree[market].submarkets[sub]) {
      tree[market].submarkets[sub] = {
        id: sub,
        label: s.submarketDisplay || sub,
        symbols: [],
      };
    }
    tree[market].submarkets[sub].symbols.push(s);
    tree[market].symbols.push(s);
  }
  return Object.values(tree).map((m) => ({
    ...m,
    submarkets: Object.values(m.submarkets),
  }));
}

export function symbolsForCategory(category) {
  if (!category) return [];
  if (category.symbols?.length) return category.symbols;
  if (!category.submarkets?.length) return [];
  return category.submarkets.flatMap((sub) => sub.symbols || []);
}

export function filterVolatilitySymbols(symbols) {
  return symbols.filter(
    (s) => s.category === 'volatility' || isVolatilitySymbol(s),
  );
}

export function priceDecimals(symbol, pip) {
  if (pip && pip > 0) {
    const d = String(1 / pip).split('.')[1];
    if (d) return d.length;
  }
  if (symbol?.startsWith('frx')) return 4;
  if (symbol?.startsWith('cry')) return 2;
  return 2;
}
