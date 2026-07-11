import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RefreshCw, Wifi, WifiOff, Plus, Maximize2, Minimize2, LayoutGrid } from 'lucide-react';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import TradePanel from '../components/TradePanel';
import OpenPositions from '../components/OpenPositions';
import EvenOddStrip from '../components/EvenOddStrip';
import CollapsiblePanel from '../components/CollapsiblePanel';
import TradeChartPane from '../components/TradeChartPane';
import { CardSkeleton } from '../components/ui/Skeleton';
import { usePanelState } from '../hooks/usePanelState';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useTradeSession } from '../context/TradeSessionContext';
import { api } from '../lib/api';
import {
  getAccountMode,
  hasRealTradeConfirmation,
  isDemoAccount,
} from '../lib/accountDisplay';
import { isValidSymbol, sanitizeSymbol } from '../lib/symbolUtils';
import { CHART_LAYOUTS } from '../lib/chartUtils';

function newPaneId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function Trade() {
  const { user, refresh } = useAuth();
  const { selectedSymbol, selectSymbol } = useMarket();
  const [params] = useSearchParams();
  const symbol = useMemo(
    () => sanitizeSymbol(params.get('symbol') || selectedSymbol),
    [params, selectedSymbol],
  );
  const { evenOddHistory } = useDigitStream(isValidSymbol(symbol) ? symbol : null);
  const { recordTrade } = useTradeSession();
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);
  const accountError = user?.lastAccountError;
  const [lastPrice, setLastPrice] = useState(null);
  const [trading, setTrading] = useState(false);
  const [showRealConfirm, setShowRealConfirm] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);
  const [lastTrade, setLastTrade] = useState(null);
  const [closingAll, setClosingAll] = useState(false);
  const [growthRate, setGrowthRate] = useState(3);
  const [tradeMode, setTradeMode] = useState('rise_fall');
  const [layoutId, setLayoutId] = useState('1');
  const [chartExpanded, setChartExpanded] = useState(false);
  const [panes, setPanes] = useState(() => [{ id: 'main', symbol }]);
  const subscribedRef = useRef(new Set());

  const layout = CHART_LAYOUTS.find((l) => l.id === layoutId) || CHART_LAYOUTS[0];

  const {
    connected,
    balance,
    openContracts,
    error,
    getProposal,
    buyContract,
    sellContract,
    updateContract,
    subscribeOpenContract,
  } = useTradingWs();

  useEffect(() => {
    const fromUrl = params.get('symbol');
    if (isValidSymbol(fromUrl) && fromUrl !== selectedSymbol) {
      selectSymbol(fromUrl);
    }
  }, [params, selectedSymbol, selectSymbol]);

  useEffect(() => {
    if (!isValidSymbol(selectedSymbol)) {
      selectSymbol(symbol);
    }
  }, [selectedSymbol, symbol, selectSymbol]);

  // Keep primary pane in sync with global market selection
  useEffect(() => {
    setPanes((prev) => {
      if (!prev.length) return [{ id: 'main', symbol }];
      if (prev[0].symbol === symbol) return prev;
      const next = [...prev];
      next[0] = { ...next[0], symbol };
      return next;
    });
    setLastPrice(null);
  }, [symbol]);

  useEffect(() => {
    setPanes((prev) => prev.slice(0, layout.max));
  }, [layout.max]);

  useEffect(() => {
    if (!connected || !openContracts?.length) return;
    for (const c of openContracts) {
      const id = c.contract_id;
      if (!id || subscribedRef.current.has(id)) continue;
      subscribedRef.current.add(id);
      subscribeOpenContract(id).catch(() => {
        subscribedRef.current.delete(id);
      });
    }
  }, [connected, openContracts, subscribeOpenContract]);

  const executeTrade = useCallback(
    async (tradeParams) => {
      setTrading(true);
      try {
        const proposal = await getProposal(tradeParams);
        const proposalId = proposal.proposal?.id;
        const askPrice = proposal.proposal?.ask_price;
        const payout = proposal.proposal?.payout;
        if (!proposalId || askPrice == null) {
          throw new Error('No proposal received');
        }
        const result = await buyContract(String(proposalId), askPrice);
        const contractId = result.buy?.contract_id;
        setLastTrade({
          symbol: tradeParams.symbol,
          contractType: tradeParams.contractType,
          stake: askPrice,
          payout,
          contractId,
          at: Date.now(),
        });
        recordTrade({
          message: 'Contract bought',
          type: 'trade',
          symbol: tradeParams.symbol,
          contractType: tradeParams.contractType,
          contractId,
          buyPrice: askPrice,
          status: 'open',
        });
        toast.success(`Trade opened: ${tradeParams.symbol} ${tradeParams.contractType}`, {
          description: `Stake: ${askPrice} ${balance?.currency || 'USD'}`,
        });
        try {
          await api.reportCopyTrade({ ...tradeParams, contractId });
        } catch { /* not a provider */ }
        await refresh();
        return result;
      } catch (err) {
        toast.error('Trade failed', { description: err.message });
        throw err;
      } finally {
        setTrading(false);
      }
    },
    [getProposal, buyContract, refresh, balance, recordTrade],
  );

  const handleTrade = useCallback(
    async (tradeParams) => {
      const isReal = selectedAccount && !isDemoAccount(selectedAccount);
      if (isReal && !hasRealTradeConfirmation()) {
        setPendingTrade(tradeParams);
        setShowRealConfirm(true);
        return;
      }
      return executeTrade(tradeParams);
    },
    [selectedAccount, executeTrade],
  );

  const handleSell = useCallback(
    async (contractId) => {
      try {
        await sellContract(contractId);
        toast.success('Position closed');
      } catch (err) {
        toast.error('Sell failed', { description: err.message });
      }
    },
    [sellContract],
  );

  const handleCloseAll = useCallback(async () => {
    if (!openContracts?.length) return;
    setClosingAll(true);
    try {
      for (const c of openContracts) {
        if (c.is_sold !== 1 && c.is_settleable !== 1) {
          await sellContract(c.contract_id);
        }
      }
      toast.success('All positions closed');
    } catch (err) {
      toast.error('Close all failed', { description: err.message });
    } finally {
      setClosingAll(false);
    }
  }, [openContracts, sellContract]);

  const handleUpdateTP = useCallback(
    async (contractId, takeProfit) => {
      try {
        await updateContract(contractId, { take_profit: takeProfit });
        toast.success('Take profit updated');
      } catch (err) {
        toast.error('Update failed', { description: err.message });
      }
    },
    [updateContract],
  );

  const handleUpdateSL = useCallback(
    async (contractId, stopLoss) => {
      try {
        await updateContract(contractId, { stop_loss: stopLoss });
        toast.success('Stop loss updated');
      } catch (err) {
        toast.error('Update failed', { description: err.message });
      }
    },
    [updateContract],
  );

  const onPaneSymbolChange = useCallback((paneId, nextSymbol) => {
    const clean = sanitizeSymbol(nextSymbol);
    setPanes((prev) => prev.map((p) => (p.id === paneId ? { ...p, symbol: clean } : p)));
    if (paneId === panes[0]?.id || paneId === 'main') {
      selectSymbol(clean);
    }
  }, [panes, selectSymbol]);

  const addChart = useCallback(() => {
    setPanes((prev) => {
      let nextLayout = layout;
      if (prev.length >= layout.max) {
        const bigger = CHART_LAYOUTS.find((l) => l.max > layout.max) || layout;
        nextLayout = bigger;
        setLayoutId(bigger.id);
      }
      if (prev.length >= nextLayout.max) return prev;
      return [...prev, { id: newPaneId(), symbol }];
    });
  }, [layout, symbol]);

  const removePane = useCallback((paneId) => {
    setPanes((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== paneId);
    });
  }, []);

  const setLayout = useCallback((id) => {
    const next = CHART_LAYOUTS.find((l) => l.id === id) || CHART_LAYOUTS[0];
    setLayoutId(next.id);
    setPanes((prev) => {
      const kept = prev.slice(0, next.max);
      if (kept.length === 0) kept.push({ id: 'main', symbol });
      return kept;
    });
  }, [symbol]);

  const accountMode = getAccountMode(selectedAccount, accountId);
  const { open: statsOpen, toggle: toggleStats } = usePanelState('trade-stats', false);
  const { open: lastTradeOpen, toggle: toggleLastTrade } = usePanelState('last-trade', false);

  const showConnecting = accountId && !connected && !error;
  const visiblePanes = panes.slice(0, layout.max);

  return (
    <>
      {error && (
        <div className="auth-error-banner">
          {error}
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => window.location.reload()}>
            <RefreshCw size={12} /> Reconnect
          </button>
        </div>
      )}
      {accountError && (
        <div className="auth-error-banner account-setup-notice">
          Account setup: {accountError}
        </div>
      )}
      {!accountId && !accountError && (
        <div className="auth-error-banner account-setup-notice">
          No Deriv account linked yet. Create a demo account from Profile.
        </div>
      )}

      {showConnecting && (
        <div className="trade-connecting">
          <CardSkeleton lines={2} />
          <p className="text-muted">Connecting to trading server…</p>
        </div>
      )}

      <div className={`trade-layout trade-page ${chartExpanded ? 'trade-chart-expanded' : ''}`}>
        <div className="trade-chart-section trader-chart-section">
          <div className="trade-chart-chrome">
            <div className="trade-chart-layouts" title="Chart layout">
              <LayoutGrid size={14} />
              {CHART_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`chart-layout-btn ${layoutId === l.id ? 'active' : ''}`}
                  onClick={() => setLayout(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-xs" onClick={addChart} disabled={visiblePanes.length >= 4}>
              <Plus size={14} /> Chart
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setChartExpanded((v) => !v)}
              title={chartExpanded ? 'Show trade panel' : 'Expand chart'}
            >
              {chartExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {chartExpanded ? 'Panel' : 'Expand'}
            </button>
            <div className={`connection-badge compact ${connected ? 'online' : 'offline'}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : showConnecting ? '…' : 'Off'}
            </div>
          </div>

          <div
            className="trade-multi-chart-grid"
            style={{
              gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
            }}
          >
            {visiblePanes.map((pane, i) => (
              <TradeChartPane
                key={pane.id}
                pane={pane}
                isPrimary={i === 0}
                connected={connected}
                showConnecting={showConnecting}
                growthRate={growthRate}
                showAccumulatorBand={tradeMode === 'accumulator'}
                onSymbolChange={onPaneSymbolChange}
                onRemove={removePane}
                onActivate={() => {}}
                onPriceUpdate={setLastPrice}
              />
            ))}
          </div>

          <CollapsiblePanel
            title="Stats"
            open={statsOpen}
            onToggle={toggleStats}
            compact
            className="trade-stats-panel"
            bodyClassName="trade-stats-bar"
          >
            <EvenOddStrip history={evenOddHistory} max={16} />
          </CollapsiblePanel>
        </div>

        {!chartExpanded && (
          <aside className="trade-panel-column">
            <TradePanel
              symbol={symbol}
              currency={selectedAccount?.currency || balance?.currency || 'USD'}
              connected={connected}
              balance={balance}
              openContracts={openContracts}
              onTrade={handleTrade}
              getProposal={getProposal}
              trading={trading}
              lastPrice={lastPrice}
              accountMode={accountMode.mode}
              growthRate={growthRate}
              onGrowthRateChange={setGrowthRate}
              mode={tradeMode}
              onModeChange={setTradeMode}
              compact
            />
          </aside>
        )}
      </div>

      {lastTrade && (
        <CollapsiblePanel
          title="Last trade"
          badge={lastTrade.contractType}
          open={lastTradeOpen}
          onToggle={toggleLastTrade}
          className="last-trade-panel"
        >
          <div className="last-trade-banner-inner">
            <strong>{lastTrade.symbol}</strong>
            <span>{lastTrade.contractType}</span>
            <span className="mono">Stake {Number(lastTrade.stake).toFixed(2)}</span>
            {lastTrade.payout != null && (
              <span className="mono profit">Payout {Number(lastTrade.payout).toFixed(2)}</span>
            )}
            {lastTrade.contractId && <span className="text-muted">#{lastTrade.contractId}</span>}
          </div>
        </CollapsiblePanel>
      )}

      <OpenPositions
        contracts={openContracts}
        onSell={handleSell}
        onUpdateTP={handleUpdateTP}
        onUpdateSL={handleUpdateSL}
        onCloseAll={handleCloseAll}
        closingAll={closingAll}
        currency={balance?.currency || 'USD'}
      />

      <RealTradeConfirmModal
        open={showRealConfirm}
        onClose={() => {
          setShowRealConfirm(false);
          setPendingTrade(null);
        }}
        onConfirm={() => pendingTrade && executeTrade(pendingTrade)}
      />
    </>
  );
}
