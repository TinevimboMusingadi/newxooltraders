import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, CandlestickSeries, LineStyle } from 'lightweight-charts';
import { GRANULARITIES, DEFAULT_GRANULARITY } from '../lib/chartUtils';
import { useTheme } from '../context/ThemeContext';
import { ChartSkeleton } from './ui/Skeleton';
import { formatSymbolLabel, isValidSymbol } from '../lib/symbolUtils';
import { useChartToolkit } from '../hooks/useChartToolkit';
import {
  HISTORY_PAGE,
  MAX_CANDLES,
  shouldLoadOlderHistory,
  buildOlderHistoryRequest,
  prependHistory,
  capHistory,
} from '../lib/chartHistory';

export default function LiveChart({
  symbol,
  onPriceUpdate,
  height = 420,
  fill = false,
  hideToolbar = false,
  indicators = {},
  drawMode = 'none',
  drawings = [],
  setDrawings,
}) {
  const containerRef = useRef(null);
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const lastCandleRef = useRef(null);
  const candlesRef = useRef([]);
  const wsRef = useRef(null);
  const reqIdRef = useRef(1);
  const loadingOlderRef = useRef(false);
  const noMoreHistoryRef = useRef(false);
  const followLiveRef = useRef(true);
  const [granularity, setGranularity] = useState(DEFAULT_GRANULARITY);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [ohlc, setOhlc] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [chartHeight, setChartHeight] = useState(height);
  const [dataVersion, setDataVersion] = useState(0);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const { refreshIndicators } = useChartToolkit({
    chartRef,
    mainSeriesRef: seriesRef,
    pointsRef: candlesRef,
    indicators,
    drawMode,
    drawings,
    setDrawings,
    dataVersion,
  });

  useEffect(() => {
    if (!fill || !wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 100) {
        setChartHeight(Math.floor(h));
        chartRef.current?.applyOptions({ height: Math.floor(h) });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fill]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#a0a0ab' : '#555',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' },
      timeScale: {
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
        timeVisible: true,
        fixLeftEdge: false,
        rightOffset: 8,
      },
      width: containerRef.current.clientWidth,
      height: fill ? (wrapRef.current?.clientHeight || height) : chartHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setOhlc(null);
        return;
      }
      const candle = param.seriesData.get(series);
      if (candle) {
        setOhlc({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });
      }
    });

    const handleResize = () => {
      if (containerRef.current) {
        const h = fill && wrapRef.current ? wrapRef.current.clientHeight : chartHeight;
        chart.applyOptions({ width: containerRef.current.clientWidth, height: h || chartHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      priceLineRef.current = null;
    };
  }, [isDark, chartHeight, fill]);

  useEffect(() => {
    if (!isValidSymbol(symbol) || !seriesRef.current || !chartRef.current) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOhlc(null);
    setCurrentPrice(null);
    seriesRef.current.setData([]);
    lastCandleRef.current = null;
    candlesRef.current = [];
    loadingOlderRef.current = false;
    noMoreHistoryRef.current = false;
    followLiveRef.current = true;
    if (priceLineRef.current) {
      try {
        seriesRef.current.removePriceLine(priceLineRef.current);
      } catch {
        /* ignore */
      }
      priceLineRef.current = null;
    }

    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    wsRef.current = ws;
    reqIdRef.current = 1;
    const gran = granularity.value;

    const updatePriceLine = (price) => {
      if (!seriesRef.current) return;
      if (priceLineRef.current) {
        priceLineRef.current.applyOptions({ price });
      } else {
        priceLineRef.current = seriesRef.current.createPriceLine({
          price,
          color: '#9d6cff',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Last',
        });
      }
    };

    const requestOlder = () => {
      if (loadingOlderRef.current || noMoreHistoryRef.current) return;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const earliest = candlesRef.current[0]?.time;
      const payload = buildOlderHistoryRequest({
        symbol,
        earliestTime: earliest,
        style: 'candles',
        granularity: gran,
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
      const bars = candlesRef.current.length;
      // User left the live edge if the right side isn't near the last bar
      followLiveRef.current = range.to >= bars - 3;
      if (shouldLoadOlderHistory(range, bars)) {
        requestOlder();
      }
    };

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRange);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: HISTORY_PAGE,
          end: 'latest',
          granularity: gran,
          style: 'candles',
          req_id: reqIdRef.current++,
        }),
      );
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: reqIdRef.current++ }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === 'candles' && data.candles?.length) {
        const mapped = data.candles.map((c) => ({
          time: c.epoch,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));

        const isOlderPage = loadingOlderRef.current
          && candlesRef.current.length
          && mapped[mapped.length - 1].time < candlesRef.current[0].time;

        if (isOlderPage) {
          const timeScale = chartRef.current?.timeScale();
          const prevRange = timeScale?.getVisibleLogicalRange();
          const beforeLen = candlesRef.current.length;
          const merged = capHistory(prependHistory(candlesRef.current, mapped), MAX_CANDLES);
          const added = merged.length - beforeLen;
          candlesRef.current = merged;
          seriesRef.current.setData(merged);
          if (prevRange && added > 0) {
            timeScale.setVisibleLogicalRange({
              from: prevRange.from + added,
              to: prevRange.to + added,
            });
          }
          if (mapped.length < HISTORY_PAGE / 2) noMoreHistoryRef.current = true;
          loadingOlderRef.current = false;
          setLoadingOlder(false);
          setDataVersion((v) => v + 1);
          return;
        }

        // Initial / latest history
        seriesRef.current.setData(mapped);
        candlesRef.current = mapped;
        lastCandleRef.current = mapped[mapped.length - 1];
        const lastClose = mapped[mapped.length - 1].close;
        setCurrentPrice(lastClose);
        updatePriceLine(lastClose);
        setLoading(false);
        loadingOlderRef.current = false;
        setLoadingOlder(false);
        setDataVersion((v) => v + 1);
      }

      if (data.msg_type === 'candles' && (!data.candles || !data.candles.length) && loadingOlderRef.current) {
        noMoreHistoryRef.current = true;
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }

      if (data.msg_type === 'tick' && data.tick) {
        const quote = Number(data.tick.quote);
        setCurrentPrice(quote);
        updatePriceLine(quote);
        onPriceUpdate?.(quote);

        const epoch = data.tick.epoch;
        const bucket = Math.floor(epoch / gran) * gran;
        const last = lastCandleRef.current;

        if (!last || last.time !== bucket) {
          const newCandle = { time: bucket, open: quote, high: quote, low: quote, close: quote };
          lastCandleRef.current = newCandle;
          candlesRef.current = capHistory([...candlesRef.current, newCandle], MAX_CANDLES);
          seriesRef.current.update(newCandle);
        } else {
          const updated = {
            ...last,
            high: Math.max(last.high, quote),
            low: Math.min(last.low, quote),
            close: quote,
          };
          lastCandleRef.current = updated;
          const arr = candlesRef.current.slice();
          if (arr.length) arr[arr.length - 1] = updated;
          candlesRef.current = arr;
          seriesRef.current.update(updated);
        }
        if (followLiveRef.current) {
          chartRef.current?.timeScale().scrollToRealTime();
        }
        if (candlesRef.current.length % 3 === 0) refreshIndicators();
      }

      if (data.msg_type === 'ohlc' && data.ohlc) {
        const c = data.ohlc;
        const candle = {
          time: c.open_time || c.epoch,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        };
        lastCandleRef.current = candle;
        seriesRef.current.update(candle);
        setCurrentPrice(Number(c.close));
        updatePriceLine(Number(c.close));
        onPriceUpdate?.(Number(c.close));
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
  }, [symbol, granularity, onPriceUpdate, refreshIndicators]);

  const displayOhlc = ohlc || (lastCandleRef.current
    ? {
        open: lastCandleRef.current.open,
        high: lastCandleRef.current.high,
        low: lastCandleRef.current.low,
        close: lastCandleRef.current.close,
      }
    : null);

  const chartReady = isValidSymbol(symbol);
  const symbolLabel = formatSymbolLabel(symbol);

  return (
    <div ref={wrapRef} className={`live-chart-wrap ${fill ? 'live-chart-fill' : ''}`}>
      {!hideToolbar && (
        <div className="chart-toolbar">
          <div className="chart-toolbar-left">
            <span className="chart-symbol-label">{symbolLabel}</span>
            {currentPrice != null && (
              <span className="chart-live-price mono">{currentPrice.toFixed(4)}</span>
            )}
            {loadingOlder && <span className="chart-loading-older">Loading older…</span>}
          </div>
          <div className="chart-toolbar-tf">
            {GRANULARITIES.map((g) => (
              <button
                key={g.label}
                type="button"
                className={`tf-btn ${granularity.value === g.value ? 'active' : ''}`}
                onClick={() => setGranularity(g)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!hideToolbar && displayOhlc && (
        <div className="chart-ohlc-bar">
          <span>O <strong className="mono">{displayOhlc.open?.toFixed(4)}</strong></span>
          <span>H <strong className="mono">{displayOhlc.high?.toFixed(4)}</strong></span>
          <span>L <strong className="mono">{displayOhlc.low?.toFixed(4)}</strong></span>
          <span>C <strong className="mono">{displayOhlc.close?.toFixed(4)}</strong></span>
        </div>
      )}
      <div className="chart-container">
        {!chartReady && (
          <div className="chart-empty-state">
            <p>Select a market to load live candles</p>
          </div>
        )}
        {chartReady && loading && (
          <div className="chart-loading">
            <ChartSkeleton />
          </div>
        )}
        <div ref={containerRef} className="live-chart" />
      </div>
    </div>
  );
}
