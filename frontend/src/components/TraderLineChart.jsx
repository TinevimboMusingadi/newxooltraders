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
import { isValidSymbol } from '../lib/symbolUtils';
import { useChartToolkit } from '../hooks/useChartToolkit';
import { formatChartCrosshairTime, formatChartTickMark } from '../lib/chartUtils';
import {
  HISTORY_PAGE,
  MAX_TICK_POINTS,
  shouldLoadOlderHistory,
  buildOlderHistoryRequest,
  prependHistory,
  capHistory,
} from '../lib/chartHistory';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';
const INITIAL_TICKS = 200;

function bandOffset(price, growthRate) {
  if (!price || !growthRate) return 0;
  return price * growthRate * 0.000127;
}

export default function TraderLineChart({
  symbol,
  onPriceUpdate,
  growthRate = 3,
  showAccumulatorBand = true,
  overlay,
  toolbarOverlay,
  indicators = {},
  drawMode = 'none',
  drawings = [],
  setDrawings,
}) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const chartHeightRef = useRef(400);
  const chartWidthRef = useRef(0);
  const seriesRef = useRef(null);
  const pointsRef = useRef([]);
  const priceLinesRef = useRef({});
  const priceRef = useRef(null);
  const bandRef = useRef(null);
  const labelTopRef = useRef(null);
  const labelBottomRef = useRef(null);
  const cursorDotRef = useRef(null);
  const reqIdRef = useRef(1);
  const loadingOlderRef = useRef(false);
  const noMoreHistoryRef = useRef(false);
  const followLiveRef = useRef(true);
  const growthRateRef = useRef(growthRate);
  const showBandRef = useRef(showAccumulatorBand);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const loadOlderTimerRef = useRef(null);

  growthRateRef.current = growthRate;
  showBandRef.current = showAccumulatorBand;
  onPriceUpdateRef.current = onPriceUpdate;

  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { refreshIndicators } = useChartToolkit({
    chartRef,
    mainSeriesRef: seriesRef,
    pointsRef,
    indicators,
    drawMode,
    drawings,
    setDrawings,
    dataVersion,
  });
  const refreshIndicatorsRef = useRef(refreshIndicators);
  refreshIndicatorsRef.current = refreshIndicators;

  const removePriceLine = useCallback((series, key) => {
    const lines = priceLinesRef.current;
    if (lines[key]) {
      try { series.removePriceLine(lines[key]); } catch { /* ignore */ }
      delete lines[key];
    }
  }, []);

  const syncOverlays = useCallback((price) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || price == null) return;

    const coord = series.priceToCoordinate(price);
    if (coord == null) return;
    const growth = growthRateRef.current;
    const showBand = showBandRef.current;

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

    const lines = priceLinesRef.current;
    const upsert = (key, p, options) => {
      if (lines[key]) lines[key].applyOptions({ price: p, ...options });
      else lines[key] = series.createPriceLine({ price: p, ...options });
    };

    if (showBand && growth) {
      const offset = bandOffset(price, growth);
      const upper = price + offset;
      const lower = price - offset;
      const yUpper = series.priceToCoordinate(upper);
      const yLower = series.priceToCoordinate(lower);

      if (bandRef.current && yUpper != null && yLower != null) {
        bandRef.current.style.display = 'block';
        bandRef.current.style.top = `${Math.min(yUpper, yLower)}px`;
        bandRef.current.style.height = `${Math.abs(yLower - yUpper)}px`;
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
      upsert('upper', upper, { color: '#38bdf8', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: false });
      upsert('lower', lower, { color: '#38bdf8', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: false });
    } else {
      removePriceLine(series, 'upper');
      removePriceLine(series, 'lower');
      if (bandRef.current) bandRef.current.style.display = 'none';
      if (labelTopRef.current) labelTopRef.current.style.display = 'none';
      if (labelBottomRef.current) labelBottomRef.current.style.display = 'none';
    }

    upsert('cursor', price, {
      color: '#2563eb',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
      axisLabelColor: '#111827',
      axisLabelTextColor: '#ffffff',
    });
  }, [removePriceLine]);

  const syncOverlaysRef = useRef(syncOverlays);
  syncOverlaysRef.current = syncOverlays;

  // Create chart once per theme — never recreate on overlay/callback identity changes
  useEffect(() => {
    if (!containerRef.current) return;

    const initialHeight = stageRef.current?.clientHeight || 400;
    chartHeightRef.current = initialHeight;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#94a3b8' : '#64748b',
      },
      localization: { timeFormatter: formatChartCrosshairTime },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
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
        tickMarkFormatter: formatChartTickMark,
      },
      width: containerRef.current.clientWidth,
      height: chartHeightRef.current,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: isDark ? '#cbd5e1' : '#334155',
      topColor: isDark ? 'rgba(157, 108, 255, 0.28)' : 'rgba(157, 108, 255, 0.18)',
      bottomColor: isDark ? 'rgba(157, 108, 255, 0.02)' : 'rgba(157, 108, 255, 0.01)',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      lastPriceAnimation: LastPriceAnimationMode.Disabled,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const applySize = () => {
      if (!containerRef.current || !stageRef.current || !chartRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const h = Math.max(80, Math.floor(rect.height));
      const w = Math.max(80, Math.floor(rect.width));
      if (!w || !h) return;
      if (h === chartHeightRef.current && w === chartWidthRef.current) return;
      chartHeightRef.current = h;
      chartWidthRef.current = w;
      chartRef.current.applyOptions({ width: w, height: h });
      if (priceRef.current != null) syncOverlaysRef.current(priceRef.current);
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(applySize);
    });
    if (stageRef.current) ro.observe(stageRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', applySize);
    requestAnimationFrame(applySize);

    return () => {
      window.removeEventListener('resize', applySize);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = {};
    };
  }, [isDark]);

  // Data stream — only reconnect when symbol changes
  useEffect(() => {
    if (!isValidSymbol(symbol)) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let ws;
    let ping;

    const start = () => {
      if (!seriesRef.current || !chartRef.current) {
        // Chart not ready yet — retry shortly
        const t = setTimeout(start, 50);
        return () => clearTimeout(t);
      }

      setLoading(true);
      priceRef.current = null;
      pointsRef.current = [];
      loadingOlderRef.current = false;
      noMoreHistoryRef.current = false;
      followLiveRef.current = true;
      seriesRef.current.setData([]);
      Object.keys(priceLinesRef.current).forEach((key) => {
        try { seriesRef.current.removePriceLine(priceLinesRef.current[key]); } catch { /* ignore */ }
        delete priceLinesRef.current[key];
      });

      ws = new WebSocket(PUBLIC_WS);
      reqIdRef.current = 1;

      const requestOlder = () => {
        if (loadingOlderRef.current || noMoreHistoryRef.current) return;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const earliest = pointsRef.current[0]?.time;
        const payload = buildOlderHistoryRequest({
          symbol,
          earliestTime: earliest,
          style: 'ticks',
          count: HISTORY_PAGE,
          reqId: reqIdRef.current++,
        });
        if (!payload) return;
        loadingOlderRef.current = true;
        setLoadingOlder(true);
        ws.send(JSON.stringify(payload));
      };

      const onVisibleRange = (range) => {
        if (!range || cancelled) return;
        const bars = pointsRef.current.length;
        followLiveRef.current = range.to >= bars - 5;
        if (shouldLoadOlderHistory(range, bars, 15)) {
          clearTimeout(loadOlderTimerRef.current);
          loadOlderTimerRef.current = setTimeout(requestOlder, 120);
        }
      };

      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRange);

      const pushPoint = (epoch, quote) => {
        if (cancelled || !seriesRef.current) return;
        const points = pointsRef.current;
        const point = { time: epoch, value: quote };
        const last = points[points.length - 1];
        if (last && last.time === epoch) {
          points[points.length - 1] = point;
          seriesRef.current.update(point);
        } else if (last && epoch < last.time) {
          return; // ignore out-of-order ticks
        } else {
          points.push(point);
          pointsRef.current = capHistory(points, MAX_TICK_POINTS);
          if (pointsRef.current.length === 1) seriesRef.current.setData(pointsRef.current);
          else seriesRef.current.update(point);
        }
        priceRef.current = quote;
        onPriceUpdateRef.current?.(quote);
        syncOverlaysRef.current(quote);
        if (followLiveRef.current) {
          chartRef.current?.timeScale().scrollToRealTime();
        }
        if (pointsRef.current.length % 20 === 0) {
          setDataVersion((v) => v + 1);
          refreshIndicatorsRef.current?.();
        }
      };

      ws.onopen = () => {
        if (cancelled) return;
        ws.send(JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: INITIAL_TICKS,
          end: 'latest',
          style: 'ticks',
          req_id: reqIdRef.current++,
        }));
        ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: reqIdRef.current++ }));
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        const data = JSON.parse(event.data);
        if (data.msg_type === 'history' && data.history?.prices?.length) {
          const times = data.history.times || [];
          const prices = data.history.prices;
          const seeded = times.map((t, i) => ({ time: Number(t), value: Number(prices[i]) }));

          const isOlderPage = loadingOlderRef.current
            && pointsRef.current.length
            && seeded[seeded.length - 1].time < pointsRef.current[0].time;

          if (isOlderPage) {
            const timeScale = chartRef.current?.timeScale();
            const prevRange = timeScale?.getVisibleLogicalRange();
            const beforeLen = pointsRef.current.length;
            const merged = capHistory(prependHistory(pointsRef.current, seeded), MAX_TICK_POINTS);
            const added = merged.length - beforeLen;
            pointsRef.current = merged;
            seriesRef.current.setData(merged);
            if (prevRange && added > 0) {
              timeScale.setVisibleLogicalRange({
                from: prevRange.from + added,
                to: prevRange.to + added,
              });
            }
            if (seeded.length < HISTORY_PAGE / 2) noMoreHistoryRef.current = true;
            loadingOlderRef.current = false;
            setLoadingOlder(false);
            setDataVersion((v) => v + 1);
            return;
          }

          pointsRef.current = seeded;
          seriesRef.current.setData(pointsRef.current);
          const last = Number(prices[prices.length - 1]);
          priceRef.current = last;
          onPriceUpdateRef.current?.(last);
          syncOverlaysRef.current(last);
          setLoading(false);
          loadingOlderRef.current = false;
          setLoadingOlder(false);
          setDataVersion((v) => v + 1);
        }

        if (data.msg_type === 'history' && (!data.history?.prices?.length) && loadingOlderRef.current) {
          noMoreHistoryRef.current = true;
          loadingOlderRef.current = false;
          setLoadingOlder(false);
        }

        if (data.msg_type === 'tick' && data.tick) {
          pushPoint(data.tick.epoch, Number(data.tick.quote));
          setLoading(false);
        }
      };

      ws.onerror = () => {
        if (!cancelled) setLoading(false);
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      };

      ping = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1, req_id: reqIdRef.current++ }));
        }
      }, 45000);

      return () => {
        clearTimeout(loadOlderTimerRef.current);
        clearInterval(ping);
        try {
          chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRange);
        } catch { /* ignore */ }
        if (ws?.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ forget_all: 'ticks' })); } catch { /* ignore */ }
        }
        ws?.close();
      };
    };

    const cleanupRetry = start();

    return () => {
      cancelled = true;
      if (typeof cleanupRetry === 'function') cleanupRetry();
      clearTimeout(loadOlderTimerRef.current);
      clearInterval(ping);
      if (ws?.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ forget_all: 'ticks' })); } catch { /* ignore */ }
      }
      ws?.close();
    };
  }, [symbol]);

  useEffect(() => {
    if (priceRef.current != null) syncOverlays(priceRef.current);
  }, [growthRate, showAccumulatorBand, syncOverlays]);

  const chartReady = isValidSymbol(symbol);

  return (
    <div className="trader-line-chart">
      <div ref={stageRef} className="trader-chart-stage">
        <div className="trader-chart-overlays">
          {overlay}
          {toolbarOverlay}
          {loadingOlder && <span className="chart-loading-older trader-loading-older">Loading older…</span>}
        </div>
        <div className="chart-container trader-chart-container">
          {!chartReady && (
            <div className="chart-empty-state">
              <p>Select a market to load live ticks</p>
            </div>
          )}
          {chartReady && loading && (
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
