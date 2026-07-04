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
  createDemoAccount: () =>
    request('/api/trading/accounts/create-demo', { method: 'POST' }),
  resetDemoBalance: (accountId) =>
    request(`/api/trading/accounts/${accountId}/reset-demo`, { method: 'POST' }),
  getWsOtp: (accountId) =>
    request('/api/trading/ws-otp', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    }),
  getSymbols: () => request('/api/markets/symbols'),
  getBotConfigs: () => request('/api/bots/configs'),
  saveBotConfig: (config) =>
    request('/api/bots/configs', { method: 'POST', body: JSON.stringify(config) }),
  deleteBotConfig: (id) =>
    request(`/api/bots/configs/${id}`, { method: 'DELETE' }),
  enableCopyProvider: () => request('/api/copy/provider', { method: 'POST' }),
  getCopyProvider: () => request('/api/copy/provider'),
  subscribeCopy: (providerCode, riskPct) =>
    request('/api/copy/subscribe', {
      method: 'POST',
      body: JSON.stringify({ providerCode, riskPct }),
    }),
  getCopySubscriptions: () => request('/api/copy/subscriptions'),
  unsubscribeCopy: (id) => request(`/api/copy/subscribe/${id}`, { method: 'DELETE' }),
  reportCopyTrade: (payload) =>
    request('/api/copy/trade', { method: 'POST', body: JSON.stringify(payload) }),
  getPendingCopyJobs: () => request('/api/copy/jobs/pending'),
  completeCopyJob: (id, result) =>
    request(`/api/copy/jobs/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(result),
    }),
  getCopyJobs: () => request('/api/copy/jobs'),
  getProfitTable: ({ from, to, limit, offset } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    return request(`/api/history/profit-table?${params}`);
  },
  getStatement: ({ from, to, actionType, limit } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (actionType) params.set('action_type', actionType);
    if (limit) params.set('limit', limit);
    return request(`/api/history/statement?${params}`);
  },
  getContractsFor: (symbol) => request(`/api/markets/contracts/${symbol}`),
  getLiveSymbols: () => request('/api/markets/symbols/live'),
};

export const authUrls = {
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
};
