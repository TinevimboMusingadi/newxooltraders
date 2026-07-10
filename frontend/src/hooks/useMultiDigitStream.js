import { useEffect, useRef, useState, useCallback } from 'react';
import { createTickBuffer } from '../lib/tickAnalysisEngine';
import { isValidSymbol } from '../lib/symbolUtils';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

export function useMultiDigitStream(symbols = [], { bufferSize = 120, pip = 2 } = {}) {
  const [streams, setStreams] = useState({});
  const buffersRef = useRef(new Map());
  const validSymbols = symbols.filter(isValidSymbol);

  const applyTick = useCallback((symbol, quote) => {
    if (!buffersRef.current.has(symbol)) {
      buffersRef.current.set(symbol, createTickBuffer(bufferSize));
    }
    const snap = buffersRef.current.get(symbol).push(quote, pip);
    setStreams((prev) => ({ ...prev, [symbol]: snap }));
  }, [bufferSize, pip]);

  useEffect(() => {
    if (!validSymbols.length) return;

    buffersRef.current = new Map();
    setStreams({});
    validSymbols.forEach((sym) => buffersRef.current.set(sym, createTickBuffer(bufferSize)));

    const ws = new WebSocket(PUBLIC_WS);

    ws.onopen = () => {
      validSymbols.forEach((sym) => {
        ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
      });
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.msg_type === 'tick' && data.tick?.symbol) {
        applyTick(data.tick.symbol, Number(data.tick.quote));
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
      }
      ws.close();
    };
  }, [validSymbols.join(','), bufferSize, pip, applyTick]);

  return { streams, symbols: validSymbols };
}
