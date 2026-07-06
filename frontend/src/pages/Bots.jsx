import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Play, Square, Save, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { createStrategyRunner, BOT_PRESETS } from '../lib/strategyRunner';
import { DEFAULT_DURATION } from '../lib/tradeDurations';
import { useBotConfigs, useSaveBotConfig, useDeleteBotConfig } from '../hooks/queries';
import { useActiveSymbols, useRealtimePrices } from '../hooks/useActiveSymbols';
import { filterVolatilitySymbols } from '../lib/symbolGroups';

export default function Bots() {
  const { user } = useAuth();
  const { selectedSymbol } = useMarket();
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);
  const { connected, getProposal, buyContract, error } = useTradingWs();
  const { sessionPl, wins, losses, winRate, recordTrade } = useTradeSession();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { symbols } = useActiveSymbols();

  const [config, setConfig] = useState(BOT_PRESETS[1].config);
  const [name, setName] = useState('Apex Bot');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pl: 0, trades: 0 });
  const [running, setRunning] = useState(false);
  const [lastTick, setLastTick] = useState(null);
  const runnerRef = useRef(null);

  const savedConfigs = useBotConfigs();
  const saveMutation = useSaveBotConfig();
  const deleteMutation = useDeleteBotConfig();

  const marketSymbols = useMemo(
    () => filterVolatilitySymbols(symbols).slice(0, 10).map((s) => s.symbol),
    [symbols],
  );
  const { prices } = useRealtimePrices(marketSymbols);

  useEffect(() => {
    const latest = Object.values(prices).find((p) => p?.epoch);
    if (latest?.epoch) {
      setLastTick(new Date(latest.epoch * 1000).toISOString().slice(11, 19));
    }
  }, [prices]);

  useEffect(() => {
    runnerRef.current = createStrategyRunner({
      onProposal: (p) =>
        getProposal({
          ...p,
          contractType: p.contractType || config.contractType || 'CALL',
          symbol: selectedSymbol,
          duration: config.durationTicks || DEFAULT_DURATION.value,
          durationUnit: config.durationTicks ? 't' : DEFAULT_DURATION.unit,
          currency: selectedAccount?.currency || 'USD',
        }),
      onBuy: buyContract,
      onLog: (entry) => setLogs((prev) => [entry, ...prev].slice(0, 100)),
    });
  }, [getProposal, buyContract, selectedSymbol, selectedAccount, config]);

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
    recordTrade({ message: 'Bot started', type: 'bot' });
    toast.success('Bot started', { description: `${name} on ${selectedSymbol}` });
  };

  const stop = () => {
    runnerRef.current?.stop();
    setRunning(false);
    toast.info('Bot stopped manually');
  };

  useEffect(() => {
    setRunHandler(running ? stop : start, running ? 'Stop Bot' : 'Start Bot');
    return () => clearRunHandler();
  }, [running, config, name]);

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
        <h1 className="heading-lg">Apex Bot</h1>
        <p className="text-secondary">Automated trading with live market subscriptions.</p>
      </div>

      <div className="apex-stats-row">
        <div className="card apex-stat"><span>Total P/L</span><strong className={sessionPl >= 0 ? 'profit' : 'loss'}>{sessionPl >= 0 ? '+' : ''}{sessionPl.toFixed(2)}</strong></div>
        <div className="card apex-stat"><span>Won</span><strong className="profit">{wins}</strong></div>
        <div className="card apex-stat"><span>Lost</span><strong className="loss">{losses}</strong></div>
        <div className="card apex-stat"><span>Win Rate</span><strong>{winRate}%</strong></div>
      </div>

      <button type="button" className="btn btn-primary apex-start-btn" disabled={!connected} onClick={running ? stop : start}>
        {running ? <><Square size={16} /> STOP BOT</> : <><Play size={16} /> START BOT</>}
      </button>

      {error && (
        <div className="auth-error-banner bot-error-banner">Last Error: {error}</div>
      )}

      <div className="bots-grid">
        <div className="card bot-config">
          <h3 className="heading-md">Risk Controls</h3>
          <div className="bot-form">
            <label>Bot Name
              <input value={name} onChange={(e) => setName(e.target.value)} className="trade-input" />
            </label>
            <label>Stake ($)
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

          <div className="bot-presets">
            <Link to="/bots/free" className="btn btn-ghost btn-sm">Free Bots gallery</Link>
            <Link to="/bots/ai" className="btn btn-ghost btn-sm">AI signal presets</Link>
          </div>

          {savedConfigs.data?.configs?.length > 0 && (
            <div className="bot-presets">
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Saved</span>
              <div className="saved-configs">
                {savedConfigs.data.configs.map((s) => (
                  <div key={s.id} className="saved-config-item">
                    <button type="button" className="preset-btn" onClick={() => loadSaved(s)}>{s.name}</button>
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
          <h3 className="heading-md">Session Stats</h3>
          <div className="bot-stat-grid">
            <div className="bot-stat-item">
              <span className="summary-label">Bot P/L</span>
              <span className={`summary-value mono ${stats.pl >= 0 ? 'profit' : 'loss'}`}>{stats.pl >= 0 ? '+' : ''}{stats.pl.toFixed(2)}</span>
            </div>
            <div className="bot-stat-item">
              <span className="summary-label">Trades</span>
              <span className="summary-value">{stats.trades}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card active-markets-panel">
        <div className="active-markets-header">
          <h3 className="heading-md">Active Markets ({marketSymbols.length}/10)</h3>
          <span className="live-badge">Live</span>
          {lastTick && <span className="text-muted mono">Last tick {lastTick}</span>}
        </div>
        <div className="active-markets-grid">
          {marketSymbols.map((sym) => {
            const p = prices[sym];
            return (
              <div key={sym} className="active-market-cell" data-tick={p?.dir}>
                <span className="mono">{sym}</span>
                <strong>{p?.quote?.toFixed(2) ?? '…'}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card bot-log">
        <div className="bot-log-header">
          <h3 className="heading-md">Trade History</h3>
          {logs.length > 0 && (
            <button type="button" className="btn-ghost btn-xs" onClick={() => setLogs([])}>
              <RefreshCw size={12} /> Clear
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <p className="text-muted">Trades will appear here after the bot buys a contract.</p>
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
