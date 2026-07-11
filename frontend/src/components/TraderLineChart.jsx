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
  const seriesRef = useRef(null);
  const wsRef = useRef(null);
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

  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
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
    if (!stageRef.current) return;

    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 100) {
        chartHeightRef.current = Math.floor(h);
        if (chartRef.current) {
          chartRef.current.applyOptions({ height: chartHeightRef.current });
          if (priceRef.current != null) syncOverlays(priceRef.current);
        }
      }
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [syncOverlays]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialHeight = stageRef.current?.clientHeight || 400;
    chartHeightRef.current = initialHeight;

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
      height: chartHeightRef.current,
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
      if (containerRef.current && stageRef.current) {
        const h = stageRef.current.clientHeight || chartHeightRef.current;
        chartHeightRef.current = h;
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: h,
        });
        if (priceRef.current != null) syncOverlays(priceRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      priceLinesRef.current = {};
    };
  }, [isDark, syncOverlays]);

  useEffect(() => {
    if (!isValidSymbol(symbol) || !seriesRef.current || !chartRef.current) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setCurrentPrice(null);
    priceRef.current = null;
    pointsRef.current = [];
    loadingOlderRef.current = false;
    noMoreHistoryRef.current = false;
    followLiveRef.current = true;
    seriesRef.current.setData([]);
    clearAllPriceLines(seriesRef.current);

    const ws = new WebSocket(PUBLIC_WS);
    wsRef.current = ws;
    reqIdRef.current = 1;

    const requestOlder = () => {
      if (loadingOlderRef.current || noMoreHistoryRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) return;
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
      if (!range) return;
      const bars = pointsRef.current.length;
      followLiveRef.current = range.to >= bars - 5;
      if (shouldLoadOlderHistory(range, bars, 15)) {
        requestOlder();
      }
      if (priceRef.current != null) syncOverlays(priceRef.current);
    };

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRange);

    const pushPoint = (epoch, quote) => {
      const points = pointsRef.current;
      const point = { time: epoch, value: quote };
      const last = points[points.length - 1];
      if (last && last.time === epoch) {
        points[points.length - 1] = point;
        seriesRef.current.update(point);
      } else {
        points.push(point);
        pointsRef.current = capHistory(points, MAX_TICK_POINTS);
        if (pointsRef.current.length === 1) {
          seriesRef.current.setData(pointsRef.current);
        } else {
          seriesRef.current.update(point);
        }
      }
      priceRef.current = quote;
      setCurrentPrice(quote);
      onPriceUpdate?.(quote);
      syncOverlays(quote);
      if (followLiveRef.current) {
        chartRef.current?.timeScale().scrollToRealTime();
      }
      if (pointsRef.current.length % 5 === 0) {
        setDataVersion((v) => v + 1);
        refreshIndicators();
      }
    };

    ws.onopen = () => {
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
      const data = JSON.parse(event.data);
      if (data.msg_type === 'history' && data.history?.prices?.length) {
        const times = data.history.times || [];
        const prices = data.history.prices;
        const seeded = times.map((t, i) => ({ time: t, value: Number(prices[i]) }));

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
        setCurrentPrice(last);
        onPriceUpdate?.(last);
        syncOverlays(last);
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
      setLoading(false);
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ ping: 1, req_id: reqIdRef.current++ }));
      }
    }, 45000);

    return () => {
      clearInterval(ping);
      try {
        chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRange);
      } catch {
        /* ignore */
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
      }
      ws.close();
    };
  }, [symbol, onPriceUpdate, syncOverlays, clearAllPriceLines, refreshIndicators]);

  useEffect(() => {
    if (currentPrice != null) syncOverlays(currentPrice);
  }, [growthRate, showAccumulatorBand, currentPrice, syncOverlays]);

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
