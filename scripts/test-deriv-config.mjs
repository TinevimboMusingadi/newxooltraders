#!/usr/bin/env node
/**
 * Validates Deriv credentials in backend/.env by calling the accounts API.
 * Loads backend/.env automatically. Requires backend NOT running for direct API test.
 *
 * Usage: node scripts/test-deriv-config.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../backend/.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('✗ backend/.env not found — copy from backend/.env.example');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function testAccounts(appId, token) {
  const res = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Deriv-App-ID': appId,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  const env = loadEnv();
  const checks = [
    { key: 'DERIV_APP_ID', value: env.DERIV_APP_ID },
    { key: 'DERIV_CLIENT_ID', value: env.DERIV_CLIENT_ID },
    { key: 'DERIV_CLIENT_SECRET', value: env.DERIV_CLIENT_SECRET },
    { key: 'DERIV_PAT_TOKEN', value: env.DERIV_PAT_TOKEN },
  ];

  console.log('Deriv config check (backend/.env)\n');

  let allPresent = true;
  for (const { key, value } of checks) {
    const ok = Boolean(value);
    console.log(`${ok ? '✓' : '✗'} ${key}${ok ? '' : ' — missing'}`);
    if (!ok && key !== 'DERIV_CLIENT_SECRET') allPresent = false;
  }

  if (!env.DERIV_APP_ID || !env.DERIV_PAT_TOKEN) {
    console.log('\n→ Add DERIV_APP_ID and DERIV_PAT_TOKEN to test API connection.');
    console.log('  Create Web-based app at developers.deriv.com → copy App ID');
    console.log('  Create PAT under same app with Trade + Account management scopes');
    process.exit(1);
  }

  console.log('\nTesting PAT + App ID against Deriv API...');
  const result = await testAccounts(env.DERIV_APP_ID, env.DERIV_PAT_TOKEN);

  if (result.ok) {
    const accounts = result.data.data || [];
    console.log(`✓ API connection OK — ${accounts.length} account(s) found`);
    for (const a of accounts.slice(0, 3)) {
      const id = a.loginid || a.account_id;
      const type = a.is_virtual ? 'demo' : 'real';
      console.log(`  · ${id} (${type})`);
    }
    if (!env.DERIV_CLIENT_ID) {
      console.log('\n⚠ DERIV_CLIENT_ID missing — Log In / Register will stay disabled until OAuth app credentials are set');
    } else {
      console.log('\n✓ OAuth credentials present — Log In / Register should work (unless IP blocked on auth.deriv.com)');
    }
    process.exit(0);
  }

  const msg = result.data.message || result.data.error?.message || JSON.stringify(result.data);
  console.error(`✗ API failed (${result.status}): ${msg}`);
  console.error('\nCommon fixes:');
  console.error('  · App ID must match the app that issued the PAT');
  console.error('  · PAT must be OAuth/Web app type with Trade + Account management scopes');
  console.error('  · Regenerate PAT if expired or revoked');
  process.exit(1);
}

run().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
