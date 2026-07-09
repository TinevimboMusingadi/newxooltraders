const CURRENCY_FLAGS = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  JPY: '🇯🇵',
  NZD: '🇳🇿',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  NOK: '🇳🇴',
  SEK: '🇸🇪',
  PLN: '🇵🇱',
  MXN: '🇲🇽',
  ZAR: '🇿🇦',
  INR: '🇮🇳',
  CNY: '🇨🇳',
  BTC: '₿',
  ETH: 'Ξ',
  LTC: 'Ł',
  USDT: '₮',
  eUSDT: '₮',
  tUSDT: '₮',
};

const MARKET_FLAGS = {
  volatility: '📈',
  synthetic: '🎲',
  forex: '💱',
  crypto: '🪙',
  indices: '📊',
  commodities: '🛢️',
  stocks: '🏢',
};

export function currencyFlag(code) {
  if (!code) return '💱';
  return CURRENCY_FLAGS[code.toUpperCase()] || CURRENCY_FLAGS[code] || '💱';
}

/** Flags for forex pairs like frxEURUSD → 🇪🇺🇺🇸 */
export function pairFlags(symbol) {
  if (!symbol) return '';
  const s = String(symbol);
  if (s.startsWith('frx') && s.length >= 9) {
    const a = s.slice(3, 6).toUpperCase();
    const b = s.slice(6, 9).toUpperCase();
    return `${currencyFlag(a)}${currencyFlag(b)}`;
  }
  if (s.startsWith('cry') && s.length >= 9) {
    const a = s.slice(3, 6).toUpperCase();
    return currencyFlag(a);
  }
  return '';
}

export function marketFlag(category, symbol) {
  const pair = pairFlags(symbol);
  if (pair) return pair;
  return MARKET_FLAGS[category] || '📌';
}

export function formatBalance(amount, currency = 'USD') {
  if (amount == null) return '—';
  const formatted = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}
