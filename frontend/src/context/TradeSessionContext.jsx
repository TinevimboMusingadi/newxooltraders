import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api';

const TradeSessionContext = createContext(null);

export function TradeSessionProvider({ children }) {
  const [sessionPl, setSessionPl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [journal, setJournal] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lastContractStatus, setLastContractStatus] = useState('Ready');

  const persistTrade = useCallback(async (payload) => {
    try {
      const res = await api.saveLocalTrade(payload);
      return res.trade;
    } catch {
      return null;
    }
  }, []);

  const recordTrade = useCallback((entry) => {
    setJournal((prev) => [{ id: Date.now(), at: new Date().toISOString(), ...entry }, ...prev].slice(0, 100));
    setLastContractStatus(entry.message || 'Contract bought');

    if (entry.persist !== false && (entry.symbol || entry.contractId)) {
      persistTrade({
        contractId: entry.contractId,
        symbol: entry.symbol,
        contractType: entry.contractType,
        buyPrice: entry.buyPrice ?? entry.stake,
        source: entry.type || 'app',
        status: entry.status || 'open',
        profit: entry.profit,
        sellPrice: entry.sellPrice,
        meta: entry.meta || { message: entry.message },
      });
    }
  }, [persistTrade]);

  const recordTransaction = useCallback((tx) => {
    setTransactions((prev) => [tx, ...prev].slice(0, 50));
    if (tx.profit != null) {
      const pl = Number(tx.profit);
      setSessionPl((s) => s + pl);
      if (pl >= 0) setWins((w) => w + 1);
      else setLosses((l) => l + 1);
    }

    if (tx.persist !== false) {
      persistTrade({
        contractId: tx.contract_id,
        symbol: tx.symbol,
        contractType: tx.contractType,
        buyPrice: tx.buy_price,
        sellPrice: tx.sell_price,
        profit: tx.profit,
        source: tx.action || 'app',
        status: 'closed',
        meta: tx,
      });
    }
  }, [persistTrade]);

  const recordContractUpdate = useCallback((contract) => {
    if (contract?.profit != null && (contract.is_sold || contract.is_expired)) {
      recordTransaction({
        action: contract.is_sold ? 'sell' : 'expired',
        contract_id: contract.contract_id,
        profit: contract.profit,
        buy_price: contract.buy_price,
        sell_price: contract.sell_price,
        symbol: contract.underlying || contract.underlying_symbol,
        contractType: contract.contract_type,
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
