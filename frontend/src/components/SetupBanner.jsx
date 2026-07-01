import { useSetupStatus } from '../hooks/useSetupStatus';

export default function SetupBanner() {
  const { setup, loading } = useSetupStatus();

  if (loading || !setup) return null;
  if (setup.oauthReady && setup.appIdReady) return null;

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
      {missing.length > 0 && (
        <>
          {' '}
          — missing: {missing.join(', ')}
        </>
      )}
      {setup.patReady && import.meta.env.DEV && (
        <> · Use <strong>Dev Login (PAT)</strong> to test while OAuth is pending.</>
      )}
    </div>
  );
}
