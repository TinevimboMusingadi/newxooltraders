import { useEffect, useState } from 'react';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';
const PING_INTERVAL_MS = 45_000;

const SYMBOLS = [
  { symbol: '1HZ100V', label: 'Volatility 100' },
  { symbol: '1HZ75V', label: 'Volatility 75' },
  { symbol: 'frxEURUSD', label: 'EUR/USD' },
  { symbol: 'cryBTCUSD', label: 'BTC/USD' },
];

function formatPrice(symbol, quote) {
  if (symbol.startsWith('frx')) return quote.toFixed(4);
  if (symbol.startsWith('cry')) return quote.toFixed(2);
  return quote.toFixed(2);
}

export default function LiveTicker() {
  const [ticks, setTicks] = useState(() =>
    Object.fromEntries(SYMBOLS.map((s) => [s.symbol, { quote: null, up: true }])),
  );

  useEffect(() => {
    let ws;
    let pingTimer;
    let reconnectTimer;
    let closed = false;
    let reqId = 1;

    function connect() {
      ws = new WebSocket(PUBLIC_WS);

      ws.onopen = () => {
        for (const { symbol } of SYMBOLS) {
          ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: reqId++ }));
        }
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ping: 1, req_id: reqId++ }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'tick' && data.tick) {
          const sym = data.tick.symbol;
          setTicks((prev) => {
            const old = prev[sym]?.quote;
            const quote = data.tick.quote;
            const up = old == null ? true : quote >= old;
            return { ...prev, [sym]: { quote, up } };
          });
        }
      };

      ws.onclose = () => {
        clearInterval(pingTimer);
        if (!closed) reconnectTimer = setTimeout(connect, 4000);
      };
    }

    connect();

    return () => {
      closed = true;
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  const items = SYMBOLS.map(({ symbol, label }) => {
    const t = ticks[symbol];
    return {
      label,
      price: t?.quote != null ? formatPrice(symbol, t.quote) : '—',
      up: t?.up ?? true,
      live: t?.quote != null,
    };
  });

  return (
    <div className="ticker-wrapper">
      <div className="ticker-content">
        {[...items, ...items].map((item, index) => (
          <div className="ticker-item" key={index}>
            <span className="ticker-symbol">{item.label}</span>
            <span className="ticker-price">{item.live ? item.price : '…'}</span>
            <span className={`ticker-change ${item.up ? 'up' : 'down'}`}>
              {item.up ? '▲' : '▼'} Live
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
