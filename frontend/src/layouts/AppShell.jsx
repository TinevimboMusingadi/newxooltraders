import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Bot,
  LayoutDashboard,
  LineChart,
  Radar,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
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
  { to: '/scanner', label: 'Analysis', icon: Radar },
  { to: '/bots', label: 'Hub', icon: Bot },
];

const SUMMARY_ROUTES = ['/bulk', '/scanner', '/bots', '/speedbot', '/automated', '/builder', '/dashboard'];

const TRADE_ROUTES = ['/trade', '/chart'];
const BOT_DESK_ROUTES = ['/bots/run'];

function AppShellContent() {
  const location = useLocation();
  const isBotDesk = BOT_DESK_ROUTES.some((p) => location.pathname.startsWith(p));
  const isTradeView = TRADE_ROUTES.some((p) => location.pathname.startsWith(p)) || isBotDesk;
  const showSummary = !isBotDesk && SUMMARY_ROUTES.some((p) => location.pathname.startsWith(p));

  return (
    <div className={`app-shell workspace-shell ${isTradeView ? 'app-shell--trade' : ''} ${isBotDesk ? 'app-shell--bot-desk' : ''}`}>
      <Navbar variant="app" compact={isTradeView} />
      <LiveTicker defaultOpen={!isTradeView && !isBotDesk} />
      <div className="app-shell-body">
        <AppSidebar />
        <div className="app-content-wrap">
          <main className={`app-main ${isTradeView ? 'app-main--trade' : 'workspace-page'}`}>
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
