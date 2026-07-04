import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import asset4 from '../assets/asset4.svg';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import AuthCTA from '../components/AuthCTA';
import { getAccountMode } from '../lib/accountDisplay';

export default function Navbar({ variant = 'landing' }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isAuthenticated = user?.authenticated;

  useEffect(() => {
    if (variant !== 'landing') return;
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

  const selectedAccount = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);
  const accountMode = isAuthenticated
    ? getAccountMode(selectedAccount, user?.selectedAccountId)
    : null;

  const navContent = (
    <>
      {variant === 'app' && isAuthenticated && (
        <Link to="/profile" className="nav-link" onClick={() => setMobileOpen(false)}>Profile</Link>
      )}
      {variant === 'landing' && (
        <>
          <a href="#features" className="nav-link" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#reviews" className="nav-link" onClick={() => setMobileOpen(false)}>Reviews</a>
        </>
      )}
      {isAuthenticated && accountMode && variant === 'app' && (
        <span className={`nav-account-badge ${accountMode.badgeClass}`}>{accountMode.shortLabel}</span>
      )}
      <button type="button" className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {isAuthenticated ? (
        <button type="button" className="btn btn-secondary nav-btn" onClick={() => { logout(); setMobileOpen(false); }}>
          Log Out
        </button>
      ) : (
        <AuthCTA variant="nav" />
      )}
    </>
  );

  return (
    <nav className={`navbar ${variant === 'app' || isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="logo" onClick={() => setMobileOpen(false)}>
          <img src={asset4} alt="Newxool Traders Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          newxool<span>traders</span>
        </Link>

        <div className={`nav-links ${mobileOpen ? 'nav-links-open' : ''}`}>
          {navContent}
        </div>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X color="#fff" size={24} /> : <Menu color="#fff" size={24} />}
        </button>
      </div>
    </nav>
  );
}
