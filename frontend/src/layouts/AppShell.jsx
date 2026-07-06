import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Bot,
  Clock,
  Copy,
  Gauge,
  Hammer,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Radar,
  Sun,
  User,
  Workflow,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AccountModeBanner from '../components/AccountModeBanner';
import LiveTicker from '../components/LiveTicker';
import TradingFooter from '../components/TradingFooter';
import TradeSummaryPanel from '../components/TradeSummaryPanel';
import { TradingWsProvider } from '../context/TradingWsContext';
import { TradeSessionProvider } from '../context/TradeSessionContext';
import { TradingFooterProvider } from '../context/TradingFooterContext';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trade', label: 'Trade', icon: LineChart },
  { to: '/bulk', label: 'Bulk', icon: Zap },
  { to: '/scanner', label: 'Scanner', icon: Radar },
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/speedbot', label: 'Speedbot', icon: Sun },
  { to: '/automated', label: 'Automated', icon: Workflow },
  { to: '/builder', label: 'Builder', icon: Hammer },
  { to: '/copy', label: 'Copy', icon: Copy },
  { to: '/markets', label: 'Markets', icon: LayoutGrid },
  { to: '/chart', label: 'Chart', icon: Gauge },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/profile', label: 'Profile', icon: User },
];

const SUMMARY_ROUTES = ['/trade', '/bulk', '/scanner', '/bots', '/speedbot', '/automated', '/builder', '/chart', '/dashboard'];

function AppShellContent() {
  const { user } = useAuth();
  const location = useLocation();
  const selectedAccount = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);
  const showSummary = SUMMARY_ROUTES.some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-shell">
      <Navbar variant="app" />
      <LiveTicker />
      <div className="app-shell-body">
        <aside className="app-sidebar">
          <nav className="sidebar-nav">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="app-content-wrap">
          <main className="app-main">
            <AccountModeBanner
              account={selectedAccount}
              accountId={user?.selectedAccountId}
            />
            <Outlet />
          </main>
          {showSummary && <TradeSummaryPanel />}
        </div>
      </div>
      <TradingFooter />
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function AppShell() {
  return (
    <TradeSessionProvider>
      <TradingFooterProvider>
        <TradingWsProvider>
          <AppShellContent />
        </TradingWsProvider>
      </TradingFooterProvider>
    </TradeSessionProvider>
  );
}

export function DashboardRedirect() {
  return <Navigate to="/dashboard" replace />;
}
