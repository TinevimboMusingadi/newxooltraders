import { useEffect, useRef, useState } from 'react';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';
const PING_INTERVAL_MS = 45_000;

export function useDerivPublicWs({ symbol, onTick, enabled = true }) {
  const wsRef = useRef(null);
  const reqIdRef = useRef(1);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled || !symbol) return;

    let pingTimer;
    let reconnectTimer;
    let closed = false;

    function connect() {
      const ws = new WebSocket(PUBLIC_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        ws.send(
          JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 300,
            end: 'latest',
            granularity: 60,
            style: 'candles',
            req_id: reqIdRef.current++,
          }),
        );
        ws.send(
          JSON.stringify({
            ticks: symbol,
            subscribe: 1,
            req_id: reqIdRef.current++,
          }),
        );
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ping: 1, req_id: reqIdRef.current++ }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error.message || 'WebSocket error');
          return;
        }
        if (data.msg_type === 'tick' && data.tick) {
          onTickRef.current?.({
            epoch: data.tick.epoch,
            quote: data.tick.quote,
          });
        }
        if (data.msg_type === 'candles' && data.candles) {
          onTickRef.current?.({ candles: data.candles, type: 'history' });
        }
        if (data.msg_type === 'ohlc' && data.ohlc) {
          onTickRef.current?.({
            epoch: data.ohlc.open_time,
            quote: data.ohlc.close,
            ohlc: data.ohlc,
            type: 'candle',
          });
        }
      };

      ws.onerror = () => setError('Connection error');
      ws.onclose = () => {
        setConnected(false);
        clearInterval(pingTimer);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [symbol, enabled]);

  return { connected, error };
}
