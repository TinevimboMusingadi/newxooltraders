import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { usePanelState } from '../hooks/usePanelState';

const NAV_GROUPS = [
  {
    id: 'trading',
    label: 'Trading',
    defaultOpen: true,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/trade', label: 'Trade', icon: LineChart },
      { to: '/markets', label: 'Markets', icon: LayoutGrid },
      { to: '/chart', label: 'Chart', icon: Gauge },
      { to: '/bulk', label: 'Bulk', icon: Zap },
      { to: '/scanner', label: 'Scanner', icon: Radar },
    ],
  },
  {
    id: 'bots',
    label: 'Automation',
    defaultOpen: false,
    items: [
      { to: '/bots', label: 'Apex Bot', icon: Bot },
      { to: '/speedbot', label: 'Speedbot', icon: Sun },
      { to: '/automated', label: 'Automated', icon: Workflow },
      { to: '/builder', label: 'Builder', icon: Hammer },
      { to: '/copy', label: 'Copy', icon: Copy },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    defaultOpen: false,
    items: [
      { to: '/history', label: 'History', icon: Clock },
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
];

function NavGroup({ group, sidebarCollapsed }) {
  const { open, toggle } = usePanelState(`nav-${group.id}`, group.defaultOpen);

  if (sidebarCollapsed) {
    return (
      <div className="sidebar-group sidebar-group-icons">
        {group.items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) => `sidebar-link sidebar-link-icon ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div className={`sidebar-group ${open ? 'open' : 'closed'}`}>
      <button type="button" className="sidebar-group-toggle" onClick={toggle} aria-expanded={open}>
        <span>{group.label}</span>
        <ChevronDown size={14} className={`sidebar-group-chevron ${open ? 'rotated' : ''}`} />
      </button>
      {open && (
        <div className="sidebar-group-items">
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppSidebar() {
  const { open: expanded, toggle: toggleSidebar } = usePanelState('sidebar-expanded', false);
  const collapsed = !expanded;

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-nav">
        <div className="sidebar-top">
          {!collapsed && <span className="sidebar-brand">Menu</span>}
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.id} group={group} sidebarCollapsed={collapsed} />
        ))}
      </div>
    </aside>
  );
}
