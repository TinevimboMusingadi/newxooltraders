import { Router } from 'express';
import { randomBytes } from 'crypto';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { pool } from '../db/pool.js';
import { copyDb } from '../db/queries/platform.js';

const router = Router();

const memProviders = new Map();
const memSubscriptions = new Map();
const memCopyJobs = [];

function sessionKey(req) {
  return req.sessionID || req.session?.id || 'anon';
}

router.use(ensureValidToken);

router.post('/provider', async (req, res) => {
  const key = sessionKey(req);
  const code = randomBytes(4).toString('hex').toUpperCase();
  const accountId = req.session.selectedAccountId;
  try {
    if (pool) {
      await copyDb.createProvider(code, key, accountId);
      return res.json({ provider: { code, userKey: key, accountId } });
    }
    const provider = { code, accountId, userKey: key, createdAt: new Date().toISOString() };
    memProviders.set(code, provider);
    res.json({ provider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/provider', async (req, res) => {
  const key = sessionKey(req);
  try {
    if (pool) {
      const p = await copyDb.getProvider(key);
      return res.json({ provider: p || null });
    }
    const mine = [...memProviders.values()].find((p) => p.userKey === key);
    res.json({ provider: mine || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscribe', async (req, res) => {
  const { providerCode, riskPct = 50 } = req.body;
  const code = String(providerCode).toUpperCase();
  const id = randomBytes(6).toString('hex');
  const key = sessionKey(req);
  const accountId = req.session.selectedAccountId;
  const risk = Math.min(100, Math.max(10, Number(riskPct) || 50));

  try {
    if (pool) {
      await copyDb.subscribe(id, code, key, accountId, risk);
      return res.json({ subscription: { id, providerCode: code, followerKey: key, followerAccountId: accountId, riskPct: risk, active: true } });
    }
    const provider = memProviders.get(code);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const sub = { id, providerCode: code, followerKey: key, followerAccountId: accountId, riskPct: risk, active: true };
    memSubscriptions.set(id, sub);
    res.json({ subscription: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscriptions', async (req, res) => {
  const key = sessionKey(req);
  try {
    if (pool) {
      const list = await copyDb.getSubscriptions(key);
      return res.json({ subscriptions: list });
    }
    const list = [...memSubscriptions.values()].filter((s) => s.followerKey === key);
    res.json({ subscriptions: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subscribe/:id', async (req, res) => {
  try {
    if (pool) {
      await copyDb.unsubscribe(req.params.id);
    } else {
      memSubscriptions.delete(req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trade', async (req, res) => {
  const key = sessionKey(req);
  const payload = req.body;
  const masterAmount = Number(payload.amount) || 1;

  try {
    let provider, followers;
    if (pool) {
      provider = await copyDb.getProvider(key);
      if (!provider) return res.status(403).json({ error: 'Not a copy provider' });
      followers = await copyDb.getFollowers(provider.code);
    } else {
      provider = [...memProviders.values()].find((p) => p.userKey === key);
      if (!provider) return res.status(403).json({ error: 'Not a copy provider' });
      followers = [...memSubscriptions.values()].filter((s) => s.providerCode === provider.code && s.active);
    }

    const jobs = [];
    for (const f of followers) {
      const scaledAmount = Math.max(0.35, (masterAmount * (f.risk_pct || f.riskPct || 50)) / 100);
      const id = randomBytes(4).toString('hex');
      const trade = { ...payload, amount: scaledAmount };
      if (pool) {
        await copyDb.createJob(id, f.follower_account_id || f.followerAccountId, f.follower_key || f.followerKey, provider.code, f.risk_pct || f.riskPct, trade);
      }
      const job = { id, followerAccountId: f.follower_account_id || f.followerAccountId, followerKey: f.follower_key || f.followerKey, riskPct: f.risk_pct || f.riskPct, trade, status: 'queued', createdAt: new Date().toISOString() };
      if (!pool) memCopyJobs.push(job);
      jobs.push(job);
    }

    res.json({ queued: followers.length, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs/pending', async (req, res) => {
  const accountId = req.session.selectedAccountId;
  const key = sessionKey(req);
  try {
    if (pool) {
      const pending = await copyDb.getPendingJobs(accountId, key);
      return res.json({ jobs: pending });
    }
    const pending = memCopyJobs.filter((j) => j.status === 'queued' && j.followerAccountId === accountId && j.followerKey === key);
    res.json({ jobs: pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jobs/:id/complete', async (req, res) => {
  const key = sessionKey(req);
  try {
    if (pool) {
      await copyDb.completeJob(req.params.id, key, req.body, !!req.body.error);
      return res.json({ ok: true });
    }
    const job = memCopyJobs.find((j) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    job.status = req.body.error ? 'failed' : 'done';
    job.completedAt = new Date().toISOString();
    job.result = req.body;
    res.json({ ok: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    if (pool) {
      const jobs = await copyDb.recentJobs(20);
      return res.json({ jobs });
    }
    res.json({ jobs: memCopyJobs.slice(-20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
