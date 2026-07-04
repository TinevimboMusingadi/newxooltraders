import DigitHeatmap from '../components/DigitHeatmap';
import ScanConfigPanel from '../components/ScanConfigPanel';
import SignalsFeed from '../components/SignalsFeed';
import { useState } from 'react';
import { scanMarkets, rankSignals } from '../lib/digitsEngine';
import { SYMBOL_CATALOG } from '../lib/symbolGroups';
import { useMarket } from '../context/MarketContext';

const DEFAULT_SCAN = ['1HZ100V', '1HZ75V', '1HZ50V', 'R_100', 'R_75'];

export default function Scanner() {
  const { favorites } = useMarket();
  const [depth, setDepth] = useState(1000);
  const [pattern, setPattern] = useState('O1U8');
  const [minConfidence, setMinConfidence] = useState(55);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedDist, setSelectedDist] = useState(null);

  const markets = [...new Set([...favorites, ...DEFAULT_SCAN])].slice(0, 10);

  const runScan = async () => {
    setScanning(true);
    try {
      const data = await scanMarkets(markets, { depth, pattern });
      setResults(data);
      const first = data.find((r) => r.dist);
      if (first) setSelectedDist(first);
    } finally {
      setScanning(false);
    }
  };

  const signals = rankSignals(results, minConfidence);

  return (
    <div className="scanner-page">
      <div className="page-header-block">
        <h1 className="heading-lg">AI Entry Scanner</h1>
        <p className="text-secondary">Digit distribution analysis across volatility and synthetic markets.</p>
      </div>

      <ScanConfigPanel
        depth={depth}
        pattern={pattern}
        minConfidence={minConfidence}
        onDepthChange={setDepth}
        onPatternChange={setPattern}
        onMinConfidenceChange={setMinConfidence}
        onScan={runScan}
        scanning={scanning}
        marketCount={markets.length}
      />

      <div className="scanner-grid">
        <DigitHeatmap distribution={selectedDist?.dist} symbol={selectedDist?.symbol} />
        <SignalsFeed
          signals={signals}
          results={results}
          onSelect={(r) => setSelectedDist(r)}
        />
      </div>
    </div>
  );
}
