import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { getAccountDisplayId, getAccountMode, isDemoAccount } from '../lib/accountDisplay';

export default function AccountSwitcher() {
  const { user, refresh, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('demo');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const accounts = user?.accounts || [];
  const selectedId = user?.selectedAccountId;
  const selected = accounts.find((a) => a.accountId === selectedId);
  const mode = getAccountMode(selected, selectedId);

  const realAccounts = accounts.filter((a) => !isDemoAccount(a));
  const demoAccounts = accounts.filter((a) => isDemoAccount(a));
  const list = tab === 'real' ? realAccounts : demoAccounts;

  useEffect(() => {
    setTab(isDemoAccount(selected) ? 'demo' : 'real');
  }, [selectedId]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const switchAccount = async (accountId) => {
    setBusy(true);
    try {
      await api.selectAccount(accountId);
      await refresh();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    if (!selected?.accountId || !isDemoAccount(selected)) return;
    setBusy(true);
    try {
      await api.resetDemoBalance(selected.accountId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const bal = selected?.balance;
  const currency = selected?.currency || 'USD';

  return (
    <div className="account-switcher" ref={ref}>
      <button type="button" className="account-switcher-trigger" onClick={() => setOpen(!open)}>
        <span className={`nav-account-badge ${mode.badgeClass}`}>{currency}</span>
        <span className="account-balance mono">
          {bal != null ? Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'} {currency}
        </span>
        <ChevronDown size={14} className={open ? 'chevron-up' : ''} />
      </button>

      {open && (
        <div className="account-switcher-menu card">
          <div className="account-tabs">
            <button type="button" className={tab === 'real' ? 'active' : ''} onClick={() => setTab('real')}>Real</button>
            <button type="button" className={tab === 'demo' ? 'active' : ''} onClick={() => setTab('demo')}>Demo</button>
          </div>

          <div className="account-list">
            {list.length === 0 && (
              <p className="text-muted account-empty">No {tab} accounts linked.</p>
            )}
            {list.map((a) => {
              const m = getAccountMode(a, a.accountId);
              return (
                <button
                  key={a.accountId}
                  type="button"
                  className={`account-row ${a.accountId === selectedId ? 'active' : ''}`}
                  disabled={busy}
                  onClick={() => switchAccount(a.accountId)}
                >
                  <div>
                    <strong>{m.shortLabel}</strong>
                    <span className="text-muted">{getAccountDisplayId(a, a.accountId)}</span>
                  </div>
                  <span className="mono">{a.balance != null ? Number(a.balance).toFixed(2) : '—'} {a.currency}</span>
                </button>
              );
            })}
          </div>

          {selected && isDemoAccount(selected) && (
            <button type="button" className="btn btn-secondary btn-sm account-reset" disabled={busy} onClick={resetDemo}>
              <RefreshCw size={14} /> Reset balance
            </button>
          )}

          <button type="button" className="account-logout" onClick={() => { setOpen(false); logout(); }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
