import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FolderOpen, Play, Undo, Redo, Grid3x3, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { compileBlocklyXml, strategyToQuickXml } from '../lib/blockCompiler';
import { useMarket } from '../context/MarketContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { useAuth } from '../hooks/useAuth';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import BotTradeChat from '../components/BotTradeChat';
import { DIGIT_MATCH_V25_PRESET } from '../lib/strategyRunner';
import { persistBotRun } from '../lib/botRunSession';

const DEFAULT_PARAMS = {
  symbol: 'R_25',
  marketLabel: 'Synthetic Index › Random Index › Volatility 25 Index',
  tradeTypeLabel: 'Digits › Matches/Differs',
  contractTypeLabel: 'Both',
  contractSide: 'both',
  candleIntervalLabel: '1 minute',
  candleIntervalMin: 1,
  restartBuySellOnError: false,
  restartLastTradeOnError: true,
  winAmount: 1,
  stakeFromWinAmount: true,
  baseStake: 1,
  prediction: 9,
  takeProfit: 10000,
  stopLoss: 1000,
  martingale: 1,
  maxStakeFromWinAmount: true,
  maxStake: 1,
  useMartingale: true,
  multiplier: 1,
  durationTicks: 1,
  intervalMode: true,
  tradeKind: 'digit_match_differ',
  contractType: 'DIGITMATCH',
};

export default function Builder() {
  const blocklyDiv = useRef(null);
  const workspaceRef = useRef(null);
  const blocklyRef = useRef(null);
  const [strategies, setStrategies] = useState([]);
  const [name, setName] = useState('V25 Matches / Differs');
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [mobileTab, setMobileTab] = useState('params');
  const { selectedSymbol, selectSymbol } = useMarket();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { user } = useAuth();
  const navigate = useNavigate();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);

  const setField = (key, value) => setParams((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    let workspace;
    (async () => {
      const Blockly = await import('blockly');
      await import('blockly/blocks');
      const { defineTradingBlocks, registerTradingGenerators } = await import('../lib/blocklyBlocks');
      defineTradingBlocks(Blockly);
      registerTradingGenerators(Blockly);
      blocklyRef.current = Blockly;

      workspace = Blockly.inject(blocklyDiv.current, {
        toolbox: {
          kind: 'categoryToolbox',
          contents: [
            { kind: 'category', name: 'Trade parameters', colour: '#7c5cff', contents: [{ kind: 'block', type: 'trade_parameters' }] },
            { kind: 'category', name: 'Purchase', colour: '#22c55e', contents: [{ kind: 'block', type: 'purchase_condition' }] },
            { kind: 'category', name: 'Analysis', colour: '#f59e0b', contents: [{ kind: 'block', type: 'digit_even_check' }] },
          ],
        },
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        zoom: { controls: true, wheel: true },
      });
      workspaceRef.current = workspace;
      const xml = strategyToQuickXml(params);
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
    })();

    api.getBotStrategies?.().then((d) => setStrategies(d.strategies || [])).catch(() => {});

    return () => workspace?.dispose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inject once
  }, []);

  const syncBlocksFromParams = useCallback(async () => {
    const Blockly = blocklyRef.current || await import('blockly');
    const ws = workspaceRef.current;
    if (!ws) return;
    ws.clear();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(strategyToQuickXml(params)), ws);
  }, [params]);

  const undo = () => workspaceRef.current?.undo?.(false);
  const redo = () => workspaceRef.current?.undo?.(true);
  const zoomIn = () => workspaceRef.current?.zoomCenter?.(1);
  const zoomOut = () => workspaceRef.current?.zoomCenter?.(-1);

  const save = async () => {
    const Blockly = blocklyRef.current || await import('blockly');
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
    await api.saveBotStrategy({ name, symbol: params.symbol || selectedSymbol, xml, config: params });
    toast.success('Strategy saved');
  };

  const loadQuick = async () => {
    setParams({ ...DIGIT_MATCH_V25_PRESET.config });
    setName(DIGIT_MATCH_V25_PRESET.name);
    const Blockly = blocklyRef.current || await import('blockly');
    workspaceRef.current?.clear();
    Blockly.Xml.domToWorkspace(
      Blockly.utils.xml.textToDom(strategyToQuickXml(DIGIT_MATCH_V25_PRESET.config)),
      workspaceRef.current,
    );
    toast.success('Loaded exact V25 Matches/Differs params');
  };

  const openBotView = useCallback(async () => {
    let strategy = { ...params };
    try {
      const Blockly = blocklyRef.current || await import('blockly');
      if (workspaceRef.current) {
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
        const compiled = compileBlocklyXml(xml);
        strategy = {
          ...params,
          ...compiled,
          symbol: compiled.symbol || params.symbol,
          baseStake: compiled.amount ?? params.winAmount,
          winAmount: params.winAmount,
        };
      }
    } catch { /* use form params */ }

    if (strategy.symbol) selectSymbol(strategy.symbol);
    const payload = {
      name,
      config: {
        ...DIGIT_MATCH_V25_PRESET.config,
        ...strategy,
        tradeKind: strategy.tradeKind || 'digit_match_differ',
      },
      presetId: 'builder',
    };
    persistBotRun(payload);
    navigate('/bots/run', { state: payload });
  }, [params, name, navigate, selectSymbol]);

  useEffect(() => {
    setRunHandler(openBotView, 'Open Bot View');
    return () => clearRunHandler();
  }, [openBotView, setRunHandler, clearRunHandler]);

  return (
    <div className="builder-page">
      <WorkspacePageHeader
        title="Bot Builder"
        subtitle="Exact params + Blockly — Start opens the Bot Trading View with chart, positions, and chat."
      />

      <div className="builder-mobile-tabs" role="tablist">
        {[
          { id: 'params', label: 'Params' },
          { id: 'workspace', label: 'Workspace' },
          { id: 'chat', label: 'Chat' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`builder-tab ${mobileTab === t.id ? 'active' : ''}`}
            onClick={() => setMobileTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="builder-toolbar card">
        <button type="button" className="btn btn-primary btn-sm" onClick={loadQuick}>Quick Strategy</button>
        <input value={name} onChange={(e) => setName(e.target.value)} className="trade-input builder-name" placeholder="Strategy name" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={save}><Save size={14} /> Save</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={syncBlocksFromParams}>Sync blocks</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={openBotView}><Play size={14} /> Bot View</button>
        {account && <span className="text-muted mono builder-account">{account.currency}</span>}
      </div>

      <div className="builder-layout">
        <div className={`builder-params-pane card ${mobileTab === 'params' ? 'is-mobile-active' : ''}`}>
          <h3 className="heading-sm">Strategy parameters</h3>
          <div className="builder-param-fields">
            <label>
              Market / Symbol
              <input className="trade-input" value={params.symbol} onChange={(e) => setField('symbol', e.target.value)} />
            </label>
            <label>
              Trade type
              <input className="trade-input" value={params.tradeTypeLabel} onChange={(e) => setField('tradeTypeLabel', e.target.value)} />
            </label>
            <label>
              Contract type
              <select className="trade-input" value={params.contractSide} onChange={(e) => setField('contractSide', e.target.value)}>
                <option value="both">Both</option>
                <option value="match">Match</option>
                <option value="differ">Differ</option>
              </select>
            </label>
            <label>
              Candle interval
              <input className="trade-input" value={params.candleIntervalLabel} onChange={(e) => setField('candleIntervalLabel', e.target.value)} />
            </label>
            <label className="builder-check">
              <input type="checkbox" checked={!!params.restartBuySellOnError} onChange={(e) => setField('restartBuySellOnError', e.target.checked)} />
              Restart buy/sell on error
            </label>
            <label className="builder-check">
              <input type="checkbox" checked={!!params.restartLastTradeOnError} onChange={(e) => setField('restartLastTradeOnError', e.target.checked)} />
              Restart last trade on error
            </label>
            <label>
              Win amount
              <input type="number" className="trade-input" value={params.winAmount} onChange={(e) => setField('winAmount', Number(e.target.value))} />
            </label>
            <label>
              stake
              <input className="trade-input" value={params.stakeFromWinAmount ? 'Win amount' : params.baseStake} readOnly={params.stakeFromWinAmount} onChange={(e) => setField('baseStake', Number(e.target.value))} />
            </label>
            <label>
              prediction
              <input type="number" min={0} max={9} className="trade-input" value={params.prediction} onChange={(e) => setField('prediction', Number(e.target.value))} />
            </label>
            <label>
              Take profit
              <input type="number" className="trade-input" value={params.takeProfit} onChange={(e) => setField('takeProfit', Number(e.target.value))} />
            </label>
            <label>
              stop loss
              <input type="number" className="trade-input" value={params.stopLoss} onChange={(e) => setField('stopLoss', Number(e.target.value))} />
            </label>
            <label>
              Martingale
              <input type="number" step="0.1" className="trade-input" value={params.martingale} onChange={(e) => setField('martingale', Number(e.target.value))} />
            </label>
            <label>
              maxStake
              <input className="trade-input" value={params.maxStakeFromWinAmount ? 'Win amount' : params.maxStake} readOnly={params.maxStakeFromWinAmount} onChange={(e) => setField('maxStake', Number(e.target.value))} />
            </label>
          </div>
        </div>

        <div className={`builder-workspace card ${mobileTab === 'workspace' ? 'is-mobile-active' : ''}`}>
          <div className="builder-canvas-toolbar">
            <button type="button" className="builder-tool-btn" onClick={undo} title="Undo"><Undo size={16} /></button>
            <button type="button" className="builder-tool-btn" onClick={redo} title="Redo"><Redo size={16} /></button>
            <span className="builder-tool-sep"><Grid3x3 size={16} /></span>
            <button type="button" className="builder-tool-btn" onClick={zoomIn} title="Zoom in"><ZoomIn size={16} /></button>
            <button type="button" className="builder-tool-btn" onClick={zoomOut} title="Zoom out"><ZoomOut size={16} /></button>
            <button type="button" className="builder-tool-btn" onClick={loadQuick} title="Load template"><FolderOpen size={16} /></button>
          </div>
          <div ref={blocklyDiv} className="blockly-mount" />
        </div>

        <div className={`builder-chat-pane ${mobileTab === 'chat' ? 'is-mobile-active' : ''}`}>
          <BotTradeChat
            running={false}
            messages={[]}
            title="Trade Chat"
          />
          <p className="text-muted builder-chat-hint">
            Open <strong>Bot View</strong> to run this strategy with live chart, positions, and chat.
          </p>
          <button type="button" className="btn btn-primary" onClick={openBotView}>
            <Play size={14} /> Open Bot Trading View
          </button>
        </div>
      </div>

      {strategies.length > 0 && (
        <div className="card builder-saved">
          <h3 className="heading-md">Saved strategies</h3>
          <ul>{strategies.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
