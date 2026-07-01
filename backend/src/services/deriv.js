import { config } from '../config.js';

function derivHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Deriv-App-ID': config.deriv.appId,
    'Content-Type': 'application/json',
  };
}

export async function exchangeCodeForTokens(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.deriv.clientId,
    client_secret: config.deriv.clientSecret,
    code,
    redirect_uri: config.deriv.redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(config.deriv.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.deriv.clientId,
    client_secret: config.deriv.clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(config.deriv.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }
  return data;
}

export async function getAccounts(accessToken) {
  const res = await fetch(`${config.deriv.apiBase}/trading/v1/options/accounts`, {
    headers: derivHeaders(accessToken),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error?.message || 'Failed to fetch accounts');
  }
  return data;
}

export async function getWsOtp(accessToken, accountId) {
  const res = await fetch(
    `${config.deriv.apiBase}/trading/v1/options/accounts/${accountId}/otp`,
    {
      method: 'POST',
      headers: derivHeaders(accessToken),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error?.message || 'Failed to get WebSocket OTP');
  }
  return data;
}

export function buildAuthorizeUrl({ codeChallenge, state, register = false }) {
  const url = new URL(config.deriv.authUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.deriv.clientId);
  url.searchParams.set('redirect_uri', config.deriv.redirectUri);
  url.searchParams.set('scope', 'trade account_manage');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  if (register) {
    url.searchParams.set('prompt', 'registration');
    if (config.affiliate.utmSource) {
      url.searchParams.set('utm_medium', 'affiliate');
      url.searchParams.set('utm_source', config.affiliate.utmSource);
    }
    if (config.affiliate.utmCampaign) {
      url.searchParams.set('utm_campaign', config.affiliate.utmCampaign);
    }
    if (config.affiliate.sidc) {
      url.searchParams.set('sidc', config.affiliate.sidc);
    }
  }

  return url.toString();
}
