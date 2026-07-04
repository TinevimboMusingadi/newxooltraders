import { useState } from 'react';
import { useProfitTable, useStatement } from '../hooks/queries';
import { format } from 'date-fns';

const TABS = ['Closed Trades', 'Statement'];

export default function History() {
  const [tab, setTab] = useState(0);
  const [dateRange] = useState({ from: undefined, to: undefined });

  const profitQuery = useProfitTable({ from: dateRange.from, to: dateRange.to });
  const stmtQuery = useStatement({ from: dateRange.from, to: dateRange.to });

  const trades = profitQuery.data?.transactions || [];
  const statements = stmtQuery.data?.transactions || [];

  const totalPL = trades.reduce((sum, t) => sum + Number(t.sell_price - t.buy_price), 0);
  const wins = trades.filter((t) => Number(t.sell_price) > Number(t.buy_price)).length;
  const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(0) : 0;

  return (
    <div className="history-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Trade History</h1>
        <p className="text-secondary">Past trades, profit/loss, and account statement.</p>
      </div>

      <div className="history-summary">
        <div className="summary-card">
          <span className="summary-label">Total P&L</span>
          <span className={`summary-value ${totalPL >= 0 ? 'profit' : 'loss'}`}>
            {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Trades</span>
          <span className="summary-value">{trades.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Win Rate</span>
          <span className="summary-value">{winRate}%</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Wins</span>
          <span className="summary-value profit">{wins}</span>
        </div>
      </div>

      <div className="history-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === i ? 'active' : ''}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="history-table-wrap">
          {profitQuery.isPending && <div className="skeleton-table" />}
          {profitQuery.isError && (
            <div className="error-card">Failed to load trades: {profitQuery.error?.message}</div>
          )}
          {profitQuery.isSuccess && trades.length === 0 && (
            <p className="text-muted">No closed trades found.</p>
          )}
          {trades.length > 0 && (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contract</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => {
                  const pl = Number(t.sell_price) - Number(t.buy_price);
                  return (
                    <tr key={t.transaction_id || i}>
                      <td className="mono">
                        {t.purchase_time ? format(new Date(t.purchase_time * 1000), 'MMM dd HH:mm') : '—'}
                      </td>
                      <td>{t.shortcode || t.contract_type || '—'}</td>
                      <td className="mono">{Number(t.buy_price).toFixed(2)}</td>
                      <td className="mono">{Number(t.sell_price).toFixed(2)}</td>
                      <td className={`mono ${pl >= 0 ? 'profit' : 'loss'}`}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="history-table-wrap">
          {stmtQuery.isPending && <div className="skeleton-table" />}
          {stmtQuery.isError && (
            <div className="error-card">Failed to load statement: {stmtQuery.error?.message}</div>
          )}
          {stmtQuery.isSuccess && statements.length === 0 && (
            <p className="text-muted">No transactions found.</p>
          )}
          {statements.length > 0 && (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s, i) => (
                  <tr key={s.transaction_id || i}>
                    <td className="mono">
                      {s.transaction_time ? format(new Date(s.transaction_time * 1000), 'MMM dd HH:mm') : '—'}
                    </td>
                    <td>{s.action_type}</td>
                    <td className={`mono ${Number(s.amount) >= 0 ? 'profit' : 'loss'}`}>
                      {Number(s.amount) >= 0 ? '+' : ''}{Number(s.amount).toFixed(2)}
                    </td>
                    <td className="mono">{Number(s.balance_after).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
