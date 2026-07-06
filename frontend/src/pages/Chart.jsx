import LiveChart from '../components/LiveChart';
import { useMarket } from '../context/MarketContext';
import { useState } from 'react';

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
          <p className="text-secondary">{selectedSymbol} · live candles</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openTradingView}>Open TradingView</button>
      </div>
      <div className="chart-page-main card">
        <LiveChart symbol={selectedSymbol} onPriceUpdate={setPrice} />
        {price != null && <p className="chart-spot mono">Spot: {price.toFixed(4)}</p>}
      </div>
    </div>
  );
}
