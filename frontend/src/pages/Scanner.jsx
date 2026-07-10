import DigitHeatmap from '../components/DigitHeatmap';
import ScanConfigPanel from '../components/ScanConfigPanel';
import SignalsFeed from '../components/SignalsFeed';
import AnalysisMarketCard from '../components/AnalysisMarketCard';
import BinaryAnalysisPanel from '../components/BinaryAnalysisPanel';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import { useMemo, useState, useEffect } from 'react';
import { scanMarkets, rankSignals } from '../lib/digitsEngine';
import { filterVolatilitySymbols } from '../lib/symbolGroups';
import { useActiveSymbols } from '../hooks/useActiveSymbols';
import { useMarket } from '../context/MarketContext';
import { useDigitStream } from '../hooks/useDigitStream';
import { useMultiDigitStream } from '../hooks/useMultiDigitStream';
import { useTradingFooter } from '../context/TradingFooterContext';

const DEFAULT_BOARD_SYMBOLS = ['1HZ100V', '1HZ10V', '1HZ25V'];

export default function Scanner() {
  const { favorites, selectedSymbol } = useMarket();
  const { symbols, loading: symbolsLoading } = useActiveSymbols();
  const [tab, setTab] = useState('boards');
  const [depth, setDepth] = useState(1000);
  const [pattern, setPattern] = useState('O1U8');
  const [minConfidence, setMinConfidence] = useState(55);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedDist, setSelectedDist] = useState(null);
  const [bufferSize, setBufferSize] = useState(120);
  const [tradeType, setTradeType] = useState('even_odd');
  const binaryStream = useDigitStream(selectedSymbol, { bufferSize });
  const { setRunHandler, clearRunHandler } = useTradingFooter();

  const boardSymbols = useMemo(() => {
    const vol = filterVolatilitySymbols(symbols).map((s) => s.symbol);
    const merged = [...new Set([...DEFAULT_BOARD_SYMBOLS, ...favorites, ...vol])].slice(0, 6);
    return merged.length ? merged : DEFAULT_BOARD_SYMBOLS;
  }, [symbols, favorites]);

  const symbolNames = useMemo(() => {
    const map = {};
    symbols.forEach((s) => { map[s.symbol] = s.displayName; });
    return map;
  }, [symbols]);

  const { streams } = useMultiDigitStream(boardSymbols, { bufferSize });

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
    if (tab === 'scan') {
      setRunHandler(runScan, 'Run Scan');
      return () => clearRunHandler();
    }
    clearRunHandler();
    return () => clearRunHandler();
  }, [tab, markets, depth, pattern]);

  const signals = rankSignals(results, minConfidence);

  return (
    <div className="scanner-page analysis-lab-page">
      <WorkspacePageHeader
        title="Analysis Lab"
        subtitle="Live digit boards, binary probability analysis, and pattern scanning on volatility markets."
        action={tab === 'scan' ? undefined : null}
      />

      <div className="scanner-tool-toggle analysis-lab-tabs">
        <button type="button" className={`pill-toggle ${tab === 'boards' ? 'active' : ''}`} onClick={() => setTab('boards')}>Live boards</button>
        <button type="button" className={`pill-toggle ${tab === 'binary' ? 'active' : ''}`} onClick={() => setTab('binary')}>Binary panel</button>
        <button type="button" className={`pill-toggle ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')}>Pattern scan</button>
      </div>

      {tab === 'boards' && (
        <>
          <div className="analysis-lab-controls card">
            <label>
              Tick buffer
              <input type="number" min={20} max={500} value={bufferSize} onChange={(e) => setBufferSize(Number(e.target.value))} />
            </label>
            <span className="text-muted">Watching {boardSymbols.length} markets live</span>
          </div>
          <div className="analysis-boards-grid">
            {boardSymbols.map((sym) => (
              <AnalysisMarketCard
                key={sym}
                symbol={sym}
                displayName={symbolNames[sym]}
                stream={streams[sym]}
                bufferSize={bufferSize}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'binary' && (
        <BinaryAnalysisPanel
          symbol={selectedSymbol}
          stream={binaryStream}
          tradeType={tradeType}
          onTradeTypeChange={setTradeType}
          bufferSize={bufferSize}
          onBufferSizeChange={setBufferSize}
        />
      )}

      {tab === 'scan' && (
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
