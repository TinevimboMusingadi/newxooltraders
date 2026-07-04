import { useCallback, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import LiveChart from '../components/LiveChart';
import TradePanel from '../components/TradePanel';
import OpenPositions from '../components/OpenPositions';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { api } from '../lib/api';
import {
  getAccountDisplayId,
  getAccountMode,
  hasRealTradeConfirmation,
  isDemoAccount,
} from '../lib/accountDisplay';

export default function Trade() {
  const { user, refresh } = useAuth();
  const { selectedSymbol } = useMarket();
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);
  const accountError = user?.lastAccountError;
  const [lastPrice, setLastPrice] = useState(null);
  const [trading, setTrading] = useState(false);
  const [showRealConfirm, setShowRealConfirm] = useState(false);
  const [pendingTrade, setPendingTrade] = useState(null);
  const [lastTrade, setLastTrade] = useState(null);
  const [closingAll, setClosingAll] = useState(false);
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
  const accountDisplayId = getAccountDisplayId(selectedAccount, accountId);

  const showConnecting = accountId && !connected && !error;

  return (
    <>
      <div className="page-header-block trade-page-header">
        <div>
          <h1 className="heading-lg">Trading Dashboard</h1>
          <p className="text-secondary">
            {selectedSymbol} · {accountMode.shortLabel} · {accountDisplayId}
          </p>
        </div>
        <div className={`connection-badge ${connected ? 'online' : 'offline'}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Connected' : showConnecting ? 'Connecting…' : 'Disconnected'}
        </div>
      </div>

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

      <div className="trade-layout">
        <div className="trade-chart-section card">
          <LiveChart symbol={selectedSymbol} onPriceUpdate={setLastPrice} />
        </div>
        <TradePanel
          symbol={selectedSymbol}
          currency={selectedAccount?.currency || balance?.currency || 'USD'}
          connected={connected}
          balance={balance}
          openContracts={openContracts}
          onTrade={handleTrade}
          getProposal={getProposal}
          trading={trading}
          lastPrice={lastPrice}
          accountMode={accountMode.mode}
        />
      </div>

      {lastTrade && (
        <div className="last-trade-banner card">
          <span className="text-muted">Last trade</span>
          <strong>{lastTrade.symbol}</strong>
          <span>{lastTrade.contractType}</span>
          <span className="mono">Stake {Number(lastTrade.stake).toFixed(2)}</span>
          {lastTrade.payout != null && (
            <span className="mono profit">Payout {Number(lastTrade.payout).toFixed(2)}</span>
          )}
          {lastTrade.contractId && <span className="text-muted">#{lastTrade.contractId}</span>}
        </div>
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
