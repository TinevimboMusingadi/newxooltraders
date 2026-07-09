import {
  Activity,
  Eraser,
  Minus,
  Spline,
  TrendingUp,
} from 'lucide-react';

const INDICATOR_TOGGLES = [
  { id: 'sma', label: 'SMA', title: 'Simple Moving Average (20)' },
  { id: 'ema', label: 'EMA', title: 'Exponential Moving Average (20)' },
  { id: 'bb', label: 'BB', title: 'Bollinger Bands' },
  { id: 'rsi', label: 'RSI', title: 'Relative Strength Index' },
];

const DRAW_TOOLS = [
  { id: 'none', label: 'Off', icon: Activity, title: 'Cursor / pan' },
  { id: 'hline', label: 'H', icon: Minus, title: 'Horizontal line — click chart' },
  { id: 'trend', label: 'TL', icon: TrendingUp, title: 'Trendline — click 2 points' },
  { id: 'fib', label: 'Fib', icon: Spline, title: 'Fibonacci — click high then low' },
];

export default function ChartToolsToolbar({
  indicators,
  onToggleIndicator,
  drawMode,
  onDrawMode,
  onClearDrawings,
  drawingCount = 0,
}) {
  return (
    <div className="chart-tools-toolbar" role="toolbar" aria-label="Chart tools">
      <div className="chart-tools-group" title="Indicators">
        {INDICATOR_TOGGLES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`chart-tool-btn ${indicators[t.id] ? 'active' : ''}`}
            title={t.title}
            onClick={() => onToggleIndicator(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <span className="chart-tools-sep" aria-hidden />
      <div className="chart-tools-group" title="Draw">
        {DRAW_TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`chart-tool-btn ${drawMode === t.id ? 'active' : ''}`}
              title={t.title}
              onClick={() => onDrawMode(t.id)}
            >
              <Icon size={11} />
              <span>{t.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="chart-tool-btn danger"
          title="Clear drawings"
          disabled={!drawingCount}
          onClick={onClearDrawings}
        >
          <Eraser size={11} />
        </button>
      </div>
    </div>
  );
}
