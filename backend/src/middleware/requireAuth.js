export function requireAuth(req, res, next) {
  if (!req.session?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export async function ensureValidToken(req, res, next) {
  if (!req.session?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const expiresAt = req.session.expiresAt || 0;
  const now = Date.now();

  if (expiresAt - now > 60_000) {
    return next();
  }

  if (!req.session.refreshToken) {
    return res.status(401).json({ error: 'Session expired' });
  }

  try {
    const { refreshAccessToken } = await import('../services/deriv.js');
    const tokens = await refreshAccessToken(req.session.refreshToken);

    req.session.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      req.session.refreshToken = tokens.refresh_token;
    }
    req.session.expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
    req.session.save(() => next());
  } catch (err) {
    req.session.destroy(() => {
      res.status(401).json({ error: 'Session expired', details: err.message });
    });
  }
}
