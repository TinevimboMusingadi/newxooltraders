import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authUrls } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';

export default function AuthCTA({ variant = 'hero', layout = 'row', className = '' }) {
  const { user } = useAuth();
  const { setup } = useSetupStatus();
  const oauthReady = setup?.oauthReady ?? false;
  const patReady = setup?.patReady ?? false;
  const isAuthenticated = user?.authenticated;

  const isHero = variant === 'hero';
  const isFooter = variant === 'footer';
  const btnPrimary = isFooter
    ? 'btn btn-primary'
    : isHero
      ? 'btn btn-primary'
      : 'btn btn-primary nav-btn';
  const btnSecondary = isFooter
    ? 'btn btn-secondary'
    : isHero
      ? 'btn btn-secondary'
      : 'btn btn-secondary nav-btn';

  const layoutClass = layout === 'stack' ? 'auth-cta-stack' : 'auth-cta-row';

  if (isAuthenticated) {
    return (
      <div className={`auth-cta ${layoutClass} ${className}`}>
        <Link to="/trade" className={btnPrimary}>
          Open Trader
          {isHero && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
        </Link>
      </div>
    );
  }

  if (oauthReady) {
    return (
      <div className={`auth-cta ${layoutClass} ${className}`}>
        <a href={authUrls.register} className={btnPrimary}>
          Get Started
          {isHero && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
        </a>
        {variant === 'nav' ? (
          <Link to="/login" className={btnSecondary}>
            Log In
          </Link>
        ) : (
          <a href={authUrls.login} className={btnSecondary}>
            Log In
          </a>
        )}
        {import.meta.env.DEV && patReady && (
          <a href={`${import.meta.env.VITE_API_URL || ''}/auth/dev-login`} className="auth-cta-dev-link">
            Dev login
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`auth-cta ${layoutClass} ${className}`}>
      <button
        type="button"
        className={`${btnPrimary} auth-cta-disabled`}
        disabled
        title="Connecting to Deriv — available once platform is configured"
      >
        Get Started
      </button>
      <button
        type="button"
        className={`${btnSecondary} auth-cta-disabled`}
        disabled
        title="Connecting to Deriv — available once platform is configured"
      >
        Log In
      </button>
      {import.meta.env.DEV && patReady && (
        <a href={`${import.meta.env.VITE_API_URL || ''}/auth/dev-login`} className="auth-cta-dev-link">
          Dev login
        </a>
      )}
      {!import.meta.env.DEV && (
        <p className="auth-cta-hint text-muted">Sign-in with Deriv coming soon.</p>
      )}
    </div>
  );
}
