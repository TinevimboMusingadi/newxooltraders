import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Users, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  useCopyProvider,
  useCopySubscriptions,
  useCopyJobs,
  useEnableCopyProvider,
  useSubscribeCopy,
  useUnsubscribeCopy,
} from '../hooks/queries';

export default function CopyTrading() {
  const { user } = useAuth();
  const [providerCode, setProviderCode] = useState('');
  const [riskPct, setRiskPct] = useState(50);

  const providerQuery = useCopyProvider();
  const subsQuery = useCopySubscriptions();
  const jobsQuery = useCopyJobs();

  const enableMutation = useEnableCopyProvider();
  const subscribeMutation = useSubscribeCopy();
  const unsubMutation = useUnsubscribeCopy();

  const provider = providerQuery.data?.provider;
  const subs = subsQuery.data?.subscriptions || [];
  const jobs = jobsQuery.data?.jobs || [];

  const enableProvider = () => {
    enableMutation.mutate(undefined, {
      onSuccess: () => toast.success('You are now a copy provider!'),
      onError: (e) => toast.error('Failed', { description: e.message }),
    });
  };

  const subscribe = () => {
    subscribeMutation.mutate(
      { providerCode, riskPct },
      {
        onSuccess: () => {
          toast.success(`Subscribed to ${providerCode}`);
          setProviderCode('');
        },
        onError: (e) => toast.error('Subscribe failed', { description: e.message }),
      },
    );
  };

  const unsubscribe = (id) => {
    unsubMutation.mutate(id, {
      onSuccess: () => toast.info('Unsubscribed'),
    });
  };

  return (
    <div className="copy-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Copy Trading</h1>
        <p className="text-secondary">Secure master/follower copy — no API tokens required.</p>
      </div>

      <div className="copy-grid">
        <div className="card">
          <div className="card-header-icon">
            <Shield size={18} />
            <h3 className="heading-md">Become a Provider</h3>
          </div>
          <p className="text-secondary">Let followers mirror your trades via secure server-side execution.</p>
          {provider ? (
            <div className="provider-code">
              <span className="text-muted">Your provider code</span>
              <strong className="provider-code-value">{provider.code}</strong>
              <button
                type="button"
                className="btn-ghost btn-xs"
                onClick={() => { navigator.clipboard.writeText(provider.code); toast.info('Copied!'); }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={enableProvider} disabled={enableMutation.isPending}>
              {enableMutation.isPending ? 'Enabling...' : 'Enable Copy Provider'}
            </button>
          )}
        </div>

        <div className="card">
          <div className="card-header-icon">
            <Users size={18} />
            <h3 className="heading-md">Follow a Provider</h3>
          </div>
          <div className="copy-form">
            <label>Provider Code
              <input value={providerCode} onChange={(e) => setProviderCode(e.target.value.toUpperCase())} className="trade-input" placeholder="e.g. A1B2C3D4" />
            </label>
            <label>Risk Scale (%)
              <input type="number" min={10} max={200} value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} className="trade-input" />
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>100% = same stake as master, 50% = half</span>
            </label>
            <button type="button" className="btn btn-primary" onClick={subscribe} disabled={!providerCode || subscribeMutation.isPending}>
              {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="card">
          <h3 className="heading-md">Active Subscriptions</h3>
          <ul className="copy-subs">
            {subs.map((s) => (
              <li key={s.id} className="copy-sub-item">
                <div>
                  <strong>{s.providerCode || s.provider_code}</strong>
                  <span className="text-muted"> · {s.riskPct || s.risk_pct}% risk</span>
                </div>
                <button type="button" className="btn btn-danger btn-xs" onClick={() => unsubscribe(s.id)}>
                  Unsubscribe
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="card">
          <h3 className="heading-md">Recent Copy Jobs</h3>
          <div className="copy-jobs-list">
            {jobs.slice(0, 20).map((j) => (
              <div key={j.id} className="copy-job-item">
                <span className="mono">{j.trade?.symbol}</span>
                <span className="text-muted">{j.trade?.contractType || j.trade?.contract_type}</span>
                <span className="mono">${typeof j.trade?.amount === 'number' ? j.trade.amount.toFixed(2) : j.trade?.amount}</span>
                <span className={`copy-job-status copy-job-${j.status}`}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-muted" style={{ marginTop: '16px' }}>Account: {user?.selectedAccountId || '—'}</p>
    </div>
  );
}
