import { Link } from 'react-router-dom';
import { DigitCircles } from './EvenOddStrip';
import { formatSymbolLabel } from '../lib/symbolUtils';

function StatBar({ label, leftPct, rightPct, leftLabel, rightLabel, leftClass = 'even', rightClass = 'odd' }) {
  return (
    <div className="analysis-stat-row">
      <span className="analysis-stat-label">{label}</span>
      <div className="analysis-stat-bars">
        <div className={`analysis-stat-bar ${leftClass}`} style={{ width: `${leftPct}%` }}>
          <span>{leftLabel} {leftPct.toFixed(1)}%</span>
        </div>
        <div className={`analysis-stat-bar ${rightClass}`} style={{ width: `${rightPct}%` }}>
          <span>{rightLabel} {rightPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisMarketCard({ symbol, displayName, stream, bufferSize }) {
  const label = formatSymbolLabel(symbol, displayName);
  const ready = stream?.tickCount >= Math.min(20, bufferSize);

  return (
    <div className="card analysis-market-card">
      <div className="analysis-market-header">
        <div>
          <h3 className="heading-md">{label}</h3>
          <span className="text-muted mono">{symbol}</span>
        </div>
        <div className="analysis-market-price">
          <span className="text-muted">Price</span>
          <strong className="mono">{stream?.quote != null ? stream.quote.toFixed(2) : '—'}</strong>
        </div>
      </div>

      {!ready && <p className="text-muted">Buffering ticks… ({stream?.tickCount || 0}/{bufferSize})</p>}

      <DigitCircles distribution={stream?.distribution} />

      <div className="analysis-digit-strip">
        {(stream?.digitHistory || []).slice(-16).map((d, i) => (
          <span key={i} className="analysis-digit-pill">{d}</span>
        ))}
      </div>

      <StatBar label="Even / Odd" leftPct={stream?.evenPct ?? 0} rightPct={stream?.oddPct ?? 0} leftLabel="Even" rightLabel="Odd" />
      <StatBar label="Rise / Fall" leftPct={stream?.risePct ?? 0} rightPct={stream?.fallPct ?? 0} leftLabel="Rise" rightLabel="Fall" leftClass="rise" rightClass="fall" />
      <StatBar label="Over 4 / Under 5" leftPct={stream?.over4Pct ?? 0} rightPct={stream?.under5Pct ?? 0} leftLabel="Over" rightLabel="Under" leftClass="over" rightClass="under" />

      <div className="analysis-market-actions">
        <Link to={`/trade?symbol=${symbol}`} className="btn btn-ghost btn-sm">Chart</Link>
        <Link to={`/bulk?symbol=${symbol}&type=DIGITEVEN`} className="btn btn-secondary btn-sm">Trade Even</Link>
        <Link to={`/bulk?symbol=${symbol}&type=DIGITODD`} className="btn btn-secondary btn-sm">Trade Odd</Link>
      </div>
    </div>
  );
}
