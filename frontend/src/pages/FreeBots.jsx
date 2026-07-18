import { Link, useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { BOT_PRESETS, DIGIT_MATCH_V25_PRESET } from '../lib/strategyRunner';
import { STRATEGY_PACKS } from '../lib/tickAnalysisEngine';
import { useSaveBotConfig } from '../hooks/queries';
import { useMarket } from '../context/MarketContext';
import { useBotDesk } from '../context/BotDeskContext';
import { toast } from 'sonner';
import WorkspacePageHeader from '../components/WorkspacePageHeader';
import { persistBotRun } from '../lib/botRunSession';

const ALL_PRESETS = [...BOT_PRESETS, ...STRATEGY_PACKS.filter((p) => !BOT_PRESETS.some((b) => b.id === p.id))];

function ExactParamCard({ preset, onStart, onLoad }) {
  const c = preset.config || {};
  const rows = [
    ['Market', c.marketLabel || c.symbol],
    ['Trade type', c.tradeTypeLabel || '—'],
    ['Contract type', c.contractTypeLabel || c.contractSide || '—'],
    ['Default candle interval', c.candleIntervalLabel || '—'],
    ['Restart buy/sell on error', c.restartBuySellOnError ? 'On' : 'Off'],
    ['Restart last trade on error', c.restartLastTradeOnError ? 'On' : 'Off'],
    ['Win amount', c.winAmount],
    ['stake', c.stakeFromWinAmount ? 'Win amount' : c.baseStake],
    ['prediction', c.prediction],
    ['Take profit', c.takeProfit],
    ['stop loss', c.stopLoss],
    ['Martingale', c.martingale ?? c.multiplier],
    ['maxStake', c.maxStakeFromWinAmount ? 'Win amount' : c.maxStake],
  ];

  return (
    <div className="card bot-gallery-card bot-exact-card">
      <h3>{preset.name}</h3>
      <p className="text-muted">{preset.description}</p>
      <div className="bot-params-panel bot-params-panel--inline">
        <h4 className="heading-sm">Exact parameters</h4>
        <dl className="bot-params-list">
          {rows.map(([label, value]) => (
            <div key={label} className="bot-params-row">
              <dt>{label}</dt>
              <dd className="mono">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="bot-gallery-actions">
        <button type="button" className="btn btn-primary btn-xs bot-action-btn" onClick={onStart}>
          <Play size={12} /> Open bot view
        </button>
        <button type="button" className="btn btn-ghost btn-xs bot-action-btn" onClick={onLoad}>Load</button>
        <Link to="/bots" className="btn btn-ghost btn-xs bot-action-btn">Hub</Link>
      </div>
    </div>
  );
}

export default function FreeBots() {
  const { selectedSymbol, selectSymbol } = useMarket();
  const { loadBot } = useBotDesk();
  const saveMutation = useSaveBotConfig();
  const navigate = useNavigate();

  const load = (preset) => {
    const symbol = preset.config?.symbol || selectedSymbol;
    saveMutation.mutate(
      { name: preset.name, config: preset.config, symbol },
      {
        onSuccess: () => toast.success(`${preset.name} loaded — open Hub or Bot View to run`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const startInBotView = (preset) => {
    const symbol = preset.config?.symbol || selectedSymbol;
    if (preset.config?.symbol) selectSymbol(preset.config.symbol);
    const payload = {
      name: preset.name,
      config: { ...preset.config, symbol },
      presetId: preset.id,
    };
    persistBotRun(payload);
    loadBot(payload);
    navigate('/bots/run', { state: payload });
  };

  const packs = [...new Set(ALL_PRESETS.map((p) => p.pack || 'Core'))];
  const exact = DIGIT_MATCH_V25_PRESET;
  const others = ALL_PRESETS.filter((p) => p.id !== exact.id);

  return (
    <div className="bots-gallery-page">
      <WorkspacePageHeader
        title="Free Strategies"
        subtitle="Exact Deriv-style presets and signal templates — Start opens the Bot Trading View."
      />

      <section className="strategy-pack-section">
        <h2 className="heading-md">Deriv Exact pack</h2>
        <div className="bots-gallery-grid bots-gallery-grid--featured">
          <ExactParamCard
            preset={exact}
            onStart={() => startInBotView(exact)}
            onLoad={() => load(exact)}
          />
        </div>
      </section>

      {packs.filter((p) => p !== 'Deriv Exact').map((pack) => (
        <section key={pack} className="strategy-pack-section">
          <h2 className="heading-md">{pack} pack</h2>
          <div className="bots-gallery-grid">
            {others.filter((p) => (p.pack || 'Core') === pack).map((p) => (
              <div key={p.id} className="card bot-gallery-card">
                <h3>{p.name}</h3>
                <p className="text-muted">{p.description || `Stake $${p.config.baseStake} · TP $${p.config.takeProfit} · SL $${p.config.stopLoss}`}</p>
                <div className="bot-gallery-actions">
                  <button type="button" className="btn btn-primary btn-xs bot-action-btn" onClick={() => startInBotView(p)}>
                    <Play size={12} /> Open bot view
                  </button>
                  <button type="button" className="btn btn-ghost btn-xs bot-action-btn" onClick={() => load(p)}>Load</button>
                  <Link to="/bots" className="btn btn-ghost btn-xs bot-action-btn">Hub</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
