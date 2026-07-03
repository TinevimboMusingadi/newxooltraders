import 'dotenv/config';

const required = ['DERIV_APP_ID', 'DERIV_REDIRECT_URI', 'SESSION_SECRET', 'FRONTEND_URL'];

function validateConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV === 'production') {
    console.warn(`Missing env vars: ${missing.join(', ')}`);
  }
}

validateConfig();

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  deriv: {
    appId: process.env.DERIV_APP_ID || '',
    clientId: process.env.DERIV_CLIENT_ID || process.env.DERIV_APP_ID || '',
    clientSecret: process.env.DERIV_CLIENT_SECRET || '',
    redirectUri: process.env.DERIV_REDIRECT_URI || 'http://localhost:5173/auth/callback',
    authUrl: 'https://auth.deriv.com/oauth2/auth',
    tokenUrl: 'https://auth.deriv.com/oauth2/token',
    apiBase: 'https://api.derivws.com',
    publicWs: 'wss://api.derivws.com/trading/v1/options/ws/public',
  },
  affiliate: {
    utmSource: process.env.AFFILIATE_UTM_SOURCE || '',
    utmCampaign: process.env.AFFILIATE_UTM_CAMPAIGN || '',
    sidc: process.env.AFFILIATE_SIDC || '',
  },
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL || '',
  patToken: process.env.DERIV_PAT_TOKEN || '',
};
