import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

const STAKES = [1, 5, 10];
const DURATIONS = [
  { label: '1 min', value: 60, unit: 's' },
  { label: '5 min', value: 300, unit: 's' },
];

export default function TradePanel({
  symbol,
  currency,
  connected,
  balance,
  openContracts,
  onTrade,
  trading,
  lastPrice,
}) {
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [status, setStatus] = useState(null);

  const handleTrade = async (contractType) => {
    setStatus(null);
    try {
      const result = await onTrade({
        contractType,
        amount: stake,
        duration: duration.value,
        durationUnit: duration.unit,
        symbol,
        currency: currency || 'USD',
      });
      setStatus({
        type: 'success',
        message: `Contract opened #${result.buy?.contract_id || 'OK'}`,
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const balanceDisplay =
    balance?.balance != null
      ? `${balance.balance} ${balance.currency || currency || 'USD'}`
      : '—';

  return (
    <div className="trade-panel card">
      <div className="trade-panel-header">
        <h3 className="heading-md">Trade</h3>
        <span className={`status-dot ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="trade-stat-row">
        <div>
          <span className="text-muted">Balance</span>
          <p className="trade-stat-value">{balanceDisplay}</p>
        </div>
        <div>
          <span className="text-muted">Price</span>
          <p className="trade-stat-value">{lastPrice != null ? lastPrice.toFixed(2) : '—'}</p>
        </div>
        <div>
          <span className="text-muted">Open</span>
          <p className="trade-stat-value">{openContracts?.length || 0}</p>
        </div>
      </div>

      <div className="trade-field">
        <label>Stake (USD)</label>
        <div className="preset-row">
          {STAKES.map((s) => (
            <button
              key={s}
              type="button"
              className={`preset-btn ${stake === s ? 'active' : ''}`}
              onClick={() => setStake(s)}
            >
              ${s}
            </button>
          ))}
        </div>
      </div>

      <div className="trade-field">
        <label>Duration</label>
        <div className="preset-row">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              type="button"
              className={`preset-btn ${duration.label === d.label ? 'active' : ''}`}
              onClick={() => setDuration(d)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trade-actions">
        <button
          type="button"
          className="btn btn-buy"
          disabled={!connected || trading}
          onClick={() => handleTrade('CALL')}
        >
          <TrendingUp size={18} /> Rise
        </button>
        <button
          type="button"
          className="btn btn-sell"
          disabled={!connected || trading}
          onClick={() => handleTrade('PUT')}
        >
          <TrendingDown size={18} /> Fall
        </button>
      </div>

      {status && (
        <p className={`trade-status ${status.type}`}>{status.message}</p>
      )}

      {openContracts?.length > 0 && (
        <div className="open-contracts">
          <h4>Open Contracts</h4>
          <ul>
            {openContracts.map((c) => (
              <li key={c.contract_id}>
                #{c.contract_id} · {c.contract_type} · {c.buy_price} {c.currency}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
