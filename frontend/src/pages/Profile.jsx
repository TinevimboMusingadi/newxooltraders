import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { getAccountMode } from '../lib/accountDisplay';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const accounts = user?.accounts || [];
  const selectedId = user?.selectedAccountId;
  const selected = accounts.find((a) => a.accountId === selectedId);
  const mode = getAccountMode(selected, selectedId);

  const handleSwitch = async (accountId) => {
    setBusy(true);
    setMessage(null);
    try {
      await api.selectAccount(accountId);
      await refresh();
      setMessage('Account switched.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshAccounts = async () => {
    try {
      await api.getAccounts();
      await refresh();
      setMessage('Accounts refreshed.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleCreateDemo = async () => {
    setBusy(true);
    try {
      await api.createDemoAccount();
      await refresh();
      setMessage('Demo account created with $10,000 virtual balance.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetDemo = async () => {
    if (!selected?.isVirtual) return;
    setBusy(true);
    try {
      await api.resetDemoBalance(selected.accountId);
      setMessage('Demo balance reset to $10,000.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-page-inner">
      <div className="page-header-block">
        <h1 className="heading-lg">Profile</h1>
        <p className="text-secondary">Manage Deriv accounts connected via OAuth.</p>
      </div>

      <div className="profile-grid">
        <div className="card profile-card">
          <h3 className="heading-md">Active Account</h3>
          {selected ? (
            <ul className="profile-details">
              <li><span>Login ID</span><strong>{selected.loginid}</strong></li>
              <li><span>Type</span><strong>{mode.label} ({mode.shortLabel})</strong></li>
              <li><span>Currency</span><strong>{selected.currency}</strong></li>
            </ul>
          ) : (
            <p className="text-muted">No account selected.</p>
          )}
        </div>

        <div className="card profile-card">
          <h3 className="heading-md">Switch Account</h3>
          <div className="account-list">
            {accounts.map((a) => {
              const m = getAccountMode(a, a.accountId);
              return (
                <button
                  key={a.accountId}
                  type="button"
                  className={`account-chip ${a.accountId === selectedId ? 'active' : ''} ${m.badgeClass}`}
                  disabled={busy || a.accountId === selectedId}
                  onClick={() => handleSwitch(a.accountId)}
                >
                  {a.loginid} · {m.shortLabel}
                </button>
              );
            })}
          </div>
          <div className="profile-actions">
            <button type="button" className="btn btn-secondary" onClick={handleRefreshAccounts} disabled={busy}>
              Refresh
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateDemo} disabled={busy}>
              Create demo account
            </button>
            {selected?.isVirtual && (
              <button type="button" className="btn btn-secondary" onClick={handleResetDemo} disabled={busy}>
                Reset demo to $10k
              </button>
            )}
          </div>
        </div>

        <div className="card profile-card">
          <h3 className="heading-md">Deposits & Withdrawals</h3>
          <p className="text-secondary">Funds stay in your Deriv account — we never hold your money.</p>
          <a href="https://app.deriv.com/cashier/deposit" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Deposit on Deriv <ExternalLink size={16} />
          </a>
        </div>

        <div className="card profile-card">
          <h3 className="heading-md">Session</h3>
          <p className="text-muted">Expires: {user?.expiresAt ? new Date(user.expiresAt).toLocaleString() : '—'}</p>
          <button type="button" className="btn btn-secondary" onClick={logout}>Log Out</button>
        </div>
      </div>

      {message && <p className="profile-message">{message}</p>}
    </div>
  );
}
