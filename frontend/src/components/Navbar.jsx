import { Link } from 'react-router-dom';
import asset4 from '../assets/asset4.svg';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';
import { authUrls } from '../lib/api';

export default function Navbar({ variant = 'landing' }) {
  const { user, logout } = useAuth();
  const { setup } = useSetupStatus();
  const isAuthenticated = user?.authenticated;
  const oauthReady = setup?.oauthReady ?? false;

  return (
    <nav className={`navbar ${variant === 'app' ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="logo">
          <img src={asset4} alt="Newxool Traders Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          newxool<span>traders</span>
        </Link>

        <div className="nav-links">
          {variant === 'app' && isAuthenticated && (
            <>
              <Link to="/trade" className="nav-link">Trade</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
            </>
          )}
          {variant === 'landing' && (
            <>
              <a href="#features" className="nav-link">Features</a>
              <a href="#reviews" className="nav-link">Reviews</a>
            </>
          )}
          {isAuthenticated ? (
            <button type="button" className="btn btn-secondary nav-btn" onClick={logout}>
              Log Out
            </button>
          ) : oauthReady ? (
            <>
              <a href={authUrls.login} className="btn btn-secondary nav-btn">Log In</a>
              <a href={authUrls.register} className="btn btn-primary nav-btn">Get Started</a>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
