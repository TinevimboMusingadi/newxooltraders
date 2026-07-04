import { NavLink, Outlet } from 'react-router-dom';
import {
  Bot,
  Copy,
  LayoutGrid,
  LineChart,
  Radar,
  User,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AccountModeBanner from '../components/AccountModeBanner';
import { TradingWsProvider } from '../context/TradingWsContext';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/trade', label: 'Trade', icon: LineChart },
  { to: '/markets', label: 'Markets', icon: LayoutGrid },
  { to: '/scanner', label: 'Scanner', icon: Radar },
  { to: '/bulk', label: 'Bulk', icon: Zap },
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/copy', label: 'Copy', icon: Copy },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function AppShell() {
  const { user } = useAuth();
  const selectedAccount = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);

  return (
    <div className="app-shell">
      <Navbar variant="app" />
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
        <main className="app-main">
          <AccountModeBanner
            account={selectedAccount}
            accountId={user?.selectedAccountId}
          />
          <TradingWsProvider>
            <Outlet />
          </TradingWsProvider>
        </main>
      </div>
    </div>
  );
}
