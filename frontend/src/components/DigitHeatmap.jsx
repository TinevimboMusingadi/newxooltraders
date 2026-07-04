export default function DigitHeatmap({ distribution, symbol }) {
  if (!distribution?.length) {
    return (
      <div className="card digit-heatmap">
        <h3 className="heading-md">Digit distribution</h3>
        <p className="text-muted">Run a scan to see 0–9 frequency bars.</p>
      </div>
    );
  }

  const maxPct = Math.max(...distribution.map((d) => d.pct), 1);

  return (
    <div className="card digit-heatmap">
      <h3 className="heading-md">{symbol || 'Selected'} — last digits</h3>
      <div className="digit-bars">
        {distribution.map(({ digit, pct, count }) => (
          <div key={digit} className="digit-bar-col">
            <div
              className="digit-bar-fill"
              style={{ height: `${(pct / maxPct) * 100}%` }}
              title={`${pct.toFixed(1)}% (${count})`}
            />
            <span className="digit-label">{digit}</span>
            <span className="digit-pct">{pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
