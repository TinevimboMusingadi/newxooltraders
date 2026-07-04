import { Router } from 'express';
import { randomBytes } from 'crypto';
import { ensureValidToken } from '../middleware/requireAuth.js';

const router = Router();

const providers = new Map();
const subscriptions = new Map();
const copyJobs = [];

function sessionKey(req) {
  return req.sessionID || req.session?.id || 'anon';
}

router.use(ensureValidToken);

router.post('/provider', (req, res) => {
  const key = sessionKey(req);
  const code = randomBytes(4).toString('hex').toUpperCase();
  const provider = {
    code,
    accountId: req.session.selectedAccountId,
    userKey: key,
    createdAt: new Date().toISOString(),
  };
  providers.set(code, provider);
  res.json({ provider });
});

router.get('/provider', (req, res) => {
  const key = sessionKey(req);
  const mine = [...providers.values()].find((p) => p.userKey === key);
  res.json({ provider: mine || null });
});

router.post('/subscribe', (req, res) => {
  const { providerCode, riskPct = 50 } = req.body;
  const provider = providers.get(String(providerCode).toUpperCase());
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  const id = randomBytes(6).toString('hex');
  const sub = {
    id,
    providerCode: provider.code,
    followerKey: sessionKey(req),
    followerAccountId: req.session.selectedAccountId,
    riskPct: Math.min(100, Math.max(10, Number(riskPct) || 50)),
    active: true,
  };
  subscriptions.set(id, sub);
  res.json({ subscription: sub });
});

router.get('/subscriptions', (req, res) => {
  const key = sessionKey(req);
  const list = [...subscriptions.values()].filter((s) => s.followerKey === key);
  res.json({ subscriptions: list });
});

router.delete('/subscribe/:id', (req, res) => {
  subscriptions.delete(req.params.id);
  res.json({ ok: true });
});

router.post('/trade', (req, res) => {
  const key = sessionKey(req);
  const provider = [...providers.values()].find((p) => p.userKey === key);
  if (!provider) return res.status(403).json({ error: 'Not a copy provider' });

  const payload = req.body;
  const followers = [...subscriptions.values()].filter(
    (s) => s.providerCode === provider.code && s.active,
  );

  for (const f of followers) {
    copyJobs.push({
      id: randomBytes(4).toString('hex'),
      followerAccountId: f.followerAccountId,
      riskPct: f.riskPct,
      trade: payload,
      status: 'queued',
      createdAt: new Date().toISOString(),
    });
  }

  res.json({ queued: followers.length, jobs: copyJobs.slice(-followers.length) });
});

router.get('/jobs', (req, res) => {
  res.json({ jobs: copyJobs.slice(-20) });
});

export default router;
