import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AuthCTA from '../components/AuthCTA';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyAuthError } from '../lib/authErrors';

export default function Login() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const authError = getFriendlyAuthError(searchParams.get('error'));

  useEffect(() => {
    const raw = searchParams.get('error');
    if (raw && import.meta.env.DEV) console.error('Auth error:', raw);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (user?.authenticated) {
    return <Navigate to="/trade" replace />;
  }

  return (
    <>
      <Navbar variant="landing" />
      <main className="login-page">
        <div className="container">
          <div className="login-card card">
            <h1 className="heading-lg">Sign in to trade</h1>
            <p className="text-secondary">
              Connect with your Deriv account to trade on demo or real. Deposits stay on Deriv — we
              never hold your funds.
            </p>

            {authError && <div className="auth-error-banner">{authError}</div>}

            <AuthCTA variant="hero" layout="stack" className="login-cta" />

            <p className="text-muted login-footer-note">
              New to Deriv?{' '}
              <strong>Get Started</strong> creates your account under our platform. Already have an
              account? use <strong>Log In</strong>.
            </p>

            <Link to="/" className="nav-link" style={{ display: 'inline-block', marginTop: '24px' }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
