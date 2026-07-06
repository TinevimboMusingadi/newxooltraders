import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CrosshairMode,
  AreaSeries,
  LineStyle,
  LastPriceAnimationMode,
} from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';
import { ChartSkeleton } from './ui/Skeleton';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';
const MAX_POINTS = 120;

function formatPrice(symbol, price) {
  if (symbol?.startsWith('frx')) return price.toFixed(4);
  if (symbol?.startsWith('cry')) return price.toFixed(2);
  return price.toFixed(2);
}

function bandOffset(price, growthRate) {
  if (!price || !growthRate) return 0;
  return price * growthRate * 0.000127;
}

export default function TraderLineChart({
  symbol,
  onPriceUpdate,
  growthRate = 3,
  showAccumulatorBand = true,
  height = 460,
  overlay,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null);
  const pointsRef = useRef([]);
  const priceLinesRef = useRef({});
  const priceRef = useRef(null);
  const bandRef = useRef(null);
  const labelTopRef = useRef(null);
  const labelBottomRef = useRef(null);
  const cursorDotRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const updatePriceLine = useCallback((series, key, price, options) => {
    const lines = priceLinesRef.current;
    if (lines[key]) {
      lines[key].applyOptions({ price, ...options });
    } else {
      lines[key] = series.createPriceLine({ price, ...options });
    }
  }, []);

  const removePriceLine = useCallback((series, key) => {
    const lines = priceLinesRef.current;
    if (lines[key]) {
      try { series.removePriceLine(lines[key]); } catch { /* ignore */ }
      delete lines[key];
    }
  }, []);

  const clearAllPriceLines = useCallback((series) => {
    Object.keys(priceLinesRef.current).forEach((key) => removePriceLine(series, key));
  }, [removePriceLine]);

  const syncOverlays = useCallback((price) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || price == null) return;

    const coord = series.priceToCoordinate(price);
    if (coord == null) return;

    if (cursorDotRef.current) {
      const timeScale = chart.timeScale();
      const points = pointsRef.current;
      const last = points[points.length - 1];
      const x = last ? timeScale.timeToCoordinate(last.time) : null;
      if (x != null) {
        cursorDotRef.current.style.display = 'block';
        cursorDotRef.current.style.transform = `translate(${x - 5}px, ${coord - 5}px)`;
      }
    }

    if (showAccumulatorBand && growthRate) {
      const offset = bandOffset(price, growthRate);
      const upper = price + offset;
      const lower = price - offset;
      const yUpper = series.priceToCoordinate(upper);
      const yLower = series.priceToCoordinate(lower);

      if (bandRef.current && yUpper != null && yLower != null) {
        const top = Math.min(yUpper, yLower);
        const h = Math.abs(yLower - yUpper);
        bandRef.current.style.display = 'block';
        bandRef.current.style.top = `${top}px`;
        bandRef.current.style.height = `${h}px`;
      }

      if (labelTopRef.current) {
        labelTopRef.current.style.display = 'block';
        labelTopRef.current.textContent = `+${offset.toFixed(3)}`;
        if (yUpper != null) labelTopRef.current.style.top = `${yUpper - 10}px`;
      }
      if (labelBottomRef.current) {
        labelBottomRef.current.style.display = 'block';
        labelBottomRef.current.textContent = `-${offset.toFixed(3)}`;
        if (yLower != null) labelBottomRef.current.style.top = `${yLower - 10}px`;
      }

      updatePriceLine(series, 'upper', upper, {
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: false,
      });
      updatePriceLine(series, 'lower', lower, {
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: false,
      });
    } else {
      removePriceLine(series, 'upper');
      removePriceLine(series, 'lower');
      if (bandRef.current) bandRef.current.style.display = 'none';
      if (labelTopRef.current) labelTopRef.current.style.display = 'none';
      if (labelBottomRef.current) labelBottomRef.current.style.display = 'none';
    }

    updatePriceLine(series, 'cursor', price, {
      color: '#2563eb',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
      axisLabelColor: '#111827',
      axisLabelTextColor: '#ffffff',
    });
  }, [growthRate, showAccumulatorBand, updatePriceLine, removePriceLine]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#94a3b8' : '#64748b',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
      },
      crosshair: { mode: CrosshairMode.Hidden },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        timeVisible: true,
        secondsVisible: true,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 4,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: isDark ? '#cbd5e1' : '#334155',
      topColor: isDark ? 'rgba(157, 108, 255, 0.28)' : 'rgba(157, 108, 255, 0.18)',
      bottomColor: isDark ? 'rgba(157, 108, 255, 0.02)' : 'rgba(157, 108, 255, 0.01)',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      lastPriceAnimation: LastPriceAnimationMode.Continuous,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
        if (priceRef.current != null) syncOverlays(priceRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (priceRef.current != null) syncOverlays(priceRef.current);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      priceLinesRef.current = {};
    };
  }, [isDark, height]);

  useEffect(() => {
    if (!symbol || !seriesRef.current) return;

    setLoading(true);
    setCurrentPrice(null);
    setPrevPrice(null);
    priceRef.current = null;
    pointsRef.current = [];
    seriesRef.current.setData([]);
    clearAllPriceLines(seriesRef.current);

    const ws = new WebSocket(PUBLIC_WS);
    wsRef.current = ws;
    let reqId = 1;

    const pushPoint = (epoch, quote) => {
      const points = pointsRef.current;
      const point = { time: epoch, value: quote };
      const last = points[points.length - 1];
      if (last && last.time === epoch) {
        points[points.length - 1] = point;
        seriesRef.current.update(point);
      } else {
        points.push(point);
        if (points.length > MAX_POINTS) points.shift();
        if (points.length === 1) {
          seriesRef.current.setData(points);
        } else {
          seriesRef.current.update(point);
        }
      }
      priceRef.current = quote;
      setCurrentPrice((prev) => {
        if (prev != null) setPrevPrice(prev);
        return quote;
      });
      onPriceUpdate?.(quote);
      syncOverlays(quote);
      chartRef.current?.timeScale().scrollToRealTime();
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: MAX_POINTS,
        end: 'latest',
        style: 'ticks',
        req_id: reqId++,
      }));
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: reqId++ }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === 'history' && data.history?.prices?.length) {
        const times = data.history.times || [];
        const prices = data.history.prices;
        const seeded = times.map((t, i) => ({ time: t, value: Number(prices[i]) }));
        pointsRef.current = seeded.slice(-MAX_POINTS);
        seriesRef.current.setData(pointsRef.current);
        const last = Number(prices[prices.length - 1]);
        priceRef.current = last;
        setCurrentPrice(last);
        onPriceUpdate?.(last);
        syncOverlays(last);
        setLoading(false);
      }
      if (data.msg_type === 'tick' && data.tick) {
        pushPoint(data.tick.epoch, Number(data.tick.quote));
        setLoading(false);
      }
    };

    ws.onerror = () => setLoading(false);

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ ping: 1, req_id: reqId++ }));
      }
    }, 45000);

    return () => {
      clearInterval(ping);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
      }
      ws.close();
    };
  }, [symbol, onPriceUpdate, syncOverlays, clearAllPriceLines]);

  useEffect(() => {
    if (currentPrice != null) syncOverlays(currentPrice);
  }, [growthRate, showAccumulatorBand, currentPrice, syncOverlays]);

  const change = currentPrice != null && prevPrice != null ? currentPrice - prevPrice : null;
  const changePct = change != null && prevPrice ? (change / prevPrice) * 100 : null;
  const up = change == null ? true : change >= 0;

  return (
    <div className="trader-line-chart">
      <div className="trader-chart-stage">
        {overlay}
        {currentPrice != null && (
          <div className="trader-chart-price-chip card">
            <span className="trader-chart-price mono">{formatPrice(symbol, currentPrice)}</span>
            {change != null && (
              <span className={`trader-chart-change ${up ? 'up' : 'down'}`}>
                {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}
                {changePct != null && ` (${Math.abs(changePct).toFixed(2)}%)`}
              </span>
            )}
          </div>
        )}
        <div className="chart-container trader-chart-container">
          {loading && (
            <div className="chart-loading">
              <ChartSkeleton />
            </div>
          )}
          <div ref={containerRef} className="live-chart trader-live-chart" />
          <div ref={bandRef} className="trader-acc-band" aria-hidden />
          <span ref={labelTopRef} className="trader-band-label top" aria-hidden />
          <span ref={labelBottomRef} className="trader-band-label bottom" aria-hidden />
          <div ref={cursorDotRef} className="trader-price-cursor" aria-hidden />
        </div>
      </div>
    </div>
  );
}
