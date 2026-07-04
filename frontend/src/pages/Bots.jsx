import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { createStrategyRunner, BOT_PRESETS } from '../lib/strategyRunner';
import { DEFAULT_DURATION } from '../lib/tradeDurations';

export default function Bots() {
  const { user } = useAuth();
  const { selectedSymbol } = useMarket();
  const accountId = user?.selectedAccountId;
  const { connected, getProposal, buyContract } = useTradingWs();

  const [config, setConfig] = useState(BOT_PRESETS[0].config);
  const [name, setName] = useState('My bot');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pl: 0, trades: 0 });
  const [running, setRunning] = useState(false);
  const runnerRef = useRef(null);

  useEffect(() => {
    runnerRef.current = createStrategyRunner({
      onProposal: (p) =>
        getProposal({
          ...p,
          contractType: 'CALL',
          symbol: selectedSymbol,
          duration: DEFAULT_DURATION.value,
          durationUnit: DEFAULT_DURATION.unit,
          currency: 'USD',
        }),
      onBuy: buyContract,
      onLog: (entry) => setLogs((prev) => [entry, ...prev].slice(0, 50)),
    });
  }, [getProposal, buyContract, selectedSymbol]);

  useEffect(() => {
    if (!running || !connected) return;
    const interval = setInterval(async () => {
      await runnerRef.current?.tick({});
      setStats(runnerRef.current?.getStats() || stats);
      if (!runnerRef.current?.isRunning()) setRunning(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [running, connected, stats]);

  const start = () => {
    runnerRef.current?.start(config);
    setRunning(true);
  };

  const stop = () => {
    runnerRef.current?.stop();
    setRunning(false);
  };

  const saveConfig = async () => {
    await api.saveBotConfig({ name, config, symbol: selectedSymbol });
    setLogs((prev) => [{ ts: Date.now(), msg: 'Config saved' }, ...prev]);
  };

  const loadPresets = (preset) => {
    setConfig(preset.config);
    setName(preset.name);
  };

  return (
    <div className="bots-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Apex Bot Studio</h1>
        <p className="text-secondary">Automated stake management with TP/SL and optional martingale.</p>
      </div>

      <div className="bots-grid">
        <div className="card bot-config">
          <h3 className="heading-md">Configuration</h3>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} className="trade-input" /></label>
          <label>Base stake<input type="number" value={config.baseStake} onChange={(e) => setConfig({ ...config, baseStake: Number(e.target.value) })} /></label>
          <label>Take profit $<input type="number" value={config.takeProfit} onChange={(e) => setConfig({ ...config, takeProfit: Number(e.target.value) })} /></label>
          <label>Stop loss $<input type="number" value={config.stopLoss} onChange={(e) => setConfig({ ...config, stopLoss: Number(e.target.value) })} /></label>
          <label>
            <input type="checkbox" checked={config.useMartingale} onChange={(e) => setConfig({ ...config, useMartingale: e.target.checked })} />
            Martingale (×{config.multiplier})
          </label>
          <div className="bot-actions">
            <button type="button" className="btn btn-primary" disabled={!connected || running} onClick={start}>Start</button>
            <button type="button" className="btn btn-secondary" onClick={stop}>Stop</button>
            <button type="button" className="btn btn-secondary" onClick={saveConfig}>Save</button>
          </div>
          <div className="preset-row">
            {BOT_PRESETS.map((p) => (
              <button key={p.id} type="button" className="preset-btn" onClick={() => loadPresets(p)}>{p.name}</button>
            ))}
          </div>
        </div>

        <div className="card bot-stats">
          <h3 className="heading-md">Live performance</h3>
          <ul className="bot-stat-list">
            <li><span>P/L</span><strong>{stats.pl.toFixed(2)}</strong></li>
            <li><span>Trades</span><strong>{stats.trades}</strong></li>
            <li><span>Wins</span><strong>{stats.wins}</strong></li>
            <li><span>Losses</span><strong>{stats.losses}</strong></li>
            <li><span>Win rate</span><strong>{stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(0) : 0}%</strong></li>
          </ul>
        </div>
      </div>

      <div className="card bot-log">
        <h3 className="heading-md">Activity</h3>
        <ul>{logs.map((l, i) => <li key={i}>{new Date(l.ts).toLocaleTimeString()} — {l.msg}</li>)}</ul>
      </div>
    </div>
  );
}
