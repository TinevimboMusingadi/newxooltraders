export function getAccountTypeLabel(selectedAccount, accountId) {
  if (!selectedAccount && !accountId) return 'Not connected';
  if (!selectedAccount) return 'Unknown';
  return selectedAccount.isVirtual ? 'Demo' : 'Real';
}

export function getAccountDisplayId(selectedAccount, accountId) {
  return selectedAccount?.loginid || accountId || 'No account';
}
