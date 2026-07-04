import { getAccountMode, getAccountDisplayId } from '../lib/accountDisplay';

export default function AccountModeBanner({ account, accountId, balance }) {
  const mode = getAccountMode(account, accountId);
  const displayId = getAccountDisplayId(account, accountId);

  if (mode.mode === 'unknown') return null;

  const balanceText =
    balance?.balance != null
      ? `${Number(balance.balance).toLocaleString()} ${balance.currency || account?.currency || 'USD'}`
      : account?.balance != null
        ? `${Number(account.balance).toLocaleString()} ${account?.currency || 'USD'}`
        : mode.mode === 'demo'
          ? '10,000 USD virtual'
          : null;

  return (
    <div className={`account-mode-banner ${mode.badgeClass}`}>
      <div className="account-mode-banner-main">
        <span className="account-mode-badge">{mode.label}</span>
        <span className="account-mode-id">{displayId}</span>
        {balanceText && <span className="account-mode-balance">{balanceText}</span>}
      </div>
      <p className="account-mode-desc">{mode.description}</p>
    </div>
  );
}
