import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDerivTradingWs } from '../hooks/useDerivTradingWs';
import { useCopyJobRunner } from '../hooks/useCopyJobRunner';

const TradingWsContext = createContext(null);

export function TradingWsProvider({ children }) {
  const { user } = useAuth();
  const accountId = user?.selectedAccountId;
  const ws = useDerivTradingWs(accountId);

  useCopyJobRunner({
    accountId,
    connected: ws.connected,
    getProposal: ws.getProposal,
    buyContract: ws.buyContract,
  });

  return <TradingWsContext.Provider value={ws}>{children}</TradingWsContext.Provider>;
}

export function useTradingWs() {
  const ctx = useContext(TradingWsContext);
  if (!ctx) throw new Error('useTradingWs requires TradingWsProvider');
  return ctx;
}
