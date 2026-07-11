import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import TraderLineChart from './TraderLineChart';
import LiveChart from './LiveChart';
import MarketPicker from './MarketPicker';
import ChartToolsToolbar from './ChartToolsToolbar';
import { formatSymbolLabel, sanitizeSymbol } from '../lib/symbolUtils';
import { marketFlag } from '../lib/currencyFlags';
import { useActiveSymbols } from '../hooks/useActiveSymbols';

const DEFAULT_INDICATORS = { sma: true, ema: false, bb: false, rsi: false };

export default function TradeChartPane({
  pane,
  isPrimary,
  connected,
  showConnecting,
  growthRate,
  showAccumulatorBand,
  onSymbolChange,
  onRemove,
  onActivate,
  onPriceUpdate,
}) {
  const { symbols } = useActiveSymbols();
  const symbol = sanitizeSymbol(pane.symbol);
  const meta = symbols.find((s) => s.symbol === symbol);
  const [chartType, setChartType] = useState(pane.chartType || 'line');
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS);
  const [drawMode, setDrawMode] = useState('none');
  const [drawings, setDrawings] = useState([]);
  const priceElRef = useRef(null);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  onPriceUpdateRef.current = onPriceUpdate;

  const toggleIndicator = useCallback((id) => {
    setIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handlePrice = useCallback((q) => {
    const el = priceElRef.current;
    if (el) {
      const decimals = symbol?.startsWith('frx') ? 4 : 2;
      el.textContent = q != null ? Number(q).toFixed(decimals) : '—';
    }
    if (isPrimary) onPriceUpdateRef.current?.(q);
  }, [isPrimary, symbol]);

  useEffect(() => {
    if (priceElRef.current) priceElRef.current.textContent = '—';
  }, [symbol]);

  const symbolLabel = formatSymbolLabel(symbol, meta?.displayName);
  const flag = marketFlag(meta?.category, symbol);

  const assetPicker = (
    <MarketPicker
      symbol={symbol}
      onSelect={(s) => onSymbolChange(pane.id, s)}
      trigger={(
        <div className="trader-asset-picker">
          <div className="trader-asset-picker-row">
            <span className="market-flag" aria-hidden>{flag}</span>
            <strong>{symbolLabel}</strong>
            <ChevronDown size={12} className="trader-asset-chevron" />
          </div>
          <span className="mono trader-asset-price" ref={priceElRef}>—</span>
        </div>
      )}
    />
  );

  const chartToolbar = (
    <div className="trader-chart-toolbar">
      <div className="chart-type-toggle">
        <button type="button" className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')}>Line</button>
        <button type="button" className={chartType === 'candle' ? 'active' : ''} onClick={() => setChartType('candle')}>Candles</button>
      </div>
      {isPrimary && (
        <ChartToolsToolbar
          indicators={indicators}
          onToggleIndicator={toggleIndicator}
          drawMode={drawMode}
          onDrawMode={setDrawMode}
          onClearDrawings={() => setDrawings([])}
          drawingCount={drawings.length}
        />
      )}
      {!isPrimary && onRemove && (
        <button type="button" className="btn-ghost btn-xs chart-pane-close" title="Close chart" onClick={() => onRemove(pane.id)}>
          <X size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`trade-chart-pane ${isPrimary ? 'primary' : ''}`}
      onClick={onActivate}
      onKeyDown={() => {}}
      role="presentation"
    >
      {chartType === 'line' ? (
        <TraderLineChart
          symbol={symbol}
          onPriceUpdate={handlePrice}
          growthRate={growthRate}
          showAccumulatorBand={showAccumulatorBand}
          overlay={assetPicker}
          toolbarOverlay={chartToolbar}
          indicators={indicators}
          drawMode={drawMode}
          drawings={drawings}
          setDrawings={setDrawings}
        />
      ) : (
        <div className="trade-candle-wrap">
          <div className="trader-chart-overlays trade-candle-overlays">
            {assetPicker}
            {chartToolbar}
          </div>
          <LiveChart
            symbol={symbol}
            onPriceUpdate={handlePrice}
            fill
            hideToolbar={false}
            indicators={indicators}
            drawMode={drawMode}
            drawings={drawings}
            setDrawings={setDrawings}
          />
        </div>
      )}
      {(connected || showConnecting) && isPrimary && (
        <span className="sr-only">{connected ? 'Live' : 'Connecting'}</span>
      )}
    </div>
  );
}
