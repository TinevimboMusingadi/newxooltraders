import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import TraderLineChart from '../components/TraderLineChart';
import OpenPositions from '../components/OpenPositions';
import BotTradeChat, { pushChatMessage } from '../components/BotTradeChat';
import { useAuth } from '../hooks/useAuth';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { createBotDeskRunner, DIGIT_MATCH_V25_PRESET } from '../lib/strategyRunner';
import { persistBotRun, loadBotRun } from '../lib/botRunSession';
import { sanitizeSymbol } from '../lib/symbolUtils';

export default function BotTradingView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);
  const {
    connected,
    getProposal,
    buyContract,
    sellContract,
    openContracts,
    updateContract,
  } = useTradingWs();
  const { recordTrade } = useTradeSession();
  const { setRunHandler, clearRunHandler } = useTradingFooter();

  const boot = useMemo(() => {
    const fromState = location.state;
    if (fromState?.config) return fromState;
    return loadBotRun() || {
      name: DIGIT_MATCH_V25_PRESET.name,
      config: DIGIT_MATCH_V25_PRESET.config,
      presetId: DIGIT_MATCH_V25_PRESET.id,
    };
  }, [location.state]);

  const [name] = useState(boot.name || 'Bot');
  const [config] = useState(() => ({ ...DIGIT_MATCH_V25_PRESET.config, ...boot.config }));
  const symbol = sanitizeSymbol(config.symbol || 'R_25');
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [botIds, setBotIds] = useState(() => new Set());
  const runnerRef = useRef(null);
  const seenSettled = useRef(new Set());
  const prevOpenRef = useRef(new Map());

  const addMsg = useCallback((text, role = 'bot') => {
    pushChatMessage(setMessages, text, role);
  }, []);

  useEffect(() => {
    persistBotRun({ name, config, presetId: boot.presetId });
  }, [name, config, boot.presetId]);

  useEffect(() => {
    runnerRef.current = createBotDeskRunner({
      onProposal: (p) =>
        getProposal({
          ...p,
          symbol: p.symbol || symbol,
          currency: account?.currency || 'USD',
        }),
      onBuy: buyContract,
      onLog: (entry) => {
        pushChatMessage(setMessages, entry.text, entry.role || 'bot');
        if (!runnerRef.current?.isRunning()) setRunning(false);
      },
      onContractOpened: ({ contractId, contractType, buyPrice, symbol: sym }) => {
        if (contractId) {
          setBotIds((prev) => new Set(prev).add(String(contractId)));
        }
        recordTrade({
          message: `Bot bought ${contractType}`,
          type: 'bot',
          symbol: sym || symbol,
          contractType,
          contractId,
          buyPrice,
          status: 'open',
        });
      },
    });
  }, [getProposal, buyContract, symbol, account, recordTrade]);

  const start = useCallback(() => {
    if (!connected) {
      toast.error('Connect a trading account first');
      return;
    }
    runnerRef.current?.start({ ...config, symbol });
    setRunning(true);
    toast.success(`${name} started`);
  }, [connected, config, symbol, name]);

  const stop = useCallback(() => {
    runnerRef.current?.stop('Bot stopped');
    setRunning(false);
  }, []);

  useEffect(() => {
    setRunHandler(() => {
      if (runnerRef.current?.isRunning()) stop();
      else start();
    }, running ? 'Stop Bot' : 'Start Bot');
    return () => clearRunHandler();
  }, [running, start, stop, setRunHandler, clearRunHandler]);

  useEffect(() => {
    if (!running || !connected) return undefined;
    const id = setInterval(() => {
      runnerRef.current?.tick();
      if (!runnerRef.current?.isRunning()) setRunning(false);
    }, 8000);
    runnerRef.current?.tick();
    return () => clearInterval(id);
  }, [running, connected]);

  /* Detect settlements for bot contracts */
  useEffect(() => {
    const map = new Map((openContracts || []).map((c) => [String(c.contract_id), c]));
    const prev = prevOpenRef.current;
    for (const [id, c] of prev) {
      if (!map.has(id) && botIds.has(id) && !seenSettled.current.has(id)) {
        seenSettled.current.add(id);
        const profit = c.profit != null ? Number(c.profit) : 0;
        runnerRef.current?.noteSettlement({ contractId: id, profit });
        if (!runnerRef.current?.isRunning()) setRunning(false);
      }
    }
    prevOpenRef.current = map;
  }, [openContracts, botIds]);

  const botContracts = useMemo(
    () => (openContracts || []).filter((c) => botIds.has(String(c.contract_id))),
    [openContracts, botIds],
  );

  const handleSell = async (contractId) => {
    await sellContract(contractId);
  };

  const paramRows = [
    ['Market', config.marketLabel || symbol],
    ['Trade type', config.tradeTypeLabel || config.tradeKind || '—'],
    ['Contract type', config.contractTypeLabel || config.contractSide || '—'],
    ['Candle interval', config.candleIntervalLabel || '—'],
    ['Win amount', config.winAmount],
    ['stake', config.stakeFromWinAmount ? 'Win amount' : config.baseStake],
    ['prediction', config.prediction],
    ['Take profit', config.takeProfit],
    ['stop loss', config.stopLoss],
    ['Martingale', config.martingale ?? config.multiplier],
    ['maxStake', config.maxStakeFromWinAmount ? 'Win amount' : config.maxStake],
    ['Restart buy/sell on error', config.restartBuySellOnError ? 'On' : 'Off'],
    ['Restart last trade on error', config.restartLastTradeOnError ? 'On' : 'Off'],
  ];

  return (
    <div className={`bot-trading-view ${running ? 'is-running' : ''}`}>
      <header className="bot-desk-header">
        <div className="bot-desk-header-left">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="heading-md bot-desk-title">{name}</h1>
            <p className="text-muted bot-desk-sub mono">{symbol}</p>
          </div>
        </div>
        <div className="bot-desk-actions">
          <span className={`bot-run-badge ${running ? 'is-running' : 'is-idle'}`}>
            {running ? 'Bot is running' : 'Bot is not running'}
          </span>
          {running ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={stop}>
              <Square size={14} /> Stop
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={start} disabled={!connected}>
              <Play size={14} /> Start
            </button>
          )}
        </div>
      </header>

      <div className="bot-desk-grid">
        <div className="bot-desk-main">
          <div className="bot-desk-chart card">
            <TraderLineChart symbol={symbol} showAccumulatorBand={false} />
          </div>

          <OpenPositions
            contracts={botContracts}
            onSell={handleSell}
            onUpdateTP={(id, v) => updateContract(id, { take_profit: v })}
            onUpdateSL={(id, v) => updateContract(id, { stop_loss: v })}
            currency={account?.currency || 'USD'}
            defaultOpen
          />

          <div className="bot-params-panel card">
            <h3 className="heading-sm">Strategy parameters</h3>
            <dl className="bot-params-list">
              {paramRows.map(([label, value]) => (
                <div key={label} className="bot-params-row">
                  <dt>{label}</dt>
                  <dd className="mono">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <Link to="/bots/free" className="btn btn-ghost btn-xs">Free Strategies</Link>
          </div>
        </div>

        <aside className="bot-desk-side">
          <BotTradeChat
            running={running}
            messages={messages}
            onClear={() => setMessages([])}
          />
        </aside>
      </div>
    </div>
  );
}
