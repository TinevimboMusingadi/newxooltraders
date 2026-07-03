import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, CandlestickSeries } from 'lightweight-charts';

export default function LiveChart({ symbol, onPriceUpdate, height = 360 }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#a0a0ab',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)' },
      width: containerRef.current.clientWidth,
      height,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#6b33ee',
      downColor: '#ff3d00',
      borderUpColor: '#9d6cff',
      borderDownColor: '#ff3d00',
      wickUpColor: '#9d6cff',
      wickDownColor: '#ff3d00',
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
  }, []);

  useEffect(() => {
    if (!symbol || !seriesRef.current) return;

    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    wsRef.current = ws;
    let reqId = 1;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: 200,
          end: 'latest',
          granularity: 60,
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
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        seriesRef.current.setData(candles);
        lastCandleRef.current = candles[candles.length - 1];
      }

      if (data.msg_type === 'tick' && data.tick) {
        const quote = data.tick.quote;
        onPriceUpdate?.(quote);

        const epoch = data.tick.epoch;
        const minute = Math.floor(epoch / 60) * 60;
        const last = lastCandleRef.current;

        if (!last || last.time !== minute) {
          const newCandle = { time: minute, open: quote, high: quote, low: quote, close: quote };
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
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
        lastCandleRef.current = candle;
        seriesRef.current.update(candle);
        onPriceUpdate?.(c.close);
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ ping: 1, req_id: reqId++ }));
      }
    }, 45000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [symbol, onPriceUpdate, height]);

  return (
    <div className="live-chart-wrap">
      <div ref={containerRef} className="live-chart" />
    </div>
  );
}
