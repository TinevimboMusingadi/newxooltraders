#!/usr/bin/env node
/**
 * Smoke test for backend health, setup status, and OAuth guard.
 * Run with backend on PORT=4000: node scripts/smoke-test.mjs
 */

const BASE = process.env.API_URL || 'http://localhost:4000';

async function run() {
  const health = await fetch(`${BASE}/health`);
  if (!health.ok) throw new Error('Health check failed');
  const healthData = await health.json();
  console.log('✓ Health:', healthData.status);

  const config = await fetch(`${BASE}/api/config/public`);
  if (!config.ok) throw new Error('Public config failed');
  const configData = await config.json();
  console.log('✓ Setup status:', {
    oauthReady: configData.oauthReady,
    appIdReady: configData.appIdReady,
    patReady: configData.patReady,
    missing: configData.missing,
  });

  const me = await fetch(`${BASE}/auth/me`);
  const meData = await me.json();
  console.log('✓ Auth me (unauthenticated):', meData.authenticated === false ? 'ok' : meData);

  const login = await fetch(`${BASE}/auth/login`, { redirect: 'manual' });
  const location = login.headers.get('location') || '';

  if (configData.oauthReady) {
    if (login.status !== 302) throw new Error(`Expected 302 from login, got ${login.status}`);
    if (/client_id=(?:&|$)/.test(location)) {
      throw new Error(`OAuth redirect has empty client_id: ${location}`);
    }
    if (!location.includes('auth.deriv.com')) {
      throw new Error(`Expected Deriv OAuth redirect, got: ${location}`);
    }
    console.log('✓ Login redirect: OAuth URL with client_id');
  } else {
    if (login.status !== 302) throw new Error(`Expected 302 from login guard, got ${login.status}`);
    if (!location.includes('error=') || location.includes('auth.deriv.com')) {
      throw new Error(`Expected local error redirect when OAuth not configured, got: ${location}`);
    }
    console.log('✓ Login guard: blocked OAuth (not configured)');
  }

  console.log('\nSmoke test passed.');
}

run().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
