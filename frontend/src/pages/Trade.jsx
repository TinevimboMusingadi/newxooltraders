import { useCallback, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RefreshCw, Wifi, WifiOff, ExternalLink, ChevronDown } from 'lucide-react';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import TraderLineChart from '../components/TraderLineChart';
import LiveChart from '../components/LiveChart';
import TradePanel from '../components/TradePanel';
import OpenPositions from '../components/OpenPositions';
import MarketPicker from '../components/MarketPicker';
import EvenOddStrip from '../components/EvenOddStrip';
import CollapsiblePanel from '../components/CollapsiblePanel';
import { CardSkeleton } from '../components/ui/Skeleton';
import { usePanelState } from '../hooks/usePanelState';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useTradeSession } from '../context/TradeSessionContext';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { api } from '../lib/api';
import {
  getAccountMode,
  hasRealTradeConfirmation,
  isDemoAccount,
} from '../lib/accountDisplay';

export default function Trade() {
  const { user, refresh } = useAuth();
  const { selectedSymbol, selectSymbol } = useMarket();
  const [params] = useSearchParams();
  const symbol = params.get('symbol') || selectedSymbol;
  const { symbols } = useActiveSymbols();
  const currentMeta = symbols.find((s) => s.symbol === symbol);
  const { evenOddHistory } = useDigitStream(symbol);
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
  const [chartType, setChartType] = useState('line');
  const subscribedRef = useRef(new Set());

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
    if (params.get('symbol') && params.get('symbol') !== selectedSymbol) {
      selectSymbol(params.get('symbol'));
    }
  }, [params, selectedSymbol, selectSymbol]);

  useEffect(() => {
    setLastPrice(null);
  }, [symbol]);

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
    async (params) => {
      setTrading(true);
      try {
        const proposal = await getProposal(params);
        const proposalId = proposal.proposal?.id;
        const askPrice = proposal.proposal?.ask_price;
        const payout = proposal.proposal?.payout;
        if (!proposalId || askPrice == null) {
          throw new Error('No proposal received');
        }
        const result = await buyContract(String(proposalId), askPrice);
        const contractId = result.buy?.contract_id;
        setLastTrade({
          symbol: params.symbol,
          contractType: params.contractType,
          stake: askPrice,
          payout,
          contractId,
          at: Date.now(),
        });
        recordTrade({ message: 'Contract bought', type: 'trade', symbol: params.symbol, contractType: params.contractType });
        toast.success(`Trade opened: ${params.symbol} ${params.contractType}`, {
          description: `Stake: ${askPrice} ${balance?.currency || 'USD'}`,
        });
        try {
          await api.reportCopyTrade({ ...params, contractId });
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
    [getProposal, buyContract, refresh, balance],
  );

  const handleTrade = useCallback(
    async (params) => {
      const isReal = selectedAccount && !isDemoAccount(selectedAccount);
      if (isReal && !hasRealTradeConfirmation()) {
        setPendingTrade(params);
        setShowRealConfirm(true);
        return;
      }
      return executeTrade(params);
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

  const accountMode = getAccountMode(selectedAccount, accountId);
  const { open: statsOpen, toggle: toggleStats } = usePanelState('trade-stats', false);
  const { open: lastTradeOpen, toggle: toggleLastTrade } = usePanelState('last-trade', true);

  const showConnecting = accountId && !connected && !error;

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

      <div className="trade-layout trade-page">
        <div className="trade-chart-section trader-chart-section">
          {chartType === 'line' ? (
            <TraderLineChart
              symbol={symbol}
              onPriceUpdate={setLastPrice}
              growthRate={growthRate}
              showAccumulatorBand={tradeMode === 'accumulator'}
              overlay={(
                <MarketPicker
                  symbol={symbol}
                  onSelect={selectSymbol}
                  trigger={(
                    <div className="trader-asset-picker">
                      <div className="trader-asset-picker-row">
                        <strong>{currentMeta?.displayName || symbol}</strong>
                        <ChevronDown size={12} className="trader-asset-chevron" />
                      </div>
                      <span className="mono trader-asset-price">
                        {lastPrice != null ? lastPrice.toFixed(symbol?.startsWith('frx') ? 4 : 2) : '—'}
                      </span>
                    </div>
                  )}
                />
              )}
              toolbarOverlay={(
                <div className="trader-chart-toolbar">
                  <div className="chart-type-toggle">
                    <button type="button" className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')}>Line</button>
                    <button type="button" className={chartType === 'candle' ? 'active' : ''} onClick={() => setChartType('candle')}>Candles</button>
                  </div>
                  <button type="button" className="btn btn-ghost btn-xs trader-toolbar-btn" onClick={() => window.open(`https://charts.deriv.com/?symbol=${encodeURIComponent(symbol)}`, '_blank', 'noopener')}>
                    <ExternalLink size={12} /> TV
                  </button>
                  <div className={`connection-badge compact ${connected ? 'online' : 'offline'}`}>
                    {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {connected ? 'Live' : showConnecting ? '…' : 'Off'}
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="trade-candle-wrap">
              <div className="trader-chart-overlays trade-candle-overlays">
                <MarketPicker
                  symbol={symbol}
                  onSelect={selectSymbol}
                  trigger={(
                    <div className="trader-asset-picker">
                      <div className="trader-asset-picker-row">
                        <strong>{currentMeta?.displayName || symbol}</strong>
                        <ChevronDown size={12} className="trader-asset-chevron" />
                      </div>
                      <span className="mono trader-asset-price">
                        {lastPrice != null ? lastPrice.toFixed(symbol?.startsWith('frx') ? 4 : 2) : '—'}
                      </span>
                    </div>
                  )}
                />
                <div className="trader-chart-toolbar">
                  <div className="chart-type-toggle">
                    <button type="button" className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')}>Line</button>
                    <button type="button" className={chartType === 'candle' ? 'active' : ''} onClick={() => setChartType('candle')}>Candles</button>
                  </div>
                  <button type="button" className="btn btn-ghost btn-xs trader-toolbar-btn" onClick={() => window.open(`https://charts.deriv.com/?symbol=${encodeURIComponent(symbol)}`, '_blank', 'noopener')}>
                    <ExternalLink size={12} /> TV
                  </button>
                  <div className={`connection-badge compact ${connected ? 'online' : 'offline'}`}>
                    {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {connected ? 'Live' : showConnecting ? '…' : 'Off'}
                  </div>
                </div>
              </div>
              <LiveChart symbol={symbol} onPriceUpdate={setLastPrice} fill />
            </div>
          )}
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
