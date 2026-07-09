export const DEFAULT_SYMBOL = '1HZ100V';

export function isValidSymbol(value) {
  if (value == null) return false;
  const s = String(value).trim();
  if (!s || s === 'undefined' || s === 'null') return false;
  return true;
}

export function sanitizeSymbol(value, fallback = DEFAULT_SYMBOL) {
  return isValidSymbol(value) ? String(value).trim() : fallback;
}

export function readStoredSymbol() {
  try {
    return sanitizeSymbol(localStorage.getItem('newxool_symbol'));
  } catch {
    return DEFAULT_SYMBOL;
  }
}

export function formatSymbolLabel(symbol, displayName) {
  if (displayName && displayName !== 'undefined') return displayName;
  if (isValidSymbol(symbol)) return symbol;
  return 'Select market';
}
