import { PATTERN_MODES } from '../lib/digitsEngine';

export default function ScanConfigPanel({
  depth,
  pattern,
  minConfidence,
  onDepthChange,
  onPatternChange,
  onMinConfidenceChange,
  onScan,
  scanning,
  marketCount,
}) {
  return (
    <div className="card scan-config">
      <h3 className="heading-md">Scan configuration</h3>
      <div className="scan-config-grid">
        <label>
          Scan depth
          <select value={depth} onChange={(e) => onDepthChange(Number(e.target.value))}>
            <option value={500}>500 ticks</option>
            <option value={1000}>1,000 ticks</option>
            <option value={3000}>3,000 ticks</option>
          </select>
        </label>
        <label>
          Pattern mode
          <select value={pattern} onChange={(e) => onPatternChange(e.target.value)}>
            {Object.entries(PATTERN_MODES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <label>
          Min confidence %
          <input
            type="number"
            min={50}
            max={95}
            value={minConfidence}
            onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="text-muted">Scanning {marketCount} markets (favorites + defaults)</p>
      <button type="button" className="btn btn-primary" onClick={onScan} disabled={scanning}>
        {scanning ? 'Scanning…' : 'Run scan'}
      </button>
    </div>
  );
}
