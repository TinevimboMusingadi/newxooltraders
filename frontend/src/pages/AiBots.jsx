import { Link } from 'react-router-dom';
import { useLiveSignals } from '../hooks/queries';
import { useMarket } from '../context/MarketContext';
import { CardSkeleton } from '../components/ui/Skeleton';
import WorkspacePageHeader from '../components/WorkspacePageHeader';

export default function AiBots() {
  const { data, isLoading } = useLiveSignals();
  const { selectSymbol } = useMarket();
  const signals = data?.signals || [];

  return (
    <div className="bots-gallery-page">
      <WorkspacePageHeader
        title="Signal Lab"
        subtitle="Live ranked signals from digit statistics — each card shows the real symbol, contract, and confidence."
      />

      {isLoading && <CardSkeleton lines={3} />}

      {!isLoading && !signals.length && (
        <p className="text-muted">
          {data?.error ? `Signals unavailable: ${data.error}` : 'No live signals above threshold right now.'}
        </p>
      )}

      <div className="bots-gallery-grid">
        {signals.map((sig) => (
          <div key={`${sig.symbol}-${sig.contractType}`} className="card bot-gallery-card">
            <h3>{sig.label || sig.contractType}</h3>
            <p className="text-muted">
              {sig.symbol} · {sig.contractType} · {sig.confidence?.toFixed(1) ?? '—'}% confidence
            </p>
            {sig.reason && <p className="text-muted signal-reason">{sig.reason}</p>}
            <div className="bot-gallery-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => selectSymbol(sig.symbol)}>
                Use {sig.symbol}
              </button>
              <Link
                to={`/bulk?symbol=${sig.symbol}&type=${sig.contractType}${sig.barrier != null ? `&barrier=${sig.barrier}` : ''}`}
                className="btn btn-ghost btn-sm"
              >
                Trade signal
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
