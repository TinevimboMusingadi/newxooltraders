import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Play,
  Square,
  Save,
  Trash2,
  Radar,
  Sparkles,
  LayoutGrid,
  Workflow,
  Hammer,
  Copy,
  Sun,
  LineChart,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { createStrategyRunner, BOT_PRESETS, DIGIT_MATCH_V25_PRESET, computeSwingLevels } from '../lib/strategyRunner';
import { DEFAULT_DURATION } from '../lib/tradeDurations';
import { useBotConfigs, useSaveBotConfig, useDeleteBotConfig } from '../hooks/queries';
import { useActiveSymbols, useRealtimePrices } from '../hooks/useActiveSymbols';
import { useDigitStream } from '../hooks/useDigitStream';
import { filterVolatilitySymbols } from '../lib/symbolGroups';
import { api } from '../lib/api';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import BotTradeChat, { pushChatMessage } from '../components/BotTradeChat';
import { persistBotRun } from '../lib/botRunSession';
import { useBotDesk } from '../context/BotDeskContext';

const HUB_LINKS = [
  { to: '/scanner', label: 'Analysis Lab', icon: Radar, desc: 'Live digit boards & probability' },
  { to: '/bots/free', label: 'Free Strategies', icon: LayoutGrid, desc: 'Exact Deriv + signal presets' },
  { to: '/bots/run', label: 'Bot Trading View', icon: LineChart, desc: 'Chart, positions & trade chat' },
  { to: '/bots/ai', label: 'Signal Lab', icon: Sparkles, desc: 'Ranked live signals' },
  { to: '/speedbot', label: 'Speedbot', icon: Sun, desc: 'Fast even/odd parity' },
  { to: '/automated', label: 'Rules', icon: Workflow, desc: 'Threshold automation' },
  { to: '/builder', label: 'Builder', icon: Hammer, desc: 'Blockly strategies' },
  { to: '/copy', label: 'Copy', icon: Copy, desc: 'Copy trading' },
];

export default function Bots() {
  const { user } = useAuth();
  const { selectedSymbol, selectSymbol } = useMarket();
  const navigate = useNavigate();
  const { loadBot } = useBotDesk();
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);
  const { connected, getProposal, buyContract, error } = useTradingWs();
  const { sessionPl, wins, losses, winRate, recordTrade } = useTradeSession();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { symbols } = useActiveSymbols();
  const digitStream = useDigitStream(selectedSymbol);

  const [config, setConfig] = useState({ ...BOT_PRESETS.find((p) => p.id === 'apex-martingale')?.config, intervalMode: false });
  const [name, setName] = useState('Apex Bot');
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pl: 0, trades: 0 });
  const [running, setRunning] = useState(false);
  const [lastTick, setLastTick] = useState(null);
  const [nativeStrategies, setNativeStrategies] = useState(null);
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
    api.getAutomationStrategies()
      .then((d) => {
        const list = d?.strategies || d?.auto_list_strategies?.strategies || [];
        setNativeStrategies(Array.isArray(list) ? list : []);
      })
      .catch(() => setNativeStrategies([]));
  }, []);

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
      onLog: (entry) => pushChatMessage(setMessages, entry.msg, 'bot'),
    });
  }, [getProposal, buyContract, selectedSymbol, selectedAccount, config]);

  const buildSignal = useCallback(() => {
    const levels = computeSwingLevels(digitStream.quoteHistory || [], config.srLookback || 50);
    return {
      snapshot: {
        ...digitStream,
        swingHigh: levels.swingHigh,
        swingLow: levels.swingLow,
        quote: digitStream.quote,
      },
      contractType: config.contractType,
    };
  }, [digitStream, config]);

  useEffect(() => {
    if (!running || !connected) return;
    const interval = setInterval(async () => {
      const signal = config.intervalMode ? { force: true } : buildSignal();
      await runnerRef.current?.tick(signal);
      setStats(runnerRef.current?.getStats() || stats);
      if (!runnerRef.current?.isRunning()) {
        setRunning(false);
        toast.info('Bot stopped');
      }
    }, config.intervalMode ? 5000 : 2000);
    return () => clearInterval(interval);
  }, [running, connected, config, buildSignal, stats]);

  const start = useCallback(() => {
    runnerRef.current?.start(config);
    setRunning(true);
    recordTrade({ message: 'Bot started', type: 'bot', persist: false });
    toast.success('Bot started', { description: `${name} on ${selectedSymbol}` });
  }, [config, name, selectedSymbol, recordTrade]);

  const stop = useCallback(() => {
    runnerRef.current?.stop();
    setRunning(false);
    toast.info('Bot stopped manually');
  }, []);

  useEffect(() => {
    setRunHandler(running ? stop : start, running ? 'Stop Bot' : 'Start Bot');
    return () => clearRunHandler();
  }, [running, start, stop, setRunHandler, clearRunHandler]);

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

  const openBotTradingView = () => {
    const exact = name === DIGIT_MATCH_V25_PRESET.name || config.tradeKind === 'digit_match_differ';
    const payload = {
      name,
      config: exact
        ? { ...DIGIT_MATCH_V25_PRESET.config, ...config, symbol: config.symbol || selectedSymbol }
        : {
            ...config,
            symbol: selectedSymbol,
            winAmount: config.baseStake,
            martingale: config.multiplier,
            marketLabel: selectedSymbol,
            tradeTypeLabel: config.contractType || 'Rise/Fall',
          },
      presetId: exact ? DIGIT_MATCH_V25_PRESET.id : 'apex',
    };
    if (payload.config.symbol) selectSymbol(payload.config.symbol);
    persistBotRun(payload);
    loadBot(payload);
    navigate('/bots/run', { state: payload });
  };

  const loadSaved = (saved) => {
    setConfig(typeof saved.config === 'string' ? JSON.parse(saved.config) : saved.config);
    setName(saved.name);
  };

  return (
    <div className="bots-page automation-hub-page">
      <WorkspacePageHeader
        title="Automation Hub"
        subtitle="Signal-driven bots on live Deriv data — start Apex below or jump to a tool."
      />

      <div className="automation-hub-grid">
        {HUB_LINKS.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to} className="card automation-hub-card">
            <Icon size={22} className="automation-hub-icon" />
            <h3>{label}</h3>
            <p className="text-muted">{desc}</p>
          </Link>
        ))}
      </div>

      {nativeStrategies && nativeStrategies.length > 0 && (
        <div className="card automation-native-section">
          <h3 className="heading-md">Deriv native strategies</h3>
          <p className="text-muted">Available on your account via Deriv automation API.</p>
          <ul className="automation-native-list">
            {nativeStrategies.slice(0, 6).map((s) => (
              <li key={s.id || s.strategy_id}>{s.name || s.title || s.id}</li>
            ))}
          </ul>
        </div>
      )}

      {nativeStrategies && nativeStrategies.length === 0 && (
        <p className="text-muted automation-native-empty">Deriv native automation not available on this account.</p>
      )}

      <div className="automation-apex-section">
        <h2 className="heading-md">Apex Bot</h2>
        <p className="text-secondary">Runs on {selectedSymbol} — signal mode waits for live stats; interval mode trades on a timer (labeled honestly).</p>
      </div>

      <div className="apex-stats-row">
        <div className="card apex-stat"><span>Total P/L</span><strong className={sessionPl >= 0 ? 'profit' : 'loss'}>{sessionPl >= 0 ? '+' : ''}{sessionPl.toFixed(2)}</strong></div>
        <div className="card apex-stat"><span>Won</span><strong className="profit">{wins}</strong></div>
        <div className="card apex-stat"><span>Lost</span><strong className="loss">{losses}</strong></div>
        <div className="card apex-stat"><span>Win Rate</span><strong>{winRate}%</strong></div>
      </div>

      <div className="apex-actions-row">
        <button type="button" className="btn btn-primary btn-sm apex-ctrl-btn" disabled={!connected} onClick={running ? stop : start}>
          {running ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start bot</>}
        </button>
        <button type="button" className="btn btn-secondary btn-sm apex-ctrl-btn" onClick={openBotTradingView}>
          <LineChart size={14} /> Open bot view
        </button>
      </div>

      {error && <div className="auth-error-banner bot-error-banner">Last Error: {error}</div>}

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
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!config.intervalMode}
                onChange={(e) => setConfig({ ...config, intervalMode: e.target.checked })}
              />
              Interval mode (timed trades — no signal required)
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
            <div className="bot-stat-item">
              <span className="summary-label">Live even%</span>
              <span className="summary-value">{digitStream.evenPct.toFixed(1)}%</span>
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

      <BotTradeChat
        running={running}
        messages={messages}
        onClear={() => setMessages([])}
        className="hub-bot-chat"
      />
    </div>
  );
}
