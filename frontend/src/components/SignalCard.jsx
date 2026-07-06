import { Link } from 'react-router-dom';

export default function SignalCard({ signal }) {
  const { symbol, confidence, contractType, label, barrier, stats } = signal;
  const bulkUrl = `/bulk?symbol=${symbol}&type=${contractType}${barrier != null ? `&barrier=${barrier}` : ''}`;
  const tradeUrl = `/trade?symbol=${symbol}`;

  const loadLabel = contractType.includes('EVEN') ? 'Load Even Signal'
    : contractType.includes('ODD') ? 'Load Odd Signal'
    : contractType.includes('OVER') ? 'Load Over Signal'
    : 'Load Under Signal';

  return (
    <div className="signal-card card">
      <div className="signal-card-header">
        <h3>{symbol}</h3>
        <span className="signal-confidence">{confidence.toFixed(1)}%</span>
      </div>
      <div className="signal-progress">
        <div className="signal-progress-bar" style={{ width: `${Math.min(confidence, 100)}%` }} />
      </div>
      <div className="signal-stats">
        <span>OVER {stats?.over4 || '—'}%</span>
        <span>EVEN {stats?.even || '—'}%</span>
        <span>ODD {stats?.odd || '—'}%</span>
      </div>
      <p className="text-muted signal-pick">Best: {label}</p>
      <div className="signal-actions">
        <Link to={bulkUrl} className="btn btn-primary btn-sm">{loadLabel}</Link>
        <Link to={tradeUrl} className="btn btn-ghost btn-sm">Manual</Link>
      </div>
      <details className="signal-details">
        <summary>Show details</summary>
        <pre className="signal-meta">{JSON.stringify({ contractType, barrier, live: signal.live }, null, 2)}</pre>
      </details>
    </div>
  );
}
