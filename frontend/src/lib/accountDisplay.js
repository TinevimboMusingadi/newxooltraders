export function isDemoAccount(account) {
  if (!account) return false;
  if (account.accountType === 'demo') return true;
  if (account.isVirtual) return true;
  const id = String(account.loginid || account.accountId || '');
  if (/^DOT/i.test(id)) return true;
  if (/^VRT/i.test(id)) return true;
  return false;
}

export function getAccountMode(selectedAccount, accountId) {
  if (!selectedAccount && !accountId) {
    return { mode: 'unknown', label: 'Not connected', badgeClass: 'account-badge-unknown' };
  }
  if (!selectedAccount) {
    return { mode: 'unknown', label: 'Unknown', badgeClass: 'account-badge-unknown' };
  }
  if (isDemoAccount(selectedAccount)) {
    return {
      mode: 'demo',
      label: 'Practice',
      shortLabel: 'Demo',
      badgeClass: 'account-badge-demo',
      description: 'Virtual funds — no real money at risk',
    };
  }
  return {
    mode: 'real',
    label: 'Live',
    shortLabel: 'Real',
    badgeClass: 'account-badge-real',
    description: 'Real funds — trades use your Deriv balance',
  };
}

export function getAccountTypeLabel(selectedAccount, accountId) {
  return getAccountMode(selectedAccount, accountId).shortLabel;
}

export function getAccountDisplayId(selectedAccount, accountId) {
  return selectedAccount?.loginid || accountId || 'No account';
}

export const REAL_TRADE_CONFIRM_KEY = 'newxool_real_trade_confirmed';

export function hasRealTradeConfirmation() {
  return sessionStorage.getItem(REAL_TRADE_CONFIRM_KEY) === '1';
}

export function setRealTradeConfirmation() {
  sessionStorage.setItem(REAL_TRADE_CONFIRM_KEY, '1');
}
