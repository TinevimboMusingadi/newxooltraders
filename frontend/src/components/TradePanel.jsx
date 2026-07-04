import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { DEFAULT_DURATION, TRADE_DURATIONS } from '../lib/tradeDurations';
import { api } from '../lib/api';

const STAKES = [1, 5, 10, 25, 50];

const MODES = [
  { id: 'rise_fall', label: 'Rise/Fall', types: ['CALL', 'PUT'] },
  { id: 'digits', label: 'Digits', types: ['DIGITEVEN', 'DIGITODD', 'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'] },
  { id: 'accumulator', label: 'Accum.', types: ['ACCU'] },
  { id: 'multiplier', label: 'Multiplier', types: ['MULTUP', 'MULTDOWN'] },
  { id: 'turbos', label: 'Turbos', types: ['TURBOSLONG', 'TURBOSSHORT'] },
  { id: 'touch', label: 'Touch', types: ['ONETOUCH', 'NOTOUCH'] },
  { id: 'higher_lower', label: 'Higher/Lower', types: ['CALL', 'PUT'] },
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
  const [stake, setStake] = useState(5);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mode, setMode] = useState('rise_fall');
  const [barrier, setBarrier] = useState(5);
  const [growthRate, setGrowthRate] = useState(3);
  const [multiplier, setMultiplier] = useState(100);
  const [availableModes, setAvailableModes] = useState(MODES.slice(0, 3));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    api.getContractsFor(symbol).then((data) => {
      if (cancelled || !data?.available) return;
      const types = new Set(data.available.map((c) => c.contract_type));
      const filtered = MODES.filter((m) => m.types.some((t) => types.has(t)));
      if (filtered.length) setAvailableModes(filtered);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);

  const runTrade = async (params) => {
    setStatus(null);
    try {
      const result = await onTrade(params);
      setStatus({ type: 'success', message: `Contract opened #${result?.buy?.contract_id || 'OK'}` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const buildParams = (contractType, extra = {}) => ({
    contractType,
    amount: stake,
    duration: duration.value,
    durationUnit: duration.unit,
    symbol,
    currency: currency || 'USD',
    ...extra,
  });

  const handleRiseFall = (ct) => runTrade(buildParams(ct));
  const handleDigit = (ct) => runTrade(buildParams(ct, { barrier }));
  const handleAccumulator = () => runTrade({ contractType: 'ACCU', amount: stake, symbol, currency: currency || 'USD', growthRate: growthRate / 100, limitTicks: 50 });
  const handleMultiplier = (ct) => runTrade({ contractType: ct, amount: stake, symbol, currency: currency || 'USD', multiplier });
  const handleTurbos = (ct) => runTrade(buildParams(ct));
  const handleTouch = (ct) => runTrade(buildParams(ct, { barrier: lastPrice ? lastPrice * (ct === 'ONETOUCH' ? 1.01 : 0.99) : undefined }));

  const balanceDisplay = balance?.balance != null ? `${balance.balance} ${balance.currency || currency || 'USD'}` : '—';

  return (
    <div className="trade-panel card">
      <div className="trade-panel-header">
        <h3 className="heading-md">Trade</h3>
        <span className={`status-dot ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {accountMode === 'real' && (
        <p className="trade-live-warning">Live account — real funds at risk</p>
      )}

      <div className="trade-stat-row">
        <div>
          <span className="text-muted">Balance</span>
          <p className="trade-stat-value mono">{balanceDisplay}</p>
        </div>
        <div>
          <span className="text-muted">Price</span>
          <p className="trade-stat-value mono">{lastPrice != null ? lastPrice.toFixed(4) : '—'}</p>
        </div>
        <div>
          <span className="text-muted">Open</span>
          <p className="trade-stat-value">{openContracts?.length || 0}</p>
        </div>
      </div>

      <div className="preset-row mode-tabs">
        {availableModes.map((m) => (
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
        <label>Stake ({currency || 'USD'})</label>
        <div className="stake-row">
          <input
            type="number"
            min={0.35}
            step={0.5}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="trade-input stake-input"
          />
          <div className="preset-row">
            {STAKES.map((s) => (
              <button key={s} type="button" className={`preset-btn ${stake === s ? 'active' : ''}`} onClick={() => setStake(s)}>
                ${s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!['accumulator', 'multiplier'].includes(mode) && (
        <div className="trade-field">
          <label>Duration</label>
          <div className="preset-row duration-row">
            {TRADE_DURATIONS.map((d) => (
              <button
                key={`${d.value}${d.unit}`}
                type="button"
                className={`preset-btn ${duration.value === d.value && duration.unit === d.unit ? 'active' : ''}`}
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
          <label>Barrier (0-9)</label>
          <input type="number" min={0} max={9} value={barrier} onChange={(e) => setBarrier(Number(e.target.value))} className="trade-input" />
        </div>
      )}

      {mode === 'accumulator' && (
        <div className="trade-field">
          <label>Growth rate %</label>
          <div className="preset-row">
            {[1, 2, 3, 4, 5].map((g) => (
              <button key={g} type="button" className={`preset-btn ${growthRate === g ? 'active' : ''}`} onClick={() => setGrowthRate(g)}>{g}%</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'multiplier' && (
        <div className="trade-field">
          <label>Multiplier</label>
          <div className="preset-row">
            {[20, 50, 100, 200, 500].map((m) => (
              <button key={m} type="button" className={`preset-btn ${multiplier === m ? 'active' : ''}`} onClick={() => setMultiplier(m)}>x{m}</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'rise_fall' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleRiseFall('CALL')}>
            <TrendingUp size={16} /> Rise
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleRiseFall('PUT')}>
            <TrendingDown size={16} /> Fall
          </button>
        </div>
      )}

      {mode === 'higher_lower' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleRiseFall('CALL')}>
            <TrendingUp size={16} /> Higher
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleRiseFall('PUT')}>
            <TrendingDown size={16} /> Lower
          </button>
        </div>
      )}

      {mode === 'digits' && (
        <div className="trade-actions trade-actions-grid">
          <button type="button" className="btn btn-buy btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITEVEN')}>Even</button>
          <button type="button" className="btn btn-sell btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITODD')}>Odd</button>
          <button type="button" className="btn btn-buy btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITOVER')}>Over</button>
          <button type="button" className="btn btn-sell btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITUNDER')}>Under</button>
          <button type="button" className="btn btn-buy btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITMATCH')}>Match</button>
          <button type="button" className="btn btn-sell btn-sm" disabled={!connected || trading} onClick={() => handleDigit('DIGITDIFF')}>Differ</button>
        </div>
      )}

      {mode === 'accumulator' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-primary" disabled={!connected || trading} onClick={handleAccumulator}>
            <Zap size={16} /> Buy Accumulator
          </button>
        </div>
      )}

      {mode === 'multiplier' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleMultiplier('MULTUP')}>
            <TrendingUp size={16} /> Up x{multiplier}
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleMultiplier('MULTDOWN')}>
            <TrendingDown size={16} /> Down x{multiplier}
          </button>
        </div>
      )}

      {mode === 'turbos' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleTurbos('TURBOSLONG')}>
            <TrendingUp size={16} /> Turbo Long
          </button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleTurbos('TURBOSSHORT')}>
            <TrendingDown size={16} /> Turbo Short
          </button>
        </div>
      )}

      {mode === 'touch' && (
        <div className="trade-actions">
          <button type="button" className="btn btn-buy" disabled={!connected || trading} onClick={() => handleTouch('ONETOUCH')}>Touch</button>
          <button type="button" className="btn btn-sell" disabled={!connected || trading} onClick={() => handleTouch('NOTOUCH')}>No Touch</button>
        </div>
      )}

      {status && <p className={`trade-status ${status.type}`}>{status.message}</p>}
    </div>
  );
}
