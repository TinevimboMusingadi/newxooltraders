import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDerivTradingWs } from '../hooks/useDerivTradingWs';
import { useCopyJobRunner } from '../hooks/useCopyJobRunner';
import { useTradeSession } from './TradeSessionContext';

const TradingWsContext = createContext(null);

export function TradingWsProvider({ children }) {
  const { user } = useAuth();
  const accountId = user?.selectedAccountId;
  const { recordContractUpdate } = useTradeSession();
  const ws = useDerivTradingWs(accountId, { onContractUpdate: recordContractUpdate });

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
