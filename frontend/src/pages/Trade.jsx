import { useCallback, useState } from 'react';
import Navbar from '../components/Navbar';
import LiveChart from '../components/LiveChart';
import TradePanel from '../components/TradePanel';
import { useAuth } from '../hooks/useAuth';
import { useDerivTradingWs } from '../hooks/useDerivTradingWs';
import { getAccountDisplayId, getAccountTypeLabel } from '../lib/accountDisplay';

const DEFAULT_SYMBOL = '1HZ100V';

export default function Trade() {
  const { user, refresh } = useAuth();
  const accountId = user?.selectedAccountId;
  const selectedAccount = user?.accounts?.find((a) => a.accountId === accountId);
  const accountError = user?.lastAccountError;
  const [lastPrice, setLastPrice] = useState(null);
  const [trading, setTrading] = useState(false);

  const { connected, balance, openContracts, error, getProposal, buyContract } =
    useDerivTradingWs(accountId);

  const handleTrade = useCallback(
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

  const accountTypeLabel = getAccountTypeLabel(selectedAccount, accountId);
  const accountDisplayId = getAccountDisplayId(selectedAccount, accountId);

  return (
    <>
      <Navbar variant="app" />
      <main className="trade-page">
        <div className="container">
          <div className="trade-page-header">
            <div>
              <h1 className="heading-lg">Trading Dashboard</h1>
              <p className="text-secondary">
                {DEFAULT_SYMBOL} · {accountTypeLabel} · {accountDisplayId}
              </p>
            </div>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}
          {accountError && (
            <div className="auth-error-banner" style={{ borderColor: 'var(--purple-main)', color: 'var(--purple-light)' }}>
              Account setup: {accountError}
            </div>
          )}
          {!accountId && !accountError && (
            <div className="auth-error-banner" style={{ borderColor: 'var(--purple-main)', color: 'var(--purple-light)' }}>
              No Deriv account linked yet. Try logging out and signing in again, or create a demo account on Deriv first.
            </div>
          )}

          <div className="trade-layout">
            <div className="trade-chart-section card">
              <LiveChart symbol={DEFAULT_SYMBOL} onPriceUpdate={setLastPrice} />
            </div>
            <TradePanel
              symbol={DEFAULT_SYMBOL}
              currency={selectedAccount?.currency || balance?.currency || 'USD'}
              connected={connected}
              balance={balance}
              openContracts={openContracts}
              onTrade={handleTrade}
              trading={trading}
              lastPrice={lastPrice}
            />
          </div>
        </div>
      </main>
    </>
  );
}
