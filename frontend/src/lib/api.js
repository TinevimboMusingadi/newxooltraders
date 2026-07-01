const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getPublicConfig: () => request('/api/config/public'),
  getAccounts: () => request('/api/trading/accounts'),
  selectAccount: (accountId) =>
    request('/api/trading/accounts/select', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    }),
  getWsOtp: (accountId) =>
    request('/api/trading/ws-otp', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    }),
};

export const authUrls = {
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
};
