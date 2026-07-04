import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import LiveChart from '../components/LiveChart';
import TradePanel from '../components/TradePanel';
import OpenPositions from '../components/OpenPositions';
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

  const { connected, balance, openContracts, error, getProposal, buyContract, sellContract, updateContract } =
    useTradingWs();

  const executeTrade = useCallback(
    async (params) => {
      setTrading(true);
      try {
        const proposal = await getProposal(params);
        const proposalId = proposal.proposal?.id;
        const askPrice = proposal.proposal?.ask_price;
        if (!proposalId || askPrice == null) {
          throw new Error('No proposal received');
        }
        const result = await buyContract(String(proposalId), askPrice);
        toast.success(`Trade opened: ${params.symbol} ${params.contract_type}`, {
          description: `Stake: ${askPrice} ${balance?.currency || 'USD'}`,
        });
        try {
          await api.reportCopyTrade({ ...params, contractId: result.buy?.contract_id });
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

  return (
    <>
      <div className="page-header-block">
        <h1 className="heading-lg">Trading Dashboard</h1>
        <p className="text-secondary">
          {selectedSymbol} · {accountMode.shortLabel} · {accountDisplayId}
        </p>
      </div>

      {error && <div className="auth-error-banner">{error}</div>}
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
          trading={trading}
          lastPrice={lastPrice}
          accountMode={accountMode.mode}
        />
      </div>

      {openContracts?.length > 0 && (
        <OpenPositions
          contracts={openContracts}
          onSell={handleSell}
          onUpdateTP={handleUpdateTP}
          onUpdateSL={handleUpdateSL}
          currency={balance?.currency || 'USD'}
        />
      )}

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
