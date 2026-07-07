const MARKET_LABELS = {
  synthetic_index: 'Synthetic Indices',
  forex: 'Forex',
  indices: 'Indices',
  commodities: 'Commodities',
  cryptocurrency: 'Cryptocurrency',
  stocks: 'Stocks',
};

export function mapActiveSymbol(s) {
  return {
    symbol: s.symbol,
    displayName: s.display_name || s.symbol,
    market: s.market,
    submarket: s.submarket,
    marketDisplay: s.market_display_name || s.market,
    submarketDisplay: s.submarket_display_name || s.submarket,
    category: mapCategory(s.market),
    exchangeOpen: s.exchange_is_open,
    pip: s.pip,
    spot: s.spot,
    spotAge: s.spot_age,
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

export function buildCategoriesFromSymbols(symbols) {
  const tree = {};

  for (const raw of symbols) {
    const s = typeof raw.symbol === 'string' ? raw : mapActiveSymbol(raw);
    const market = s.market || 'other';
    const submarket = s.submarket || 'default';

    if (!tree[market]) {
      tree[market] = {
        id: market,
        label: MARKET_LABELS[market] || s.marketDisplay || market,
        submarkets: {},
        symbols: [],
      };
    }

    if (!tree[market].submarkets[submarket]) {
      tree[market].submarkets[submarket] = {
        id: submarket,
        label: s.submarketDisplay || submarket,
        symbols: [],
      };
    }

    tree[market].submarkets[submarket].symbols.push(s);
    tree[market].symbols.push(s);
  }

  return Object.values(tree).map((m) => ({
    ...m,
    submarkets: Object.values(m.submarkets).sort((a, b) => a.label.localeCompare(b.label)),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchActiveSymbols() {
  const { derivWsRequest } = await import('./derivWs.js');
  const data = await derivWsRequest(
    { active_symbols: 'full' },
    { match: 'active_symbols' },
  );
  return data.active_symbols || [];
}
