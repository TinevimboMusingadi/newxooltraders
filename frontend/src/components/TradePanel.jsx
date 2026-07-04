import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

const STAKES = [1, 5, 10];
const DURATIONS = [
  { label: '1 min', value: 60, unit: 's' },
  { label: '5 min', value: 300, unit: 's' },
  { label: '1 tick', value: 1, unit: 't' },
];

const MODES = [
  { id: 'rise_fall', label: 'Rise/Fall' },
  { id: 'digits', label: 'Digits' },
  { id: 'accumulator', label: 'Accumulator' },
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
  accountMode,
}) {
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [mode, setMode] = useState('rise_fall');
  const [barrier, setBarrier] = useState(5);
  const [growthRate, setGrowthRate] = useState(3);
  const [status, setStatus] = useState(null);

  const runTrade = async (params) => {
    setStatus(null);
    try {
      const result = await onTrade(params);
      setStatus({
        type: 'success',
        message: `Contract opened #${result?.buy?.contract_id || 'OK'}`,
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleRiseFall = (contractType) =>
    runTrade({
      contractType,
      amount: stake,
      duration: duration.value,
      durationUnit: duration.unit,
      symbol,
      currency: currency || 'USD',
    });

  const handleDigit = (contractType) =>
    runTrade({
      contractType,
      amount: stake,
      duration: 1,
      durationUnit: 't',
      symbol,
      currency: currency || 'USD',
      barrier,
    });

  const handleAccumulator = () =>
    runTrade({
      contractType: 'ACCU',
      amount: stake,
      symbol,
      currency: currency || 'USD',
      growthRate: growthRate / 100,
      limitTicks: 50,
    });

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

      {accountMode === 'real' && (
        <p className="trade-live-warning">Live account — real funds at risk</p>
      )}

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

      <div className="preset-row mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`preset-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
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

      {mode !== 'accumulator' && (
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
      )}

      {mode === 'digits' && (
        <div className="trade-field">
          <label>Barrier (0–9)</label>
          <input
            type="number"
            min={0}
            max={9}
            value={barrier}
            onChange={(e) => setBarrier(Number(e.target.value))}
            className="trade-input"
          />
        </div>
      )}

      {mode === 'accumulator' && (
        <div className="trade-field">
          <label>Growth rate %</label>
          <div className="preset-row">
            {[3, 5, 6].map((g) => (
              <button
                key={g}
                type="button"
                className={`preset-btn ${growthRate === g ? 'active' : ''}`}
                onClick={() => setGrowthRate(g)}
              >
                {g}%
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'rise_fall' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleRiseFall('CALL')}>
            <TrendingUp size={18} /> Rise
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleRiseFall('PUT')}>
            <TrendingDown size={18} /> Fall
          </button>
        </div>
      )}

      {mode === 'digits' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleDigit('DIGITEVEN')}>
            Even
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleDigit('DIGITODD')}>
            Odd
          </button>
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleDigit('DIGITOVER')}>
            Over
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleDigit('DIGITUNDER')}>
            Under
          </button>
        </div>
      )}

      {mode === 'accumulator' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-primary" disabled={!connected || trading} onClick={handleAccumulator}>
            Buy Accumulator
          </button>
        </div>
      )}

      {status && <p className={`trade-status ${status.type}`}>{status.message}</p>}

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
