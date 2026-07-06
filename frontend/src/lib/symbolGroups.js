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

export function mapActiveSymbol(s) {
  return {
    symbol: s.symbol,
    displayName: s.display_name || s.displayName || s.symbol,
    category: mapCategory(s.market),
    market: s.market,
    submarket: s.submarket,
    marketDisplay: s.market_display_name || s.marketDisplay,
    submarketDisplay: s.submarket_display_name || s.submarketDisplay,
    exchangeOpen: s.exchange_is_open ?? s.exchangeOpen,
    pip: s.pip,
    spot: s.spot,
    spotAge: s.spot_age ?? s.spotAge,
  };
}

function mapCategory(market) {
  const map = {
    synthetic_index: 'volatility',
    forex: 'forex',
    cryptocurrency: 'crypto',
    indices: 'indices',
    commodities: 'commodities',
    stocks: 'stocks',
  };
  return map[market] || market || 'other';
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
    if (!tree[market]) tree[market] = { id: market, label: s.marketDisplay || market, submarkets: {} };
    if (!tree[market].submarkets[sub]) {
      tree[market].submarkets[sub] = { id: sub, label: s.submarketDisplay || sub, symbols: [] };
    }
    tree[market].submarkets[sub].symbols.push(s);
  }
  return Object.values(tree).map((m) => ({
    ...m,
    submarkets: Object.values(m.submarkets),
  }));
}

export function filterVolatilitySymbols(symbols) {
  return symbols.filter(
    (s) => s.market === 'synthetic_index'
      || s.category === 'volatility'
      || /^R_|^1HZ/.test(s.symbol),
  );
}
