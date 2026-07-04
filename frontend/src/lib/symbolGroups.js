export const SYMBOL_CATALOG = [
  { symbol: '1HZ100V', displayName: 'Volatility 100 Index', category: 'volatility' },
  { symbol: '1HZ75V', displayName: 'Volatility 75 Index', category: 'volatility' },
  { symbol: '1HZ50V', displayName: 'Volatility 50 Index', category: 'volatility' },
  { symbol: '1HZ25V', displayName: 'Volatility 25 Index', category: 'volatility' },
  { symbol: '1HZ10V', displayName: 'Volatility 10 Index', category: 'volatility' },
  { symbol: 'R_100', displayName: 'Volatility 100 (1s)', category: 'synthetic' },
  { symbol: 'R_75', displayName: 'Volatility 75 (1s)', category: 'synthetic' },
  { symbol: 'R_50', displayName: 'Volatility 50 (1s)', category: 'synthetic' },
  { symbol: 'R_25', displayName: 'Volatility 25 (1s)', category: 'synthetic' },
  { symbol: 'R_10', displayName: 'Volatility 10 (1s)', category: 'synthetic' },
  { symbol: 'frxEURUSD', displayName: 'EUR/USD', category: 'forex' },
  { symbol: 'frxGBPUSD', displayName: 'GBP/USD', category: 'forex' },
  { symbol: 'frxUSDJPY', displayName: 'USD/JPY', category: 'forex' },
  { symbol: 'cryBTCUSD', displayName: 'BTC/USD', category: 'crypto' },
  { symbol: 'cryETHUSD', displayName: 'ETH/USD', category: 'crypto' },
  { symbol: 'OTC_DJI', displayName: 'US Index', category: 'indices' },
  { symbol: 'OTC_GDAXI', displayName: 'Germany Index', category: 'indices' },
];

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'volatility', label: 'Volatility' },
  { id: 'synthetic', label: 'Synthetic' },
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'indices', label: 'Indices' },
];

export function groupSymbols(symbols) {
  return symbols.reduce((acc, s) => {
    const cat = s.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});
}
