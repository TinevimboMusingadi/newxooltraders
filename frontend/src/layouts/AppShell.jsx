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
  Sparkles,
  Sun,
  User,
  Workflow,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AppSidebar from '../components/AppSidebar';
import LiveTicker from '../components/LiveTicker';
import TradingFooter from '../components/TradingFooter';
import TradeSummaryPanel from '../components/TradeSummaryPanel';
import BotLiveChip from '../components/BotLiveChip';
import { TradingWsProvider } from '../context/TradingWsContext';
import { TradeSessionProvider } from '../context/TradeSessionContext';
import { TradingFooterProvider } from '../context/TradingFooterContext';
import { BotDeskProvider } from '../context/BotDeskContext';

/** Full app destinations — scroll left/right on mobile + desktop strip */
const APP_SCROLL_NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/trade', label: 'Trade', icon: LineChart },
  { to: '/markets', label: 'Markets', icon: LayoutGrid },
  { to: '/chart', label: 'Chart', icon: Gauge },
  { to: '/bulk', label: 'Bulk', icon: Zap },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/bots', label: 'Hub', icon: Bot },
  { to: '/bots/free', label: 'Free', icon: LayoutGrid },
  { to: '/bots/run', label: 'Bot desk', icon: LineChart },
  { to: '/scanner', label: 'Analysis', icon: Radar },
  { to: '/bots/ai', label: 'Signals', icon: Sparkles },
  { to: '/speedbot', label: 'Speedbot', icon: Sun },
  { to: '/automated', label: 'Rules', icon: Workflow },
  { to: '/builder', label: 'Builder', icon: Hammer },
  { to: '/copy', label: 'Copy', icon: Copy },
  { to: '/profile', label: 'Profile', icon: User },
];

const SUMMARY_ROUTES = ['/bulk', '/scanner', '/bots', '/speedbot', '/automated', '/builder', '/dashboard'];

const TRADE_ROUTES = ['/trade', '/chart'];
const BOT_DESK_ROUTES = ['/bots/run'];

function ScrollNav({ className, ariaLabel }) {
  return (
    <nav className={className} aria-label={ariaLabel}>
      <div className="app-scroll-nav-track">
        {APP_SCROLL_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `app-scroll-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AppShellContent() {
  const location = useLocation();
  const isBotDesk = BOT_DESK_ROUTES.some((p) => location.pathname.startsWith(p));
  const isTradeView = TRADE_ROUTES.some((p) => location.pathname.startsWith(p)) || isBotDesk;
  const showSummary = !isBotDesk && SUMMARY_ROUTES.some((p) => location.pathname.startsWith(p));

  return (
    <div className={`app-shell workspace-shell ${isTradeView ? 'app-shell--trade' : ''} ${isBotDesk ? 'app-shell--bot-desk' : ''}`}>
      <Navbar variant="app" compact={isTradeView} />
      <LiveTicker defaultOpen={!isTradeView && !isBotDesk} />
      <ScrollNav className="app-scroll-nav app-scroll-nav--desktop" ariaLabel="App sections" />
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
      <BotLiveChip />
      <ScrollNav className="app-scroll-nav app-scroll-nav--mobile" ariaLabel="Mobile navigation" />
    </div>
  );
}

export default function AppShell() {
  return (
    <TradeSessionProvider>
      <TradingFooterProvider>
        <TradingWsProvider>
          <BotDeskProvider>
            <AppShellContent />
          </BotDeskProvider>
        </TradingWsProvider>
      </TradingFooterProvider>
    </TradeSessionProvider>
  );
}

export function DashboardRedirect() {
  return <Navigate to="/dashboard" replace />;
}
