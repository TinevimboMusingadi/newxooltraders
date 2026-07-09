import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { filterVolatilitySymbols, priceDecimals } from '../lib/symbolGroups';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { usePanelState } from '../hooks/usePanelState';

const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

export default function LiveTicker({ symbols: propSymbols, defaultOpen = true }) {
  const { symbols: liveSymbols, loading } = useActiveSymbols();
  const { favorites } = useMarket();
  const { open, toggle } = usePanelState('live-ticker', defaultOpen);

  const SYMBOLS = useMemo(() => {
    if (propSymbols?.length) return propSymbols;
    const vol = filterVolatilitySymbols(liveSymbols).slice(0, 5);
    const fav = favorites.slice(0, 3).map((sym) => liveSymbols.find((s) => s.symbol === sym)).filter(Boolean);
    const merged = [...fav, ...vol];
    const seen = new Set();
    return merged.filter((s) => {
      if (seen.has(s.symbol)) return false;
      seen.add(s.symbol);
      return true;
    }).slice(0, 8).map((s) => ({
      symbol: s.symbol,
      label: s.displayName || s.symbol,
      pip: s.pip,
    }));
  }, [propSymbols, liveSymbols, favorites]);

  const [ticks, setTicks] = useState({});

  useEffect(() => {
    if (!SYMBOLS.length || !open) return;
    let ws;
    let pingTimer;
    let reconnectTimer;
    let closed = false;

    function connect() {
      ws = new WebSocket(PUBLIC_WS);
      ws.onopen = () => {
        SYMBOLS.forEach(({ symbol }) => {
          ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        });
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
        }, 45000);
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'tick' && data.tick) {
          const sym = data.tick.symbol;
          setTicks((prev) => {
            const old = prev[sym]?.quote;
            const quote = data.tick.quote;
            return { ...prev, [sym]: { quote, up: old == null ? true : quote >= old } };
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
  }, [SYMBOLS.map((s) => s.symbol).join(','), open]);

  if (!open) {
    return (
      <div className="ticker-wrapper app-ticker collapsed">
        <button type="button" className="ticker-toggle" onClick={toggle} aria-expanded={false}>
          <span className="ticker-toggle-label">Markets</span>
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  if (loading && !SYMBOLS.length) {
    return (
      <div className="ticker-wrapper app-ticker open">
        <button type="button" className="ticker-toggle" onClick={toggle} aria-expanded>
          <span className="ticker-toggle-label">Markets</span>
          <ChevronUp size={14} />
        </button>
        <div className="ticker-content">
          <span className="ticker-item text-muted">Loading live markets…</span>
        </div>
      </div>
    );
  }

  if (!SYMBOLS.length) return null;

  const items = SYMBOLS.map(({ symbol, label, pip }) => {
    const t = ticks[symbol];
    const price = t?.quote != null ? Number(t.quote).toFixed(priceDecimals(symbol, pip)) : null;
    return {
      label,
      price: price ?? '…',
      up: t?.up ?? true,
      live: t?.quote != null,
    };
  });

  return (
    <div className="ticker-wrapper app-ticker open">
      <button type="button" className="ticker-toggle" onClick={toggle} aria-expanded>
        <span className="ticker-toggle-label">Markets</span>
        <ChevronUp size={14} />
      </button>
      <div className="ticker-content">
        {[...items, ...items].map((item, index) => (
          <div className="ticker-item" key={index}>
            <span className="ticker-symbol">{item.label}</span>
            <span className="ticker-price">{item.price}</span>
            <span className={`ticker-change ${item.up ? 'up' : 'down'}`}>
              {item.up ? '▲' : '▼'} {item.live ? 'Live' : '…'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
