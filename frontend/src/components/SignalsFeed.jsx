import { Link } from 'react-router-dom';

export default function SignalsFeed({ signals, results, onSelect }) {
  return (
    <div className="card signals-feed">
      <h3 className="heading-md">Live signals</h3>
      {signals.length === 0 && (
        <p className="text-muted">No signals above threshold. Adjust confidence or run scan.</p>
      )}
      <ul className="signals-list">
        {signals.map((s) => (
          <li key={s.symbol} className="signal-item">
            <button type="button" className="signal-main" onClick={() => onSelect(s)}>
              <strong>{s.symbol}</strong>
              <span>{s.analysis.direction} @ {s.analysis.barrier}</span>
              <span className="signal-confidence">{s.analysis.confidence.toFixed(1)}%</span>
            </button>
            <Link
              to={`/bulk?symbol=${s.symbol}&type=${s.analysis.direction}&barrier=${s.analysis.barrier}`}
              className="btn btn-secondary btn-sm"
            >
              Send to Bulk
            </Link>
          </li>
        ))}
      </ul>
      {results.some((r) => r.error) && (
        <p className="text-muted scan-errors">
          Some markets failed — try fewer symbols or lower depth.
        </p>
      )}
    </div>
  );
}
