import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, CandlestickSeries } from 'lightweight-charts';
import { GRANULARITIES, DEFAULT_GRANULARITY } from '../lib/chartUtils';
import { useTheme } from '../context/ThemeContext';

export default function LiveChart({ symbol, onPriceUpdate, height = 380 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);
  const wsRef = useRef(null);
  const [granularity, setGranularity] = useState(DEFAULT_GRANULARITY);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

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
      timeScale: { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', timeVisible: true },
      width: containerRef.current.clientWidth,
      height,
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

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isDark]);

  useEffect(() => {
    if (!symbol || !seriesRef.current) return;
    setLoading(true);
    seriesRef.current.setData([]);
    lastCandleRef.current = null;

    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    wsRef.current = ws;
    let reqId = 1;
    const gran = granularity.value;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: 300,
          end: 'latest',
          granularity: gran,
          style: 'candles',
          req_id: reqId++,
        }),
      );
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: reqId++ }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.msg_type === 'candles' && data.candles?.length) {
        const candles = data.candles.map((c) => ({
          time: c.epoch,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
        seriesRef.current.setData(candles);
        lastCandleRef.current = candles[candles.length - 1];
        setLoading(false);
      }

      if (data.msg_type === 'tick' && data.tick) {
        const quote = Number(data.tick.quote);
        onPriceUpdate?.(quote);

        const epoch = data.tick.epoch;
        const bucket = Math.floor(epoch / gran) * gran;
        const last = lastCandleRef.current;

        if (!last || last.time !== bucket) {
          const newCandle = { time: bucket, open: quote, high: quote, low: quote, close: quote };
          lastCandleRef.current = newCandle;
          seriesRef.current.update(newCandle);
        } else {
          const updated = {
            ...last,
            high: Math.max(last.high, quote),
            low: Math.min(last.low, quote),
            close: quote,
          };
          lastCandleRef.current = updated;
          seriesRef.current.update(updated);
        }
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
        onPriceUpdate?.(Number(c.close));
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
  }, [symbol, granularity, onPriceUpdate]);

  return (
    <div className="live-chart-wrap">
      <div className="chart-toolbar">
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
      <div className="chart-container" style={{ position: 'relative' }}>
        {loading && (
          <div className="chart-loading">
            <div className="spinner" />
          </div>
        )}
        <div ref={containerRef} className="live-chart" />
      </div>
    </div>
  );
}
