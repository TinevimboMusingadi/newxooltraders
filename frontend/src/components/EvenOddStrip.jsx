export default function EvenOddStrip({ history = [], max = 20 }) {
  const items = history.slice(-max);
  return (
    <div className="even-odd-strip">
      {items.map((v, i) => (
        <span key={i} className={`eo-pill ${v === 'E' ? 'even' : 'odd'}`}>{v}</span>
      ))}
    </div>
  );
}

export function DcirclesView({ history = [], evenPct = 50 }) {
  return (
    <div className="dcircles-view">
      <div className="dcircles-row">
        {history.slice(-20).map((v, i) => (
          <span key={i} className={`dcircle ${v === 'E' ? 'even' : 'odd'}`}>{v}</span>
        ))}
      </div>
      <div className="dcircles-bars">
        <div className="dcircle-bar even" style={{ width: `${evenPct}%` }}>
          <span>{evenPct.toFixed(1)}%</span>
        </div>
        <div className="dcircle-bar odd" style={{ width: `${100 - evenPct}%` }}>
          <span>{(100 - evenPct).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export function DigitCircles({ distribution }) {
  if (!distribution?.length) return null;
  return (
    <div className="digit-circles-row">
      {distribution.map(({ digit, pct }) => (
        <div key={digit} className="digit-circle" data-pct={pct.toFixed(0)}>
          <svg viewBox="0 0 36 36" className="digit-circle-svg">
            <circle cx="18" cy="18" r="16" className="digit-circle-bg" />
            <circle
              cx="18"
              cy="18"
              r="16"
              className="digit-circle-fg"
              strokeDasharray={`${pct} ${100 - pct}`}
            />
          </svg>
          <span className="digit-circle-label">{digit}</span>
          <span className="digit-circle-pct">{pct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}
