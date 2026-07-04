import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const PING_INTERVAL_MS = 45_000;

export function useDerivTradingWs(accountId) {
  const wsRef = useRef(null);
  const reqIdRef = useRef(1);
  const pendingRef = useRef(new Map());
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(null);
  const [openContracts, setOpenContracts] = useState([]);
  const [error, setError] = useState(null);

  const send = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      const reqId = reqIdRef.current++;
      pendingRef.current.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ ...payload, req_id: reqId }));
      setTimeout(() => {
        if (pendingRef.current.has(reqId)) {
          pendingRef.current.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 15_000);
    });
  }, []);

  useEffect(() => {
    if (!accountId) return;

    let pingTimer;
    let reconnectTimer;
    let closed = false;

    async function connect() {
      try {
        const { wsUrl } = await api.getWsOtp(accountId);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          ws.send(JSON.stringify({ balance: 1, req_id: reqIdRef.current++ }));
          ws.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ ping: 1, req_id: reqIdRef.current++ }));
              ws.send(JSON.stringify({ portfolio: 1, req_id: reqIdRef.current++ }));
            }
          }, PING_INTERVAL_MS);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const reqId = data.req_id;

          if (data.error) {
            if (reqId && pendingRef.current.has(reqId)) {
              pendingRef.current.get(reqId).reject(new Error(data.error.message));
              pendingRef.current.delete(reqId);
            } else {
              setError(data.error.message);
            }
            return;
          }

          if (reqId && pendingRef.current.has(reqId)) {
            pendingRef.current.get(reqId).resolve(data);
            pendingRef.current.delete(reqId);
          }

          if (data.msg_type === 'balance') {
            setBalance(data.balance);
          }
          if (data.msg_type === 'portfolio') {
            setOpenContracts(data.portfolio?.contracts || []);
          }
          if (data.msg_type === 'proposal_open_contract') {
            setOpenContracts((prev) => {
              const id = data.proposal_open_contract?.contract_id;
              const filtered = prev.filter((c) => c.contract_id !== id);
              if (data.proposal_open_contract?.is_sold || data.proposal_open_contract?.is_expired) {
                return filtered;
              }
              return [...filtered, data.proposal_open_contract];
            });
          }
        };

        ws.onerror = () => setError('Trading connection error');
        ws.onclose = () => {
          setConnected(false);
          clearInterval(pingTimer);
          if (!closed) reconnectTimer = setTimeout(connect, 4000);
        };
      } catch (err) {
        setError(err.message);
        if (!closed) reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      closed = true;
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      pendingRef.current.clear();
      wsRef.current?.close();
    };
  }, [accountId]);

  const getProposal = useCallback(
    async ({ contractType, amount, duration, durationUnit, symbol, currency, barrier, growthRate, limitTicks }) => {
      const payload = {
        proposal: 1,
        amount,
        basis: 'stake',
        contract_type: contractType,
        currency,
        symbol,
      };
      if (duration != null) {
        payload.duration = duration;
        payload.duration_unit = durationUnit;
      }
      if (barrier != null) payload.barrier = String(barrier);
      if (growthRate != null) payload.growth_rate = growthRate;
      if (limitTicks != null) payload.limit_order = { take_profit: limitTicks };
      return send(payload);
    },
    [send],
  );

  const buyContract = useCallback(
    async (proposalId, price) => {
      const result = await send({ buy: proposalId, price });
      const contractId = result.buy?.contract_id;
      if (contractId) {
        send({ portfolio: 1 }).catch(() => {});
      }
      return result;
    },
    [send],
  );

  const queueBulkTrades = useCallback(
    async (trades, { delayMs = 800, maxConcurrent = 3 } = {}) => {
      const results = [];
      for (let i = 0; i < trades.length; i += maxConcurrent) {
        const batch = trades.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
          batch.map(async (t) => {
            const proposal = await getProposal(t);
            const id = proposal.proposal?.id;
            const price = proposal.proposal?.ask_price;
            if (!id || price == null) throw new Error('No proposal');
            return buyContract(String(id), price);
          }),
        );
        results.push(...batchResults);
        if (i + maxConcurrent < trades.length) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      return results;
    },
    [getProposal, buyContract],
  );

  return {
    connected,
    balance,
    openContracts,
    error,
    getProposal,
    buyContract,
    queueBulkTrades,
  };
}
