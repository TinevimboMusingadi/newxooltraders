import { config } from '../config.js';

export function getSetupStatus() {
  const missing = [];
  if (!config.deriv.appId) missing.push('DERIV_APP_ID');
  if (!config.deriv.clientId) missing.push('DERIV_CLIENT_ID');
  if (!config.deriv.clientSecret) missing.push('DERIV_CLIENT_SECRET');
  if (!config.patToken) missing.push('DERIV_PAT_TOKEN');

  return {
    oauthReady: Boolean(config.deriv.clientId && config.deriv.clientSecret),
    appIdReady: Boolean(config.deriv.appId),
    patReady: Boolean(config.patToken),
    tradingReady: Boolean(config.deriv.appId && config.patToken),
    missing,
    publicWs: config.deriv.publicWs,
    defaultSymbol: '1HZ100V',
  };
}
