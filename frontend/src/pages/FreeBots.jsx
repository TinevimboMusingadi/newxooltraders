import { Link } from 'react-router-dom';
import { BOT_PRESETS } from '../lib/strategyRunner';
import { STRATEGY_PACKS } from '../lib/tickAnalysisEngine';
import { useSaveBotConfig } from '../hooks/queries';
import { useMarket } from '../context/MarketContext';
import { toast } from 'sonner';
import WorkspacePageHeader from '../components/WorkspacePageHeader';

const ALL_PRESETS = [...BOT_PRESETS, ...STRATEGY_PACKS.filter((p) => !BOT_PRESETS.some((b) => b.id === p.id))];

export default function FreeBots() {
  const { selectedSymbol } = useMarket();
  const saveMutation = useSaveBotConfig();

  const load = (preset) => {
    saveMutation.mutate(
      { name: preset.name, config: preset.config, symbol: selectedSymbol },
      {
        onSuccess: () => toast.success(`${preset.name} loaded — open Hub to run`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const packs = [...new Set(ALL_PRESETS.map((p) => p.pack || 'Core'))];

  return (
    <div className="bots-gallery-page">
      <WorkspacePageHeader
        title="Free Strategies"
        subtitle="Signal-driven templates with clear rules — execution uses live tick data, not timers pretending to be AI."
      />

      {packs.map((pack) => (
        <section key={pack} className="strategy-pack-section">
          <h2 className="heading-md">{pack} pack</h2>
          <div className="bots-gallery-grid">
            {ALL_PRESETS.filter((p) => (p.pack || 'Core') === pack).map((p) => (
              <div key={p.id} className="card bot-gallery-card">
                <h3>{p.name}</h3>
                <p className="text-muted">{p.description || `Stake $${p.config.baseStake} · TP $${p.config.takeProfit} · SL $${p.config.stopLoss}`}</p>
                <div className="bot-gallery-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => load(p)}>Load preset</button>
                  <Link to="/bots" className="btn btn-ghost btn-sm">Open Hub</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
