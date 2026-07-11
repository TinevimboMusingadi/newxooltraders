import LiveChart from '../components/LiveChart';
import { useMarket } from '../context/MarketContext';
import { useState } from 'react';
import { formatSymbolLabel } from '../lib/symbolUtils';

export default function ChartPage() {
  const { selectedSymbol } = useMarket();
  const [price, setPrice] = useState(null);

  const openTradingView = () => {
    window.open(`https://charts.deriv.com/?symbol=${encodeURIComponent(selectedSymbol)}`, '_blank', 'noopener');
  };

  return (
    <div className="chart-page">
      <div className="page-header-block chart-page-header">
        <div>
          <h1 className="heading-lg">Chart</h1>
          <p className="text-secondary">
            {formatSymbolLabel(selectedSymbol)} · live candles — scroll left for older history (dates on axis)
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openTradingView}>External chart</button>
      </div>
      <div className="chart-page-main card">
        <LiveChart symbol={selectedSymbol} onPriceUpdate={setPrice} fill height={560} />
        {price != null && <p className="chart-spot mono">Spot: {price.toFixed(4)}</p>}
      </div>
    </div>
  );
}
