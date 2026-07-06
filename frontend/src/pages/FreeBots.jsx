import { Link } from 'react-router-dom';
import { BOT_PRESETS } from '../lib/strategyRunner';
import { useSaveBotConfig } from '../hooks/queries';
import { useMarket } from '../context/MarketContext';
import { toast } from 'sonner';

export default function FreeBots() {
  const { selectedSymbol } = useMarket();
  const saveMutation = useSaveBotConfig();

  const load = (preset) => {
    saveMutation.mutate(
      { name: preset.name, config: preset.config, symbol: selectedSymbol },
      {
        onSuccess: () => toast.success(`${preset.name} loaded — open Bots to run`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="bots-gallery-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Free Bots</h1>
        <p className="text-secondary">Preset strategies — one click to save and run on Apex Bot.</p>
      </div>
      <div className="bots-gallery-grid">
        {BOT_PRESETS.map((p) => (
          <div key={p.id} className="card bot-gallery-card">
            <h3>{p.name}</h3>
            <p className="text-muted">Stake ${p.config.baseStake} · TP ${p.config.takeProfit} · SL ${p.config.stopLoss}</p>
            <div className="bot-gallery-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => load(p)}>Load preset</button>
              <Link to="/bots" className="btn btn-ghost btn-sm">Open Apex</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
