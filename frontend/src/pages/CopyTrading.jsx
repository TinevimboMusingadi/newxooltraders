import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function CopyTrading() {
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [subs, setSubs] = useState([]);
  const [providerCode, setProviderCode] = useState('');
  const [riskPct, setRiskPct] = useState(50);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const p = await api.getCopyProvider();
      setProvider(p.provider);
      const s = await api.getCopySubscriptions();
      setSubs(s.subscriptions || []);
    } catch {
      /* not provider yet */
    }
  };

  useEffect(() => { load(); }, []);

  const enableProvider = async () => {
    const data = await api.enableCopyProvider();
    setProvider(data.provider);
    setMessage('You are now a copy provider. Share your code with followers.');
  };

  const subscribe = async () => {
    await api.subscribeCopy(providerCode, riskPct);
    setMessage('Subscribed to provider.');
    load();
  };

  const unsubscribe = async (id) => {
    await api.unsubscribeCopy(id);
    load();
  };

  return (
    <div className="copy-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Copy Trading</h1>
        <p className="text-secondary">Secure OAuth master/follower — no token paste required.</p>
      </div>

      <div className="copy-grid">
        <div className="card">
          <h3 className="heading-md">Become a provider</h3>
          <p className="text-secondary">Let followers mirror your demo or live trades via our backend.</p>
          {provider ? (
            <div className="provider-code">
              <span>Your code</span>
              <strong>{provider.code}</strong>
              <span className="text-muted">Execution: FAST</span>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={enableProvider}>
              Enable copy provider
            </button>
          )}
        </div>

        <div className="card">
          <h3 className="heading-md">Follow a provider</h3>
          <label>
            Provider code
            <input value={providerCode} onChange={(e) => setProviderCode(e.target.value)} className="trade-input" />
          </label>
          <label>
            Risk scale %
            <input type="number" min={10} max={100} value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} />
          </label>
          <button type="button" className="btn btn-primary" onClick={subscribe} disabled={!providerCode}>
            Subscribe
          </button>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="card">
          <h3 className="heading-md">Your subscriptions</h3>
          <ul className="copy-subs">
            {subs.map((s) => (
              <li key={s.id}>
                {s.providerCode} · {s.riskPct}% risk
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => unsubscribe(s.id)}>Unsubscribe</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && <p className="profile-message">{message}</p>}
      <p className="text-muted">Logged in as {user?.selectedAccountId || '—'}</p>
    </div>
  );
}
