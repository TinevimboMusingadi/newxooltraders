import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState(null);

  const accounts = user?.accounts || [];
  const selectedId = user?.selectedAccountId;
  const selected = accounts.find((a) => a.accountId === selectedId);

  const handleSwitch = async (accountId) => {
    setSwitching(true);
    setMessage(null);
    try {
      await api.selectAccount(accountId);
      await refresh();
      setMessage('Account switched. Return to Trade to reconnect.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSwitching(false);
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

  return (
    <>
      <Navbar variant="app" />
      <main className="profile-page">
        <div className="container">
          <h1 className="heading-lg">Profile</h1>
          <p className="text-secondary">Your Deriv account connected via OAuth.</p>

          <div className="profile-grid">
            <div className="card profile-card">
              <h3 className="heading-md">Active Account</h3>
              {selected ? (
                <ul className="profile-details">
                  <li><span>Login ID</span><strong>{selected.loginid}</strong></li>
                  <li><span>Type</span><strong>{selected.isVirtual ? 'Demo' : 'Real'}</strong></li>
                  <li><span>Currency</span><strong>{selected.currency}</strong></li>
                </ul>
              ) : (
                <p className="text-muted">No account selected.</p>
              )}
            </div>

            <div className="card profile-card">
              <h3 className="heading-md">Switch Account</h3>
              <div className="account-list">
                {accounts.map((a) => (
                  <button
                    key={a.accountId}
                    type="button"
                    className={`account-chip ${a.accountId === selectedId ? 'active' : ''}`}
                    disabled={switching || a.accountId === selectedId}
                    onClick={() => handleSwitch(a.accountId)}
                  >
                    {a.loginid} · {a.isVirtual ? 'Demo' : 'Real'}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleRefreshAccounts}>
                Refresh Accounts
              </button>
            </div>

            <div className="card profile-card">
              <h3 className="heading-md">Deposits & Withdrawals</h3>
              <p className="text-secondary">
                Funds are held in your own Deriv account. We never process payments on your behalf.
              </p>
              <a
                href="https://app.deriv.com/cashier/deposit"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Deposit on Deriv <ExternalLink size={16} />
              </a>
            </div>

            <div className="card profile-card">
              <h3 className="heading-md">Session</h3>
              <p className="text-muted">Token expires: {user?.expiresAt ? new Date(user.expiresAt).toLocaleString() : '—'}</p>
              <button type="button" className="btn btn-secondary" onClick={logout}>
                Log Out
              </button>
            </div>
          </div>

          {message && <p className="profile-message">{message}</p>}
        </div>
      </main>
    </>
  );
}
