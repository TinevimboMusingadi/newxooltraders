import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Bot,
  LayoutDashboard,
  LineChart,
  Radar,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AccountModeBanner from '../components/AccountModeBanner';
import AppSidebar from '../components/AppSidebar';
import LiveTicker from '../components/LiveTicker';
import TradingFooter from '../components/TradingFooter';
import TradeSummaryPanel from '../components/TradeSummaryPanel';
import { TradingWsProvider } from '../context/TradingWsContext';
import { TradeSessionProvider } from '../context/TradeSessionContext';
import { TradingFooterProvider } from '../context/TradingFooterContext';
import { useAuth } from '../hooks/useAuth';

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/trade', label: 'Trade', icon: LineChart },
  { to: '/bulk', label: 'Bulk', icon: Zap },
  { to: '/scanner', label: 'Scan', icon: Radar },
  { to: '/bots', label: 'Bots', icon: Bot },
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
        <AppSidebar />
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
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
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
