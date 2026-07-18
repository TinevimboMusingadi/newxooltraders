import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Bordered Deriv-style bot activity chat.
 * messages: { id?, ts, role: 'bot'|'system'|'trade'|'error', text }[]
 */
export default function BotTradeChat({
  running = false,
  messages = [],
  onClear,
  title = 'Trade Chat',
  className = '',
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <section className={`bot-trade-chat ${className}`.trim()}>
      <header className="bot-trade-chat-header">
        <div className="bot-trade-chat-title-row">
          <h3 className="heading-sm">{title}</h3>
          <span className={`bot-run-badge ${running ? 'is-running' : 'is-idle'}`}>
            {running ? 'Bot is running' : 'Bot is not running'}
          </span>
        </div>
        {onClear && messages.length > 0 && (
          <button type="button" className="btn-ghost btn-xs" onClick={onClear} title="Clear chat">
            <RefreshCw size={12} /> Clear
          </button>
        )}
      </header>
      <div className="bot-trade-chat-body" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-muted bot-trade-chat-empty">
            Start the bot to see trades and actions here.
          </p>
        ) : (
          <ul className="bot-trade-chat-list">
            {messages.map((m, i) => (
              <li key={m.id || `${m.ts}-${i}`} className={`bot-chat-msg role-${m.role || 'bot'}`}>
                <span className="bot-chat-time mono text-muted">
                  {new Date(m.ts || Date.now()).toLocaleTimeString()}
                </span>
                <span className="bot-chat-text">{m.text}</span>
              </li>
            ))}
            <li ref={endRef} aria-hidden className="bot-chat-anchor" />
          </ul>
        )}
      </div>
    </section>
  );
}

export function pushChatMessage(setMessages, text, role = 'bot') {
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: Date.now(), role, text };
  setMessages((prev) => [...prev, entry].slice(-200));
  return entry;
}
