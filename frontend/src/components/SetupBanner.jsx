import { useSetupStatus } from '../hooks/useSetupStatus';

export default function SetupBanner() {
  const { setup, loading } = useSetupStatus();

  if (loading || !setup) return null;
  if (setup.oauthReady && setup.appIdReady) return null;

  if (!import.meta.env.DEV) {
    return (
      <div className="setup-banner setup-banner-prod">
        Trading sign-in is being connected. Check back soon.
      </div>
    );
  }

  const missing = setup.missing?.filter((k) => k !== 'DERIV_PAT_TOKEN') || [];

  return (
    <div className="setup-banner">
      <strong>Deriv setup incomplete.</strong>{' '}
      Create a <strong>Web-based app</strong> at{' '}
      <a href="https://developers.deriv.com" target="_blank" rel="noopener noreferrer">
        developers.deriv.com
      </a>{' '}
      with redirect <code>http://localhost:5173/auth/callback</code>, then paste into{' '}
      <code>backend/.env</code>
      {missing.length > 0 && <> — missing: {missing.join(', ')}</>}
      {setup.patReady && <> · Use <strong>Dev login</strong> link to test while OAuth is pending.</>}
    </div>
  );
}
