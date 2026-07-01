import { Router } from 'express';
import { config } from '../config.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  getAccounts,
} from '../services/deriv.js';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../services/pkce.js';

const router = Router();

const OAUTH_NOT_CONFIGURED =
  'OAuth not configured. Create a Web-based app at developers.deriv.com, then set DERIV_CLIENT_ID and DERIV_CLIENT_SECRET in backend/.env';

async function applyTokenSession(req, accessToken, { refreshToken, expiresIn } = {}) {
  let accounts = [];
  let accountError = null;

  if (!config.deriv.appId) {
    accountError = 'DERIV_APP_ID is missing in backend/.env — copy App ID from developers.deriv.com';
  } else {
    try {
      const accountData = await getAccounts(accessToken);
      accounts = accountData.data || accountData.accounts || [];
    } catch (err) {
      accountError = err.message || 'Failed to fetch accounts from Deriv API';
      console.error('[auth] getAccounts failed:', accountError);
    }
  }

  const demoAccount = accounts.find((a) => a.is_virtual || a.account_type === 'demo');
  const defaultAccount = demoAccount || accounts[0];

  req.session.accessToken = accessToken;
  if (refreshToken) req.session.refreshToken = refreshToken;
  req.session.expiresAt = Date.now() + (expiresIn || 3600) * 1000;
  req.session.lastAccountError = accountError;

  if (defaultAccount) {
    req.session.selectedAccountId = defaultAccount.account_id || defaultAccount.loginid;
  } else {
    delete req.session.selectedAccountId;
  }

  req.session.accounts = accounts.map((a) => ({
    accountId: a.account_id || a.loginid,
    loginid: a.loginid || a.account_id,
    currency: a.currency,
    isVirtual: Boolean(a.is_virtual),
    accountType: a.account_type || (a.is_virtual ? 'demo' : 'real'),
  }));
}

function startOAuth(req, res, register = false) {
  if (!config.deriv.clientId || !config.deriv.clientSecret) {
    return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(OAUTH_NOT_CONFIGURED)}`);
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  req.session.oauth = { codeVerifier, state, register };
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start auth session' });
    }
    res.redirect(buildAuthorizeUrl({ codeChallenge, state, register }));
  });
}

router.get('/login', (req, res) => startOAuth(req, res, false));
router.get('/register', (req, res) => startOAuth(req, res, true));

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(errorDescription || error)}`);
  }

  const saved = req.session.oauth;
  if (!saved || state !== saved.state) {
    return res.redirect(`${config.frontendUrl}/?error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${config.frontendUrl}/?error=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, saved.codeVerifier);
    delete req.session.oauth;
    await applyTokenSession(req, tokens.access_token, {
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    req.session.save((saveErr) => {
      if (saveErr) {
        return res.redirect(`${config.frontendUrl}/?error=session_save_failed`);
      }
      res.redirect(`${config.frontendUrl}/trade`);
    });
  } catch (err) {
    res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(err.message)}`);
  }
});

// Local dev only: sign in with PAT from .env (no OAuth redirect)
router.get('/dev-login', async (req, res) => {
  if (config.nodeEnv === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!config.patToken) {
    return res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent('DERIV_PAT_TOKEN not set in backend/.env')}`);
  }

  try {
    await applyTokenSession(req, config.patToken, { expiresIn: 86400 });
    req.session.save((err) => {
      if (err) {
        return res.redirect(`${config.frontendUrl}/?error=session_save_failed`);
      }
      res.redirect(`${config.frontendUrl}/trade`);
    });
  } catch (err) {
    res.redirect(`${config.frontendUrl}/?error=${encodeURIComponent(err.message)}`);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session?.accessToken) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    expiresAt: req.session.expiresAt,
    selectedAccountId: req.session.selectedAccountId,
    accounts: req.session.accounts || [],
    lastAccountError: req.session.lastAccountError || null,
  });
});

export default router;
