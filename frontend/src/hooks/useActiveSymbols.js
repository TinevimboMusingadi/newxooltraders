import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { mapActiveSymbol } from '../lib/symbolGroups';

export function useActiveSymbols() {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getLiveSymbols();
        if (!cancelled) {
          if (data.symbols?.length) {
            setSymbols(data.symbols.map((s) => (s.symbol ? mapActiveSymbol(s) : s)));
          } else {
            setError('No symbols returned from Deriv');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { symbols, loading, error };
}

export function useRealtimePrices(symbolList) {
  const [prices, setPrices] = useState({});
  const wsRef = useRef(null);
  const subsRef = useRef(new Set());

  const subscribe = useCallback((sym) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (subsRef.current.has(sym)) return;
    subsRef.current.add(sym);
    wsRef.current.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
  }, []);

  useEffect(() => {
    if (!symbolList?.length) return;

    const ws = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
    wsRef.current = ws;

    ws.onopen = () => {
      symbolList.slice(0, 50).forEach((sym) => {
        subsRef.current.add(sym);
        ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === 'tick' && data.tick) {
        setPrices((prev) => ({
          ...prev,
          [data.tick.symbol]: {
            quote: data.tick.quote,
            epoch: data.tick.epoch,
            dir: prev[data.tick.symbol]?.quote != null
              ? (data.tick.quote > prev[data.tick.symbol].quote ? 'up' : data.tick.quote < prev[data.tick.symbol].quote ? 'down' : 'flat')
              : 'flat',
          },
        }));
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
    }, 45000);

    return () => {
      clearInterval(ping);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
      }
      ws.close();
      subsRef.current.clear();
    };
  }, [symbolList?.join(',')]);

  return { prices, subscribe };
}
