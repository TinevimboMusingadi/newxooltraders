import { useEffect, useRef, useState, useCallback } from 'react';
import { computeDigitDistribution, extractLastDigit } from '../lib/digitsEngine';
import { isValidSymbol } from '../lib/symbolUtils';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

export function useDigitStream(symbol, { historySize = 20, pip = 2 } = {}) {
  const [quote, setQuote] = useState(null);
  const [lastDigit, setLastDigit] = useState(null);
  const [evenOddHistory, setEvenOddHistory] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const quotesRef = useRef([]);

  const pushQuote = useCallback((q) => {
    setQuote(q);
    const digit = extractLastDigit(q, pip);
    setLastDigit(digit);
    const even = digit % 2 === 0;
    setEvenOddHistory((prev) => [...prev.slice(-(historySize - 1)), even ? 'E' : 'O']);
    quotesRef.current = [...quotesRef.current.slice(-999), q];
    if (quotesRef.current.length >= 10) {
      setDistribution(computeDigitDistribution(quotesRef.current, pip));
    }
  }, [historySize, pip]);

  useEffect(() => {
    if (!isValidSymbol(symbol)) return;
    quotesRef.current = [];
    setQuote(null);
    setLastDigit(null);
    setEvenOddHistory([]);
    setDistribution(null);

    let ws;
    let closed = false;

    ws = new WebSocket(PUBLIC_WS);
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
      closed = true;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ forget_all: 'ticks' }));
      ws?.close();
    };
  }, [symbol, pushQuote]);

  const evenPct = evenOddHistory.length
    ? (evenOddHistory.filter((x) => x === 'E').length / evenOddHistory.length) * 100
    : 0;

  return {
    quote,
    lastDigit,
    evenOddHistory,
    distribution,
    evenPct,
    oddPct: 100 - evenPct,
  };
}
