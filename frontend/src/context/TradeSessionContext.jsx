import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const TradeSessionContext = createContext(null);

export function TradeSessionProvider({ children }) {
  const [sessionPl, setSessionPl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [journal, setJournal] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lastContractStatus, setLastContractStatus] = useState('Ready');

  const recordTrade = useCallback((entry) => {
    setJournal((prev) => [{ id: Date.now(), at: new Date().toISOString(), ...entry }, ...prev].slice(0, 100));
    setLastContractStatus(entry.message || 'Contract bought');
  }, []);

  const recordTransaction = useCallback((tx) => {
    setTransactions((prev) => [tx, ...prev].slice(0, 50));
    if (tx.profit != null) {
      const pl = Number(tx.profit);
      setSessionPl((s) => s + pl);
      if (pl >= 0) setWins((w) => w + 1);
      else setLosses((l) => l + 1);
    }
  }, []);

  const recordContractUpdate = useCallback((contract) => {
    if (contract?.profit != null && (contract.is_sold || contract.is_expired)) {
      recordTransaction({
        action: contract.is_sold ? 'sell' : 'expired',
        contract_id: contract.contract_id,
        profit: contract.profit,
        buy_price: contract.buy_price,
        symbol: contract.underlying,
        at: new Date().toISOString(),
      });
    }
  }, [recordTransaction]);

  const reset = useCallback(() => {
    setSessionPl(0);
    setWins(0);
    setLosses(0);
    setJournal([]);
    setTransactions([]);
    setLastContractStatus('Session reset');
  }, []);

  const winRate = useMemo(() => {
    const total = wins + losses;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [wins, losses]);

  const value = useMemo(() => ({
    sessionPl,
    wins,
    losses,
    winRate,
    journal,
    transactions,
    lastContractStatus,
    recordTrade,
    recordTransaction,
    recordContractUpdate,
    reset,
    setLastContractStatus,
  }), [sessionPl, wins, losses, winRate, journal, transactions, lastContractStatus, recordTrade, recordTransaction, recordContractUpdate, reset]);

  return (
    <TradeSessionContext.Provider value={value}>{children}</TradeSessionContext.Provider>
  );
}

export function useTradeSession() {
  const ctx = useContext(TradeSessionContext);
  if (!ctx) throw new Error('useTradeSession requires TradeSessionProvider');
  return ctx;
}
