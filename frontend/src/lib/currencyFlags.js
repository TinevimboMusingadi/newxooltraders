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
  BTC: '₿',
  ETH: 'Ξ',
  LTC: 'Ł',
  USDT: '₮',
  eUSDT: '₮',
  tUSDT: '₮',
};

export function currencyFlag(code) {
  if (!code) return '💱';
  return CURRENCY_FLAGS[code.toUpperCase()] || CURRENCY_FLAGS[code] || '💱';
}

export function formatBalance(amount, currency = 'USD') {
  if (amount == null) return '—';
  const formatted = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}
