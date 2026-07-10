import { useEffect, useRef, useState, useCallback } from 'react';
import { createTickBuffer } from '../lib/tickAnalysisEngine';
import { isValidSymbol } from '../lib/symbolUtils';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

export function useDigitStream(symbol, { bufferSize = 120, pip = 2 } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const bufferRef = useRef(null);

  const pushQuote = useCallback((q) => {
    if (!bufferRef.current) bufferRef.current = createTickBuffer(bufferSize);
    setSnapshot(bufferRef.current.push(q, pip));
  }, [bufferSize, pip]);

  useEffect(() => {
    if (!isValidSymbol(symbol)) return;
    bufferRef.current = createTickBuffer(bufferSize);
    setSnapshot(null);

    const ws = new WebSocket(PUBLIC_WS);
    ws.onopen = () => {
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    };
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.msg_type === 'tick' && data.tick?.symbol === symbol) {
        pushQuote(Number(data.tick.quote));
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ forget_all: 'ticks' }));
      ws.close();
    };
  }, [symbol, pushQuote, bufferSize]);

  return {
    quote: snapshot?.quote ?? null,
    quoteHistory: snapshot?.quoteHistory ?? [],
    lastDigit: snapshot?.lastDigit ?? null,
    digitHistory: snapshot?.digitHistory ?? [],
    evenOddHistory: snapshot?.evenOddHistory ?? [],
    riseFallHistory: snapshot?.riseFallHistory ?? [],
    overUnderHistory: snapshot?.overUnderHistory ?? [],
    distribution: snapshot?.distribution ?? null,
    evenPct: snapshot?.evenPct ?? 0,
    oddPct: snapshot?.oddPct ?? 0,
    risePct: snapshot?.risePct ?? 0,
    fallPct: snapshot?.fallPct ?? 0,
    over4Pct: snapshot?.over4Pct ?? 0,
    under5Pct: snapshot?.under5Pct ?? 0,
    tickCount: snapshot?.tickCount ?? 0,
  };
}
