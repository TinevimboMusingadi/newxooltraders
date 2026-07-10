import { Link } from 'react-router-dom';
import EvenOddStrip, { DigitCircles } from './EvenOddStrip';

const PROB_GUIDE = {
  over: [90, 85, 70, 60, 55, 40, 30, 25],
  under: [25, 30, 40, 55, 60, 70, 85, 90],
};

const STRENGTH_GUIDE = [
  { label: 'Strong Signal', evenOdd: 'Above 65%', riseFall: 'Above 65%' },
  { label: 'Moderate Signal', evenOdd: '55–65%', riseFall: '55–65%' },
  { label: 'Weak Signal', evenOdd: 'Below 55%', riseFall: 'Below 55%' },
];

function strengthLabel(pct) {
  if (pct >= 65) return 'Strong';
  if (pct >= 55) return 'Moderate';
  return 'Weak';
}

export default function BinaryAnalysisPanel({ symbol, stream, tradeType, onTradeTypeChange, bufferSize, onBufferSizeChange }) {
  const evenStrength = strengthLabel(Math.max(stream.evenPct, stream.oddPct));
  const riseStrength = strengthLabel(Math.max(stream.risePct, stream.fallPct));

  return (
    <div className="binary-analysis-panel">
      <div className="card binary-analysis-config">
        <h3 className="heading-md">Binary analysis</h3>
        <div className="binary-analysis-fields">
          <label>
            Trade type
            <select value={tradeType} onChange={(e) => onTradeTypeChange(e.target.value)}>
              <option value="even_odd">Even / Odd</option>
              <option value="rise_fall">Rise / Fall</option>
              <option value="over_under">Over / Under</option>
            </select>
          </label>
          <label>
            Ticks to analyze
            <input type="number" min={20} max={1000} value={bufferSize} onChange={(e) => onBufferSizeChange(Number(e.target.value))} />
          </label>
          <label>
            Current price
            <strong className="mono">{stream.quote != null ? stream.quote.toFixed(2) : '—'}</strong>
          </label>
        </div>

        <div className="binary-live-stats">
          <div><span>Even</span><strong>{stream.evenPct.toFixed(1)}%</strong></div>
          <div><span>Odd</span><strong>{stream.oddPct.toFixed(1)}%</strong></div>
          <div><span>Rise</span><strong>{stream.risePct.toFixed(1)}%</strong></div>
          <div><span>Fall</span><strong>{stream.fallPct.toFixed(1)}%</strong></div>
        </div>

        <EvenOddStrip history={stream.evenOddHistory} max={24} />
        <DigitCircles distribution={stream.distribution} />
      </div>

      <div className="card binary-prob-guide">
        <h3 className="heading-md">Trading probability guide</h3>
        <p className="text-muted">Educational reference — live % shown above from your tick buffer.</p>
        <div className="prob-guide-grid">
          <div>
            <h4>Over probabilities</h4>
            <div className="prob-guide-row">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => (
                <div key={n} className="prob-guide-cell">
                  <span>{n}</span>
                  <strong>{PROB_GUIDE.over[i]}%</strong>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4>Under probabilities</h4>
            <div className="prob-guide-row">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => (
                <div key={n} className="prob-guide-cell">
                  <span>{n}</span>
                  <strong>{PROB_GUIDE.under[i]}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h4>Signal strength guide</h4>
        <table className="signal-strength-table">
          <thead>
            <tr><th>Pattern</th><th>Even/Odd</th><th>Rise/Fall</th></tr>
          </thead>
          <tbody>
            {STRENGTH_GUIDE.map((row) => (
              <tr key={row.label}><td>{row.label}</td><td>{row.evenOdd}</td><td>{row.riseFall}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted analysis-tip">
          Live: Even/Odd is <strong>{evenStrength}</strong>, Rise/Fall is <strong>{riseStrength}</strong> on {symbol}.
        </p>
      </div>

      <div className="binary-trade-handoff">
        <Link to={`/bulk?symbol=${symbol}&type=DIGITEVEN`} className="btn btn-secondary btn-sm">Trade Even</Link>
        <Link to={`/bulk?symbol=${symbol}&type=DIGITODD`} className="btn btn-secondary btn-sm">Trade Odd</Link>
        <Link to={`/bulk?symbol=${symbol}&type=CALL`} className="btn btn-secondary btn-sm">Trade Rise</Link>
        <Link to={`/bulk?symbol=${symbol}&type=PUT`} className="btn btn-secondary btn-sm">Trade Fall</Link>
      </div>
    </div>
  );
}
