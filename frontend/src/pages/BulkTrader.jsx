import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import MarketPicker from '../components/MarketPicker';
import EvenOddStrip, { DigitCircles } from '../components/EvenOddStrip';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useContractsFor } from '../hooks/useContractsFor';
import { useTradingFooter } from '../context/TradingFooterContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { scanMarkets, rankSignals } from '../lib/digitsEngine';
import { filterVolatilitySymbols } from '../lib/symbolGroups';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import {
  hasRealTradeConfirmation,
  isDemoAccount,
  setRealTradeConfirmation,
} from '../lib/accountDisplay';
import { sanitizeSymbol } from '../lib/symbolUtils';

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
  const symbol = sanitizeSymbol(params.get('symbol') || selectedSymbol);
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);

  const [stake, setStake] = useState(0.5);
  const [ticks, setTicks] = useState(1);
  const [count, setCount] = useState(1);
  const [contractType, setContractType] = useState(params.get('type') || 'DIGITEVEN');
  const [barrier, setBarrier] = useState(Number(params.get('barrier') || 5));
  const [lookback, setLookback] = useState(1000);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scanning, setScanning] = useState(false);

  const { connected, queueBulkTrades } = useTradingWs();
  const { quote, distribution, evenOddHistory } = useDigitStream(symbol);
  const { allowedDurations, defaultDuration } = useContractsFor(symbol, [contractType]);
  const duration = allowedDurations.find((d) => d.unit === 't') || defaultDuration;
  const { symbols } = useActiveSymbols();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { recordTrade } = useTradeSession();

  const buildTrades = useCallback(() => {
    const trades = [];
    for (let i = 0; i < count; i += 1) {
      trades.push({
        contractType,
        amount: stake,
        duration: ticks,
        durationUnit: 't',
        symbol,
        currency: selectedAccount?.currency || 'USD',
        ...(contractType.includes('DIGIT') && contractType !== 'DIGITEVEN' && contractType !== 'DIGITODD'
          ? { barrier }
          : {}),
      });
    }
    return trades;
  }, [count, contractType, stake, symbol, selectedAccount, barrier, ticks]);

  const executeBulk = useCallback(async (typeOverride) => {
    const ct = typeOverride || contractType;
    setRunning(true);
    setLog([]);
    try {
      const trades = buildTrades().map((t) => ({ ...t, contractType: ct }));
      const results = await queueBulkTrades(trades, { delayMs: 800, maxConcurrent: 2 });
      setLog(results.map((r, i) => `#${i + 1} contract ${r.buy?.contract_id || 'ok'}`));
      recordTrade({ message: 'Contract bought', type: 'bulk', symbol, contractType: ct });
    } catch (err) {
      setLog([`Error: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }, [buildTrades, contractType, queueBulkTrades, recordTrade, symbol]);

  const handleRun = useCallback((typeOverride) => {
    if (selectedAccount && !isDemoAccount(selectedAccount) && !hasRealTradeConfirmation()) {
      setShowConfirm(true);
      return;
    }
    executeBulk(typeOverride);
  }, [selectedAccount, executeBulk]);

  useEffect(() => {
    setRunHandler(() => handleRun(), 'Run Bulk');
    return () => clearRunHandler();
  }, [handleRun, setRunHandler, clearRunHandler]);

  const runAiScanner = async () => {
    setScanning(true);
    try {
      const vol = filterVolatilitySymbols(symbols).map((s) => s.symbol).slice(0, 8);
      const results = await scanMarkets(vol, { depth: lookback, pattern: 'O1U8' });
      const best = rankSignals(results, 50)[0];
      if (best) {
        selectSymbol(best.symbol);
        setContractType(best.analysis.direction);
        setBarrier(best.analysis.barrier);
      }
    } finally {
      setScanning(false);
    }
  };

  const needsBarrier = contractType === 'DIGITOVER' || contractType === 'DIGITUNDER';
  const liveDist = distribution;

  return (
    <div className="bulk-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Bulk Trader</h1>
        <p className="text-secondary">Live digit analysis with even/odd bulk execution.</p>
      </div>

      <div className="bulk-toolbar card">
        <MarketPicker symbol={symbol} onSelect={selectSymbol} />
        <label>
          Trade type
          <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
            {CONTRACT_TYPES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label>
          Lookback ticks
          <input type="number" min={100} max={5000} value={lookback} onChange={(e) => setLookback(Number(e.target.value))} />
        </label>
        <button type="button" className="btn btn-secondary ai-scanner-btn" disabled={scanning} onClick={runAiScanner}>
          <Cpu size={14} /> {scanning ? 'Scanning…' : 'AI Scanner'}
        </button>
      </div>

      <div className="bulk-tick-display card">
        <span className="text-muted">Current tick</span>
        <strong className="bulk-tick-value mono">{quote != null ? quote.toFixed(2) : '—'}</strong>
      </div>

      <DigitCircles distribution={liveDist} />
      <EvenOddStrip history={evenOddHistory} />

      <div className="bulk-bottom card">
        <label>Ticks <input type="number" min={1} max={10} value={ticks} onChange={(e) => setTicks(Number(e.target.value))} /></label>
        <label>Stake <input type="number" min={0.35} step={0.5} value={stake} onChange={(e) => setStake(Number(e.target.value))} /></label>
        <label>Bulk count <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
        {needsBarrier && (
          <label>Barrier <input type="number" min={0} max={9} value={barrier} onChange={(e) => setBarrier(Number(e.target.value))} /></label>
        )}
      </div>

      <div className="bulk-action-row">
        <button type="button" className="btn btn-buy bulk-action-even" disabled={!connected || running} onClick={() => handleRun('DIGITEVEN')}>
          Even
        </button>
        <button type="button" className="btn btn-sell bulk-action-odd" disabled={!connected || running} onClick={() => handleRun('DIGITODD')}>
          Odd
        </button>
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
