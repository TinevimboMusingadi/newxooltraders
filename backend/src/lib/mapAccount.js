export function isDemoAccount(raw) {
  if (!raw) return false;
  if (raw.account_type === 'demo') return true;
  if (Boolean(raw.is_virtual)) return true;
  const id = String(raw.loginid || raw.account_id || '');
  if (/^DOT/i.test(id)) return true;
  if (/^VRT/i.test(id)) return true;
  return false;
}

export function mapAccount(raw) {
  const demo = isDemoAccount(raw);
  return {
    accountId: raw.account_id || raw.loginid,
    loginid: raw.loginid || raw.account_id,
    currency: raw.currency,
    isVirtual: demo,
    accountType: raw.account_type || (demo ? 'demo' : 'real'),
    balance: raw.balance,
  };
}

export function mapAccounts(rawList) {
  return (rawList || []).map(mapAccount);
}
