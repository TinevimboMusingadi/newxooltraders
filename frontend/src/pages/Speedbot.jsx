import { useEffect, useRef, useState, useCallback } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useTradingFooter } from '../context/TradingFooterContext';
import { useTradeSession } from '../context/TradeSessionContext';
import EvenOddStrip from '../components/EvenOddStrip';
import MarketPicker from '../components/MarketPicker';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import { useAuth } from '../hooks/useAuth';

export default function Speedbot() {
  const { selectedSymbol, selectSymbol } = useMarket();
  const { user } = useAuth();
  const { connected, getProposal, buyContract } = useTradingWs();
  const { quote, evenOddHistory, lastDigit } = useDigitStream(selectedSymbol);
  const [stake, setStake] = useState(0.5);
  const [running, setRunning] = useState(false);
  const lastTradeRef = useRef(null);
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const { recordTrade } = useTradeSession();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);

  const placeTrade = useCallback(async () => {
    if (!connected || lastDigit == null) return;
    const contractType = lastDigit % 2 === 0 ? 'DIGITEVEN' : 'DIGITODD';
    if (lastTradeRef.current === contractType) return;
    try {
      const proposal = await getProposal({
        contractType,
        amount: stake,
        duration: 1,
        durationUnit: 't',
        symbol: selectedSymbol,
        currency: account?.currency || 'USD',
      });
      const id = proposal.proposal?.id;
      const price = proposal.proposal?.ask_price;
      if (!id || price == null) return;
      await buyContract(String(id), price);
      lastTradeRef.current = contractType;
      recordTrade({ message: 'Contract bought', type: 'speedbot', contractType });
    } catch {
      /* skip tick */
    }
  }, [connected, lastDigit, getProposal, stake, selectedSymbol, account, buyContract, recordTrade]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(placeTrade, 3000);
    return () => clearInterval(t);
  }, [running, placeTrade]);

  const toggle = useCallback(() => {
    setRunning((r) => !r);
  }, []);

  useEffect(() => {
    setRunHandler(toggle, running ? 'Stop' : 'Start Trading');
    return () => clearRunHandler();
  }, [toggle, running, setRunHandler, clearRunHandler]);

  return (
    <div className="speedbot-page">
      <WorkspacePageHeader
        title="Speedbot"
        subtitle="Fast even/odd trades following live digit parity."
      />

      <div className="speedbot-grid card">
        <MarketPicker symbol={selectedSymbol} onSelect={selectSymbol} />
        <div className="bulk-tick-display">
          <span className="text-muted">Live tick</span>
          <strong className="bulk-tick-value mono">{quote != null ? quote.toFixed(2) : '—'}</strong>
        </div>
        <EvenOddStrip history={evenOddHistory} />
        <label>Stake
          <input type="number" min={0.35} step={0.5} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="trade-input" />
        </label>
        <button type="button" className="btn btn-primary" disabled={!connected} onClick={toggle}>
          {running ? 'Stop Trading' : 'Start Trading'}
        </button>
      </div>
    </div>
  );
}
