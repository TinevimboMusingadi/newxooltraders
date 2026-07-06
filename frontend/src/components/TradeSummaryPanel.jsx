import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTradeSession } from '../context/TradeSessionContext';
import { useTradingWs } from '../context/TradingWsContext';

export default function TradeSummaryPanel() {
  const [tab, setTab] = useState('summary');
  const [collapsed, setCollapsed] = useState(false);
  const { sessionPl, wins, losses, winRate, journal, transactions, reset } = useTradeSession();
  const { balance, openContracts } = useTradingWs();

  if (collapsed) {
    return (
      <aside className="trade-summary-panel collapsed">
        <button type="button" className="summary-collapse-btn" onClick={() => setCollapsed(false)} aria-label="Expand">
          <ChevronLeft size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="trade-summary-panel card">
      <div className="summary-header">
        <div className="summary-tabs">
          {['summary', 'transactions', 'journal'].map((t) => (
            <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="summary-collapse-btn" onClick={() => setCollapsed(true)} aria-label="Collapse">
          <ChevronRight size={18} />
        </button>
      </div>

      {tab === 'summary' && (
        <div className="summary-body">
          <div className="summary-stat">
            <span className="text-muted">Balance</span>
            <strong className="mono">{balance?.balance != null ? `${Number(balance.balance).toFixed(2)} ${balance.currency || 'USD'}` : '—'}</strong>
          </div>
          <div className="summary-stat">
            <span className="text-muted">Total profit/loss</span>
            <strong className={`mono ${sessionPl >= 0 ? 'profit' : 'loss'}`}>{sessionPl >= 0 ? '+' : ''}{sessionPl.toFixed(2)}</strong>
          </div>
          <div className="summary-row">
            <span>Won <strong className="profit">{wins}</strong></span>
            <span>Lost <strong className="loss">{losses}</strong></span>
            <span>Win rate <strong>{winRate}%</strong></span>
          </div>
          <div className="summary-stat">
            <span className="text-muted">Open contracts</span>
            <strong>{openContracts?.length || 0}</strong>
          </div>
          <button type="button" className="btn btn-primary summary-reset" onClick={reset}>Reset</button>
        </div>
      )}

      {tab === 'transactions' && (
        <ul className="summary-list">
          {transactions.length === 0 && <li className="text-muted">No settled trades this session.</li>}
          {transactions.map((tx, i) => (
            <li key={i}>
              <span>{tx.symbol || tx.action}</span>
              <span className={`mono ${Number(tx.profit) >= 0 ? 'profit' : 'loss'}`}>
                {Number(tx.profit).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'journal' && (
        <ul className="summary-list">
          {journal.length === 0 && <li className="text-muted">Events will appear here.</li>}
          {journal.map((j) => (
            <li key={j.id}>
              <span className="text-muted">{new Date(j.at).toLocaleTimeString()}</span>
              <span>{j.message || j.type}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
