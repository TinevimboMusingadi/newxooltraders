import DigitHeatmap from '../components/DigitHeatmap';
import ScanConfigPanel from '../components/ScanConfigPanel';
import SignalsFeed from '../components/SignalsFeed';
import { DcirclesView } from '../components/EvenOddStrip';
import { useMemo, useState, useEffect } from 'react';
import { scanMarkets, rankSignals } from '../lib/digitsEngine';
import { filterVolatilitySymbols } from '../lib/symbolGroups';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useTradingFooter } from '../context/TradingFooterContext';

export default function Scanner() {
  const { favorites, selectedSymbol } = useMarket();
  const { symbols, loading: symbolsLoading } = useActiveSymbols();
  const [tool, setTool] = useState('normal');
  const [depth, setDepth] = useState(1000);
  const [pattern, setPattern] = useState('O1U8');
  const [minConfidence, setMinConfidence] = useState(55);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedDist, setSelectedDist] = useState(null);
  const { evenOddHistory, evenPct } = useDigitStream(selectedSymbol);
  const { setRunHandler, clearRunHandler } = useTradingFooter();

  const markets = useMemo(() => {
    const vol = filterVolatilitySymbols(symbols).map((s) => s.symbol);
    return [...new Set([...favorites, ...vol])].slice(0, 12);
  }, [symbols, favorites]);

  const runScan = async () => {
    if (!markets.length) return;
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

  useEffect(() => {
    setRunHandler(runScan, 'Run Scan');
    return () => clearRunHandler();
  }, [markets, depth, pattern]);

  const signals = rankSignals(results, minConfidence);

  return (
    <div className="scanner-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Analysis Tools</h1>
        <p className="text-secondary">Digit circles and pattern scanner on live volatility markets.</p>
      </div>

      <div className="scanner-tool-toggle">
        <button type="button" className={`pill-toggle ${tool === 'dcircles' ? 'active' : ''}`} onClick={() => setTool('dcircles')}>Dcircles</button>
        <button type="button" className={`pill-toggle ${tool === 'normal' ? 'active' : ''}`} onClick={() => setTool('normal')}>Normal tool</button>
      </div>

      {tool === 'dcircles' && (
        <div className="card scanner-dcircles">
          <p className="text-muted">Live even/odd on {selectedSymbol}</p>
          <DcirclesView history={evenOddHistory} evenPct={evenPct} />
        </div>
      )}

      {tool === 'normal' && (
        <>
          {symbolsLoading && <p className="text-muted">Loading live markets…</p>}
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
            <SignalsFeed signals={signals} results={results} onSelect={(r) => setSelectedDist(r)} />
          </div>
        </>
      )}
    </div>
  );
}
