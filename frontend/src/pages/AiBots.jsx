import { Link } from 'react-router-dom';
import { useLiveSignals } from '../hooks/queries';
import { BOT_PRESETS } from '../lib/strategyRunner';
import { useMarket } from '../context/MarketContext';
import { CardSkeleton } from '../components/ui/Skeleton';

export default function AiBots() {
  const { data, isLoading } = useLiveSignals();
  const { selectSymbol } = useMarket();
  const signals = data?.signals || [];

  const ranked = signals.slice(0, 4).map((sig, i) => ({
    ...sig,
    preset: BOT_PRESETS[i % BOT_PRESETS.length],
  }));

  return (
    <div className="bots-gallery-page">
      <div className="page-header-block">
        <h1 className="heading-lg">AI Bots</h1>
        <p className="text-secondary">Signal-ranked presets from live digit statistics (not black-box ML).</p>
      </div>

      {isLoading && <CardSkeleton lines={3} />}

      <div className="bots-gallery-grid">
        {ranked.map((item) => (
          <div key={item.symbol} className="card bot-gallery-card">
            <h3>{item.preset.name}</h3>
            <p className="text-muted">{item.symbol} · {item.label} · {item.confidence.toFixed(1)}% confidence</p>
            <div className="bot-gallery-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => selectSymbol(item.symbol)}>
                Use {item.symbol}
              </button>
              <Link to={`/bulk?symbol=${item.symbol}&type=${item.contractType}`} className="btn btn-ghost btn-sm">Trade signal</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
