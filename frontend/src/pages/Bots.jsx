import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Play, Square, Save, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { createStrategyRunner, BOT_PRESETS } from '../lib/strategyRunner';
import { DEFAULT_DURATION } from '../lib/tradeDurations';
import { useBotConfigs, useSaveBotConfig, useDeleteBotConfig } from '../hooks/queries';

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

  const savedConfigs = useBotConfigs();
  const saveMutation = useSaveBotConfig();
  const deleteMutation = useDeleteBotConfig();

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
      onLog: (entry) => setLogs((prev) => [entry, ...prev].slice(0, 100)),
    });
  }, [getProposal, buyContract, selectedSymbol]);

  useEffect(() => {
    if (!running || !connected) return;
    const interval = setInterval(async () => {
      await runnerRef.current?.tick({});
      setStats(runnerRef.current?.getStats() || stats);
      if (!runnerRef.current?.isRunning()) {
        setRunning(false);
        toast.info('Bot stopped');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [running, connected, stats]);

  const start = () => {
    runnerRef.current?.start(config);
    setRunning(true);
    toast.success('Bot started', { description: `${name} on ${selectedSymbol}` });
  };

  const stop = () => {
    runnerRef.current?.stop();
    setRunning(false);
    toast.info('Bot stopped manually');
  };

  const saveConfig = () => {
    saveMutation.mutate(
      { name, config, symbol: selectedSymbol },
      {
        onSuccess: () => toast.success('Config saved'),
        onError: (e) => toast.error('Save failed', { description: e.message }),
      },
    );
  };

  const loadPresets = (preset) => {
    setConfig(preset.config);
    setName(preset.name);
  };

  const loadSaved = (saved) => {
    setConfig(typeof saved.config === 'string' ? JSON.parse(saved.config) : saved.config);
    setName(saved.name);
  };

  return (
    <div className="bots-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Apex Bot Studio</h1>
        <p className="text-secondary">Automated trading with TP/SL, martingale, and strategy presets.</p>
      </div>

      <div className="bots-grid">
        <div className="card bot-config">
          <h3 className="heading-md">Configuration</h3>
          <div className="bot-form">
            <label>Bot Name
              <input value={name} onChange={(e) => setName(e.target.value)} className="trade-input" />
            </label>
            <label>Base Stake ($)
              <input type="number" min={0.35} step={0.5} value={config.baseStake} onChange={(e) => setConfig({ ...config, baseStake: Number(e.target.value) })} className="trade-input" />
            </label>
            <label>Take Profit ($)
              <input type="number" value={config.takeProfit} onChange={(e) => setConfig({ ...config, takeProfit: Number(e.target.value) })} className="trade-input" />
            </label>
            <label>Stop Loss ($)
              <input type="number" value={config.stopLoss} onChange={(e) => setConfig({ ...config, stopLoss: Number(e.target.value) })} className="trade-input" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={config.useMartingale} onChange={(e) => setConfig({ ...config, useMartingale: e.target.checked })} />
              Martingale (x{config.multiplier || 2})
            </label>
          </div>

          <div className="bot-actions">
            {!running ? (
              <button type="button" className="btn btn-primary" disabled={!connected} onClick={start}>
                <Play size={14} /> Start
              </button>
            ) : (
              <button type="button" className="btn btn-danger" onClick={stop}>
                <Square size={14} /> Stop
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={saveConfig}>
              <Save size={14} /> Save
            </button>
          </div>

          <div className="bot-presets">
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Presets</span>
            <div className="preset-row">
              {BOT_PRESETS.map((p) => (
                <button key={p.id} type="button" className="preset-btn" onClick={() => loadPresets(p)}>{p.name}</button>
              ))}
            </div>
          </div>

          {savedConfigs.data?.configs?.length > 0 && (
            <div className="bot-presets">
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Saved</span>
              <div className="saved-configs">
                {savedConfigs.data.configs.map((s) => (
                  <div key={s.id} className="saved-config-item">
                    <button type="button" className="preset-btn" onClick={() => loadSaved(s)}>
                      {s.name}
                    </button>
                    <button type="button" className="btn-ghost btn-xs" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card bot-stats">
          <h3 className="heading-md">Live Performance</h3>
          <div className="bot-stat-grid">
            <div className="bot-stat-item">
              <span className="summary-label">P/L</span>
              <span className={`summary-value mono ${stats.pl >= 0 ? 'profit' : 'loss'}`}>
                {stats.pl >= 0 ? '+' : ''}{stats.pl.toFixed(2)}
              </span>
            </div>
            <div className="bot-stat-item">
              <span className="summary-label">Trades</span>
              <span className="summary-value">{stats.trades}</span>
            </div>
            <div className="bot-stat-item">
              <span className="summary-label">Wins</span>
              <span className="summary-value profit">{stats.wins}</span>
            </div>
            <div className="bot-stat-item">
              <span className="summary-label">Losses</span>
              <span className="summary-value loss">{stats.losses}</span>
            </div>
            <div className="bot-stat-item">
              <span className="summary-label">Win Rate</span>
              <span className="summary-value">{stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
          <div className="bot-status-indicator">
            <span className={`status-dot ${running ? 'online' : 'offline'}`} />
            <span>{running ? 'Running' : 'Stopped'}</span>
            <span className="text-muted">{selectedSymbol}</span>
          </div>
        </div>
      </div>

      <div className="card bot-log">
        <div className="bot-log-header">
          <h3 className="heading-md">Activity Log</h3>
          {logs.length > 0 && (
            <button type="button" className="btn-ghost btn-xs" onClick={() => setLogs([])}>
              <RefreshCw size={12} /> Clear
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <p className="text-muted">No activity yet. Start the bot to see trade logs.</p>
        ) : (
          <ul className="bot-log-list">
            {logs.map((l, i) => (
              <li key={i} className="bot-log-entry">
                <span className="mono text-muted">{new Date(l.ts).toLocaleTimeString()}</span>
                <span>{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
