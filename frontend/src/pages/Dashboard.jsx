import { Link } from 'react-router-dom';
import { Bot, FolderOpen, Rocket, Hand } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import { useLiveSignals } from '../hooks/queries';
import { CardSkeleton } from '../components/ui/Skeleton';

const ACTION_CARDS = [
  { to: '/builder', icon: FolderOpen, title: 'Load Bot', desc: 'Open your saved trading strategy.' },
  { to: '/bots/free', icon: Bot, title: 'Free Strategies', desc: 'Preset signal-driven strategies.' },
  { to: '/speedbot', icon: Rocket, title: 'Speed Bot', desc: 'One-click automated trading.' },
  { to: '/trade', icon: Hand, title: 'Manual Trading', desc: 'Full control — trade your way.' },
];

export default function Dashboard() {
  const { data, isLoading, error } = useLiveSignals();
  const signals = data?.signals || [];

  return (
    <div className="dashboard-page">
      <div className="page-header-block">
        <h1 className="heading-lg">Dashboard</h1>
        <p className="text-secondary">Live volatility signals and quick access to trading tools.</p>
      </div>

      <div className="dashboard-actions">
        {ACTION_CARDS.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="dashboard-action-card card">
            <Icon size={28} className="dashboard-action-icon" />
            <h3>{title}</h3>
            <p className="text-muted">{desc}</p>
          </Link>
        ))}
      </div>

      <section className="live-signals-section">
        <div className="live-signals-header">
          <h2 className="heading-md">Live Trading Signals</h2>
          <span className="live-badge">live</span>
        </div>

        {error && <p className="auth-error-banner">{error.message}</p>}

        {isLoading && (
          <div className="signals-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card"><CardSkeleton lines={4} /></div>
            ))}
          </div>
        )}

        {!isLoading && signals.length > 0 && (
          <div className="signals-grid">
            {signals.slice(0, 4).map((sig) => (
              <SignalCard key={sig.symbol} signal={sig} />
            ))}
          </div>
        )}

        {!isLoading && !signals.length && !error && (
          <p className="text-muted">
            {data?.error
              ? `Signals unavailable: ${data.error}`
              : 'No volatility signals right now — Deriv may be slow or markets are flat.'}
          </p>
        )}
      </section>
    </div>
  );
}
