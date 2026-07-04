import { useCallback, useState } from 'react';
import RealTradeConfirmModal from '../components/RealTradeConfirmModal';
import LiveChart from '../components/LiveChart';
import TradePanel from '../components/TradePanel';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { useDerivTradingWs } from '../hooks/useDerivTradingWs';
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

  const { connected, balance, openContracts, error, getProposal, buyContract } =
    useDerivTradingWs(accountId);

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
        await refresh();
        return result;
      } finally {
        setTrading(false);
      }
    },
    [getProposal, buyContract, refresh],
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
