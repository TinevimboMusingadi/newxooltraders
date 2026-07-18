import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { createBotDeskRunner, DIGIT_MATCH_V25_PRESET } from '../lib/strategyRunner';
import { loadBotRun, persistBotRun } from '../lib/botRunSession';
import { useTradingWs } from './TradingWsContext';
import { useTradeSession } from './TradeSessionContext';
import { useAuth } from '../hooks/useAuth';
import { sanitizeSymbol } from '../lib/symbolUtils';

const BotDeskContext = createContext(null);
const MSG_KEY = 'newxool_bot_chat';
const IDS_KEY = 'newxool_bot_ids';

function loadJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function BotDeskProvider({ children }) {
  const { user } = useAuth();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);
  const { connected, getProposal, buyContract, openContracts } = useTradingWs();
  const { recordTrade } = useTradeSession();

  const boot = loadBotRun() || {
    name: DIGIT_MATCH_V25_PRESET.name,
    config: DIGIT_MATCH_V25_PRESET.config,
    presetId: DIGIT_MATCH_V25_PRESET.id,
  };

  const [name, setName] = useState(boot.name || 'Bot');
  const [config, setConfig] = useState(() => ({ ...DIGIT_MATCH_V25_PRESET.config, ...boot.config }));
  const [presetId, setPresetId] = useState(boot.presetId);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState(() => loadJson(MSG_KEY, []));
  const [botIds, setBotIds] = useState(() => new Set(loadJson(IDS_KEY, [])));
  const runnerRef = useRef(null);
  const seenSettled = useRef(new Set());
  const prevOpenRef = useRef(new Map());
  const tickTimerRef = useRef(null);

  const symbol = sanitizeSymbol(config.symbol || 'R_25');

  const pushMsg = useCallback((text, role = 'bot') => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      role,
      text,
    };
    setMessages((prev) => {
      const next = [...prev, entry].slice(-200);
      saveJson(MSG_KEY, next);
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    saveJson(MSG_KEY, []);
  }, []);

  const loadBot = useCallback((payload) => {
    if (!payload?.config) return;
    const nextConfig = { ...DIGIT_MATCH_V25_PRESET.config, ...payload.config };
    setName(payload.name || 'Bot');
    setConfig(nextConfig);
    setPresetId(payload.presetId || 'custom');
    persistBotRun({
      name: payload.name || 'Bot',
      config: nextConfig,
      presetId: payload.presetId || 'custom',
    });
  }, []);

  useEffect(() => {
    persistBotRun({ name, config, presetId });
  }, [name, config, presetId]);

  useEffect(() => {
    saveJson(IDS_KEY, [...botIds]);
  }, [botIds]);

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
        pushMsg(entry.text, entry.role || 'bot');
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
  }, [getProposal, buyContract, symbol, account, recordTrade, pushMsg]);

  const stopTickLoop = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const startTickLoop = useCallback(() => {
    stopTickLoop();
    tickTimerRef.current = setInterval(() => {
      if (!runnerRef.current?.isRunning()) {
        setRunning(false);
        stopTickLoop();
        return;
      }
      runnerRef.current.tick();
    }, 8000);
  }, [stopTickLoop]);

  const start = useCallback(() => {
    if (!connected) {
      toast.error('Connect a trading account first');
      return;
    }
    runnerRef.current?.start({ ...config, symbol });
    setRunning(true);
    startTickLoop();
    runnerRef.current?.tick();
    toast.success(`${name} started — stays running if you leave this screen`);
  }, [connected, config, symbol, name, startTickLoop]);

  const stop = useCallback(() => {
    runnerRef.current?.stop('Bot stopped');
    setRunning(false);
    stopTickLoop();
  }, [stopTickLoop]);

  /* Settlements while bot runs — even if user is on another page */
  useEffect(() => {
    const map = new Map((openContracts || []).map((c) => [String(c.contract_id), c]));
    const prev = prevOpenRef.current;
    for (const [id, c] of prev) {
      if (!map.has(id) && botIds.has(id) && !seenSettled.current.has(id)) {
        seenSettled.current.add(id);
        const profit = c.profit != null ? Number(c.profit) : 0;
        runnerRef.current?.noteSettlement({ contractId: id, profit });
        if (!runnerRef.current?.isRunning()) {
          setRunning(false);
          stopTickLoop();
        }
      }
    }
    prevOpenRef.current = map;
  }, [openContracts, botIds, stopTickLoop]);

  useEffect(() => () => stopTickLoop(), [stopTickLoop]);

  const botContracts = useMemo(
    () => (openContracts || []).filter((c) => botIds.has(String(c.contract_id))),
    [openContracts, botIds],
  );

  const value = useMemo(
    () => ({
      name,
      config,
      presetId,
      symbol,
      running,
      messages,
      botIds,
      botContracts,
      loadBot,
      start,
      stop,
      clearMessages,
      pushMsg,
    }),
    [
      name,
      config,
      presetId,
      symbol,
      running,
      messages,
      botIds,
      botContracts,
      loadBot,
      start,
      stop,
      clearMessages,
      pushMsg,
    ],
  );

  return <BotDeskContext.Provider value={value}>{children}</BotDeskContext.Provider>;
}

export function useBotDesk() {
  const ctx = useContext(BotDeskContext);
  if (!ctx) throw new Error('useBotDesk must be used within BotDeskProvider');
  return ctx;
}
