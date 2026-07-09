const MARKET_LABELS = {
  synthetic_index: 'Synthetic Indices',
  forex: 'Forex',
  indices: 'Indices',
  commodities: 'Commodities',
  cryptocurrency: 'Cryptocurrency',
  stocks: 'Stocks',
};

/** Public options WS uses underlying_*; legacy v3 uses symbol / display_name. */
export function pickSymbolCode(s) {
  return s.symbol || s.underlying_symbol || s.underlyingSymbol || null;
}

export function pickDisplayName(s) {
  return (
    s.display_name
    || s.displayName
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

function mapCategoryFromSymbol(s) {
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
  return {
    symbol,
    displayName,
    market: s.market,
    submarket: s.submarket,
    marketDisplay: s.market_display_name || s.marketDisplay || MARKET_LABELS[s.market] || s.market,
    submarketDisplay: s.submarket_display_name || s.submarketDisplay || s.submarket,
    category: mapCategoryFromSymbol({ ...s, symbol }),
    exchangeOpen: s.exchange_is_open ?? s.exchangeOpen,
    pip: s.pip ?? s.pip_size,
    spot: s.spot,
    spotAge: s.spot_age ?? s.spotAge,
  };
}

export function filterVolatilitySymbols(symbols) {
  return symbols.filter((s) => s.category === 'volatility' || isVolatilitySymbol(s));
}

export function buildCategoriesFromSymbols(symbols) {
  const tree = {};

  for (const raw of symbols) {
    const s = typeof raw.symbol === 'string' && raw.displayName ? raw : mapActiveSymbol(raw);
    if (!s.symbol) continue;
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
    { match: 'active_symbols', timeoutMs: 20000 },
  );
  return data.active_symbols || [];
}
