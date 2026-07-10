import { useEffect, useRef, useState, useCallback } from 'react';
import MarketPicker from '../components/MarketPicker';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import { useMarket } from '../context/MarketContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useTradingWs } from '../context/TradingWsContext';
import { useAuth } from '../hooks/useAuth';
import { useTradeSession } from '../context/TradeSessionContext';
import { evaluateAutomatedRule, createAutomatedRunner } from '../lib/strategyRunner';
import { useTradingFooter } from '../context/TradingFooterContext';

function RuleCard({ title, children, onStart, onStop, running, status }) {
  return (
    <div className="automated-card card">
      <div className="automated-card-header">
        <h3>{title}</h3>
        <span className={`automated-status ${running ? 'live' : ''}`}>{status || (running ? 'Running' : 'Waiting…')}</span>
      </div>
      {children}
      <div className="automated-actions">
        {!running ? (
          <button type="button" className="btn btn-buy" onClick={onStart}>Start Auto Trade</button>
        ) : (
          <button type="button" className="btn btn-danger" onClick={onStop}>Stop</button>
        )}
      </div>
    </div>
  );
}

export default function Automated() {
  const { selectedSymbol, selectSymbol } = useMarket();
  const { user } = useAuth();
  const { connected, getProposal, buyContract } = useTradingWs();
  const stream = useDigitStream(selectedSymbol);
  const { recordTrade } = useTradeSession();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);

  const [evenRule, setEvenRule] = useState({ threshold: 60, side: 'DIGITEVEN', ticks: 1, stake: 0.5, martingale: 1.2 });
  const [ouRule, setOuRule] = useState({ lookback: 3, compareDigit: 5, side: 'DIGITOVER', prediction: 4, ticks: 1, stake: 0.5, martingale: 1.2 });
  const [runningEven, setRunningEven] = useState(false);
  const [runningOu, setRunningOu] = useState(false);
  const evenRunner = useRef(null);
  const ouRunner = useRef(null);

  useEffect(() => {
    evenRunner.current = createAutomatedRunner({
      getProposal,
      buyContract,
      onTrade: () => recordTrade({ message: 'Contract bought', type: 'automated-even' }),
    });
    ouRunner.current = createAutomatedRunner({
      getProposal,
      buyContract,
      onTrade: () => recordTrade({ message: 'Contract bought', type: 'automated-ou' }),
    });
  }, [getProposal, buyContract, recordTrade]);

  useEffect(() => {
    if (!runningEven || !connected) return;
    const t = setInterval(async () => {
      const ok = evaluateAutomatedRule('even_pct', evenRule, stream);
      if (!ok) return;
      await evenRunner.current?.execute({
        symbol: selectedSymbol,
        contractType: evenRule.side,
        stake: evenRule.stake,
        ticks: evenRule.ticks,
        currency: account?.currency || 'USD',
      });
    }, 4000);
    return () => clearInterval(t);
  }, [runningEven, connected, evenRule, stream, selectedSymbol, account]);

  useEffect(() => {
    if (!runningOu || !connected) return;
    const t = setInterval(async () => {
      const ok = evaluateAutomatedRule('over_under_digits', ouRule, stream);
      if (!ok) return;
      await ouRunner.current?.execute({
        symbol: selectedSymbol,
        contractType: ouRule.side,
        stake: ouRule.stake,
        ticks: ouRule.ticks,
        barrier: ouRule.prediction,
        currency: account?.currency || 'USD',
      });
    }, 4000);
    return () => clearInterval(t);
  }, [runningOu, connected, ouRule, stream, selectedSymbol, account]);

  const anyRunning = runningEven || runningOu;
  const toggleAll = useCallback(() => {
    if (anyRunning) {
      setRunningEven(false);
      setRunningOu(false);
    } else {
      setRunningEven(true);
    }
  }, [anyRunning]);

  useEffect(() => {
    setRunHandler(toggleAll, anyRunning ? 'Stop Rules' : 'Start Even Rule');
    return () => clearRunHandler();
  }, [toggleAll, anyRunning, setRunHandler, clearRunHandler]);

  return (
    <div className="automated-page">
      <WorkspacePageHeader
        title="Rules"
        subtitle="Conditional digit rules with live market data — even% and digit streak triggers."
      />

      <div className="automated-grid">
        <RuleCard
          title="Even/Odd (Percentages)"
          running={runningEven}
          status={`Even: ${stream.evenPct.toFixed(1)}% / Odd: ${stream.oddPct.toFixed(1)}%`}
          onStart={() => setRunningEven(true)}
          onStop={() => setRunningEven(false)}
        >
          <MarketPicker symbol={selectedSymbol} onSelect={selectSymbol} />
          <div className="automated-rule-row">
            <span>If Even%</span>
            <select value="gte" disabled><option>&gt;=</option></select>
            <input type="number" value={evenRule.threshold} onChange={(e) => setEvenRule({ ...evenRule, threshold: Number(e.target.value) })} />
            <span>% then trade</span>
            <select value={evenRule.side} onChange={(e) => setEvenRule({ ...evenRule, side: e.target.value })}>
              <option value="DIGITEVEN">Even</option>
              <option value="DIGITODD">Odd</option>
            </select>
          </div>
          <div className="automated-params">
            <label>Ticks <input type="number" value={evenRule.ticks} onChange={(e) => setEvenRule({ ...evenRule, ticks: Number(e.target.value) })} /></label>
            <label>Stake <input type="number" value={evenRule.stake} onChange={(e) => setEvenRule({ ...evenRule, stake: Number(e.target.value) })} /></label>
            <label>Martingale <input type="number" step={0.1} value={evenRule.martingale} onChange={(e) => setEvenRule({ ...evenRule, martingale: Number(e.target.value) })} /></label>
          </div>
        </RuleCard>

        <RuleCard
          title="Over/Under (Digits)"
          running={runningOu}
          status={`Last digits: ${(stream.digitHistory || []).slice(-5).join(' ') || '—'}`}
          onStart={() => setRunningOu(true)}
          onStop={() => setRunningOu(false)}
        >
          <MarketPicker symbol={selectedSymbol} onSelect={selectSymbol} />
          <div className="digit-picker-row">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button key={d} type="button" className={`digit-pick ${ouRule.compareDigit === d ? 'active' : ''}`} onClick={() => setOuRule({ ...ouRule, compareDigit: d })}>{d}</button>
            ))}
          </div>
          <div className="automated-rule-row">
            <span>Last</span>
            <input type="number" min={1} max={10} value={ouRule.lookback} onChange={(e) => setOuRule({ ...ouRule, lookback: Number(e.target.value) })} />
            <span>digits &gt; {ouRule.compareDigit} → trade</span>
            <select value={ouRule.side} onChange={(e) => setOuRule({ ...ouRule, side: e.target.value })}>
              <option value="DIGITOVER">Over</option>
              <option value="DIGITUNDER">Under</option>
            </select>
            <input type="number" min={0} max={9} value={ouRule.prediction} onChange={(e) => setOuRule({ ...ouRule, prediction: Number(e.target.value) })} />
          </div>
          <div className="automated-params">
            <label>Ticks <input type="number" value={ouRule.ticks} onChange={(e) => setOuRule({ ...ouRule, ticks: Number(e.target.value) })} /></label>
            <label>Stake <input type="number" value={ouRule.stake} onChange={(e) => setOuRule({ ...ouRule, stake: Number(e.target.value) })} /></label>
            <label>Martingale <input type="number" step={0.1} value={ouRule.martingale} onChange={(e) => setOuRule({ ...ouRule, martingale: Number(e.target.value) })} /></label>
          </div>
        </RuleCard>
      </div>
    </div>
  );
}
