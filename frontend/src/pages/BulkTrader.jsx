import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DigitHeatmap from '../components/DigitHeatmap';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { computeDigitDistribution, fetchTickHistory } from '../lib/digitsEngine';
import {
  hasRealTradeConfirmation,
  isDemoAccount,
  setRealTradeConfirmation,
} from '../lib/accountDisplay';
import { DEFAULT_DURATION, TRADE_DURATIONS } from '../lib/tradeDurations';

const CONTRACT_TYPES = [
  { id: 'DIGITEVEN', label: 'Even' },
  { id: 'DIGITODD', label: 'Odd' },
  { id: 'DIGITOVER', label: 'Over' },
  { id: 'DIGITUNDER', label: 'Under' },
];

export default function BulkTrader() {
  const { user } = useAuth();
  const { selectedSymbol, selectSymbol } = useMarket();
  const [params] = useSearchParams();
  const symbol = params.get('symbol') || selectedSymbol;
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);

  const [stake, setStake] = useState(1);
  const [count, setCount] = useState(3);
  const [contractType, setContractType] = useState(params.get('type') || 'DIGITEVEN');
  const [barrier, setBarrier] = useState(Number(params.get('barrier') || 5));
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [dist, setDist] = useState(null);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { connected, queueBulkTrades } = useTradingWs();

  const loadDigits = async () => {
    const quotes = await fetchTickHistory(symbol, 1000);
    setDist(computeDigitDistribution(quotes));
  };

  const buildTrades = useCallback(() => {
    const trades = [];
    for (let i = 0; i < count; i += 1) {
      trades.push({
        contractType,
        amount: stake,
        duration: duration.value,
        durationUnit: duration.unit,
        symbol,
        currency: selectedAccount?.currency || 'USD',
        ...(contractType.includes('DIGIT') && contractType !== 'DIGITEVEN' && contractType !== 'DIGITODD'
          ? { barrier }
          : {}),
      });
    }
    return trades;
  }, [count, contractType, stake, symbol, selectedAccount, barrier, duration]);

  const executeBulk = async () => {
    setRunning(true);
    setLog([]);
    try {
      const trades = buildTrades();
      const results = await queueBulkTrades(trades, { delayMs: 1000, maxConcurrent: 2 });
      setLog(results.map((r, i) => `#${i + 1} contract ${r.buy?.contract_id || 'ok'}`));
    } catch (err) {
      setLog([`Error: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  };

  const handleRun = () => {
    if (selectedAccount && !isDemoAccount(selectedAccount) && !hasRealTradeConfirmation()) {
      setShowConfirm(true);
      return;
    }
    executeBulk();
  };

  const needsBarrier = useMemo(
    () => contractType === 'DIGITOVER' || contractType === 'DIGITUNDER',
    [contractType],
  );

  return (
    <div className="bulk-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Bulk Trader</h1>
        <p className="text-secondary">Even/Odd and digit contracts with multi-stake execution.</p>
      </div>

      <div className="bulk-grid">
        <div className="card bulk-controls">
          <label>
            Symbol
            <input value={symbol} onChange={(e) => selectSymbol(e.target.value)} className="trade-input" />
          </label>
          <label>
            Contract
            <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
              {CONTRACT_TYPES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          {needsBarrier && (
            <label>
              Barrier
              <input type="number" min={0} max={9} value={barrier} onChange={(e) => setBarrier(Number(e.target.value))} />
            </label>
          )}
          <label>
            Stake $
            <input type="number" min={1} max={100} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
          </label>
          <label>
            Duration
            <select
              value={`${duration.value}${duration.unit}`}
              onChange={(e) => {
                const d = TRADE_DURATIONS.find((x) => `${x.value}${x.unit}` === e.target.value);
                if (d) setDuration(d);
              }}
            >
              {TRADE_DURATIONS.map((d) => (
                <option key={`${d.value}${d.unit}`} value={`${d.value}${d.unit}`}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Count (max 10)
            <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={loadDigits}>
            Load digit distribution
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!connected || running}
            onClick={handleRun}
          >
            {running ? 'Running…' : `Run ${count} trades`}
          </button>
        </div>
        <DigitHeatmap distribution={dist} symbol={symbol} />
      </div>

      {log.length > 0 && (
        <div className="card bulk-log">
          <h4>Execution log</h4>
          <ul>{log.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}

      <RealTradeConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setRealTradeConfirmation();
          executeBulk();
        }}
      />
    </div>
  );
}
