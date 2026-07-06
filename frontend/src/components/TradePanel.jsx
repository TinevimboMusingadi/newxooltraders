import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, TrendingUp, Zap, Loader2, Search } from 'lucide-react';
import { DEFAULT_DURATION } from '../lib/tradeDurations';
import { api } from '../lib/api';
import { useMarket } from '../context/MarketContext';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useContractsFor } from '../hooks/useContractsFor';

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
  onPreview,
  trading,
  lastPrice,
  accountMode,
  getProposal,
}) {
  const { selectSymbol } = useMarket();
  const { symbols } = useActiveSymbols();
  const [stake, setStake] = useState(5);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mode, setMode] = useState('rise_fall');
  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];
  const { allowedDurations, defaultDuration, growthRates, maxPayout, maxTicks } = useContractsFor(
    symbol,
    activeMode?.types || [],
  );
  const [barrier, setBarrier] = useState(5);
  const [growthRate, setGrowthRate] = useState(3);
  const [multiplier, setMultiplier] = useState(100);
  const [availableModes, setAvailableModes] = useState(MODES.slice(0, 3));
  const [status, setStatus] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [quotePreview, setQuotePreview] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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

  useEffect(() => {
    if (defaultDuration) setDuration(defaultDuration);
  }, [symbol, defaultDuration?.value, defaultDuration?.unit]);

  const buildParams = useCallback((contractType, extra = {}) => ({
    contractType,
    amount: stake,
    duration: duration.value,
    durationUnit: duration.unit,
    symbol,
    currency: currency || 'USD',
    ...extra,
  }), [stake, duration, symbol, currency]);

  const fetchQuote = useCallback(async (params) => {
    if (!getProposal || !connected) return null;
    setQuoteLoading(true);
    try {
      const result = await getProposal(params);
      const p = result.proposal;
      if (!p) return null;
      const preview = {
        askPrice: p.ask_price,
        payout: p.payout,
        spot: p.spot,
        id: p.id,
      };
      setQuotePreview(preview);
      onPreview?.(preview);
      return preview;
    } catch {
      setQuotePreview(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [getProposal, connected, onPreview]);

  useEffect(() => {
    if (!connected || mode === 'digits') {
      setQuotePreview(null);
      return;
    }
    const timer = setTimeout(() => {
      const ct = mode === 'multiplier' ? 'MULTUP' : mode === 'accumulator' ? 'ACCU' : 'CALL';
      let params;
      if (mode === 'accumulator') {
        params = { contractType: 'ACCU', amount: stake, symbol, currency: currency || 'USD', growthRate: growthRate / 100, limitTicks: 50 };
      } else if (mode === 'multiplier') {
        params = { contractType: ct, amount: stake, symbol, currency: currency || 'USD', multiplier };
      } else {
        params = buildParams(ct);
      }
      fetchQuote(params);
    }, 600);
    return () => clearTimeout(timer);
  }, [connected, mode, stake, duration, symbol, currency, growthRate, multiplier, buildParams, fetchQuote]);

  const runTrade = async (params, label) => {
    setStatus(null);
    setPendingAction(label);
    try {
      const result = await onTrade(params);
      setStatus({ type: 'success', message: `Contract opened #${result?.buy?.contract_id || 'OK'}` });
      setQuotePreview(null);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRiseFall = (ct) => runTrade(buildParams(ct), ct);
  const handleDigit = (ct) => runTrade(buildParams(ct, { barrier }), ct);
  const handleAccumulator = () => runTrade(
    { contractType: 'ACCU', amount: stake, symbol, currency: currency || 'USD', growthRate: growthRate / 100, limitTicks: 50 },
    'ACCU',
  );
  const handleMultiplier = (ct) => runTrade(
    { contractType: ct, amount: stake, symbol, currency: currency || 'USD', multiplier },
    ct,
  );
  const handleTurbos = (ct) => runTrade(buildParams(ct), ct);
  const handleTouch = (ct) => runTrade(
    buildParams(ct, { barrier: lastPrice ? lastPrice * (ct === 'ONETOUCH' ? 1.01 : 0.99) : undefined }),
    ct,
  );

  const balanceDisplay = balance?.balance != null ? `${balance.balance} ${balance.currency || currency || 'USD'}` : '—';

  const filteredSymbols = symbols.filter((s) => {
    const q = symbolSearch.toLowerCase();
    return !q || s.symbol.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q);
  }).slice(0, 12);

  const TradeBtn = ({ children, onClick, variant = 'buy', disabled, actionKey }) => (
    <button
      type="button"
      className={`btn btn-${variant} trade-action-btn`}
      disabled={disabled || !connected || trading}
      onClick={onClick}
    >
      {(trading && pendingAction === actionKey) ? <Loader2 size={16} className="spin-icon" /> : children}
    </button>
  );

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

      <div className="trade-symbol-picker">
        <button type="button" className="symbol-picker-toggle" onClick={() => setShowSymbolPicker(!showSymbolPicker)}>
          <Search size={14} />
          <span className="mono">{symbol}</span>
        </button>
        {showSymbolPicker && (
          <div className="symbol-picker-dropdown">
            <input
              type="search"
              placeholder="Search symbol…"
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              className="trade-input"
            />
            <ul className="symbol-picker-list">
              {filteredSymbols.map((s) => (
                <li key={s.symbol}>
                  <button
                    type="button"
                    className={s.symbol === symbol ? 'active' : ''}
                    onClick={() => { selectSymbol(s.symbol); setShowSymbolPicker(false); setSymbolSearch(''); }}
                  >
                    <span>{s.displayName || s.symbol}</span>
                    <span className="mono text-muted">{s.symbol}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="trade-mode-toggle">
        {availableModes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`pill-toggle ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="trade-view-toggle">
        <button type="button" className={`pill-toggle ${!advanced ? 'active' : ''}`} onClick={() => setAdvanced(false)}>Quick</button>
        <button type="button" className={`pill-toggle ${advanced ? 'active' : ''}`} onClick={() => setAdvanced(true)}>Advanced</button>
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
            {(allowedDurations.length ? allowedDurations : []).map((d) => (
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
          {!allowedDurations.length && (
            <p className="text-muted trade-hint">Loading durations for this symbol…</p>
          )}
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
            {growthRates.map((g) => (
              <button key={g} type="button" className={`preset-btn ${growthRate === g ? 'active' : ''}`} onClick={() => setGrowthRate(g)}>{g}%</button>
            ))}
          </div>
          {(maxPayout != null || maxTicks != null) && (
            <div className="accumulator-meta">
              {maxPayout != null && <span>Max payout: <strong className="mono">{Number(maxPayout).toFixed(2)}</strong></span>}
              {maxTicks != null && <span>Max ticks: <strong>{maxTicks}</strong></span>}
            </div>
          )}
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

      {quotePreview && (
        <div className="quote-preview">
          {quoteLoading ? (
            <span className="text-muted"><Loader2 size={14} className="spin-icon" /> Updating quote…</span>
          ) : (
            <>
              <div><span className="text-muted">Cost</span> <strong className="mono">{Number(quotePreview.askPrice).toFixed(2)}</strong></div>
              {quotePreview.payout != null && (
                <div><span className="text-muted">Payout</span> <strong className="mono profit">{Number(quotePreview.payout).toFixed(2)}</strong></div>
              )}
              {quotePreview.spot != null && (
                <div><span className="text-muted">Spot</span> <strong className="mono">{Number(quotePreview.spot).toFixed(4)}</strong></div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'rise_fall' && (
        <div className="trade-actions">
          <TradeBtn variant="buy" actionKey="CALL" onClick={() => handleRiseFall('CALL')}>
            <TrendingUp size={16} /> Rise
          </TradeBtn>
          <TradeBtn variant="sell" actionKey="PUT" onClick={() => handleRiseFall('PUT')}>
            <TrendingDown size={16} /> Fall
          </TradeBtn>
        </div>
      )}

      {mode === 'higher_lower' && (
        <div className="trade-actions">
          <TradeBtn variant="buy" actionKey="CALL" onClick={() => handleRiseFall('CALL')}>
            <TrendingUp size={16} /> Higher
          </TradeBtn>
          <TradeBtn variant="sell" actionKey="PUT" onClick={() => handleRiseFall('PUT')}>
            <TrendingDown size={16} /> Lower
          </TradeBtn>
        </div>
      )}

      {mode === 'digits' && (
        <div className="trade-actions trade-actions-grid">
          {['DIGITEVEN', 'DIGITODD', 'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].map((ct) => (
            <TradeBtn key={ct} variant={ct.includes('EVEN') || ct.includes('OVER') || ct.includes('MATCH') ? 'buy' : 'sell'} actionKey={ct} onClick={() => handleDigit(ct)}>
              {ct.replace('DIGIT', '')}
            </TradeBtn>
          ))}
        </div>
      )}

      {mode === 'accumulator' && (
        <div className="trade-actions">
          <TradeBtn variant="primary" actionKey="ACCU" onClick={handleAccumulator}>
            <Zap size={16} /> Buy Accumulator
          </TradeBtn>
        </div>
      )}

      {mode === 'multiplier' && (
        <div className="trade-actions">
          <TradeBtn variant="buy" actionKey="MULTUP" onClick={() => handleMultiplier('MULTUP')}>
            <TrendingUp size={16} /> Up x{multiplier}
          </TradeBtn>
          <TradeBtn variant="sell" actionKey="MULTDOWN" onClick={() => handleMultiplier('MULTDOWN')}>
            <TrendingDown size={16} /> Down x{multiplier}
          </TradeBtn>
        </div>
      )}

      {mode === 'turbos' && (
        <div className="trade-actions">
          <TradeBtn variant="buy" actionKey="TURBOSLONG" onClick={() => handleTurbos('TURBOSLONG')}>
            <TrendingUp size={16} /> Turbo Long
          </TradeBtn>
          <TradeBtn variant="sell" actionKey="TURBOSSHORT" onClick={() => handleTurbos('TURBOSSHORT')}>
            <TrendingDown size={16} /> Turbo Short
          </TradeBtn>
        </div>
      )}

      {mode === 'touch' && (
        <div className="trade-actions">
          <TradeBtn variant="buy" actionKey="ONETOUCH" onClick={() => handleTouch('ONETOUCH')}>Touch</TradeBtn>
          <TradeBtn variant="sell" actionKey="NOTOUCH" onClick={() => handleTouch('NOTOUCH')}>No Touch</TradeBtn>
        </div>
      )}

      {status && <p className={`trade-status ${status.type}`}>{status.message}</p>}
    </div>
  );
}
