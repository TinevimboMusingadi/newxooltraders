import { Router } from 'express';
import { randomBytes } from 'crypto';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { pool } from '../db/pool.js';
import { botConfigsDb } from '../db/queries/platform.js';

const router = Router();
const memConfigs = new Map();

function sessionKey(req) {
  return req.sessionID || req.session?.id || 'anon';
}

router.use(ensureValidToken);

router.get('/configs', async (req, res) => {
  const key = sessionKey(req);
  try {
    if (pool) {
      const list = await botConfigsDb.list(key);
      return res.json({ configs: list });
    }
    const list = [...memConfigs.values()].filter((c) => c.userKey === key);
    res.json({ configs: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/configs', async (req, res) => {
  const key = sessionKey(req);
  const { name, config, symbol } = req.body;
  const id = randomBytes(6).toString('hex');
  try {
    if (pool) {
      await botConfigsDb.upsert(id, key, name, config, symbol);
      return res.json({ config: { id, userKey: key, name, config, symbol } });
    }
    const entry = { id, userKey: key, name, config, symbol, updatedAt: new Date().toISOString() };
    memConfigs.set(id, entry);
    res.json({ config: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/configs/:id', async (req, res) => {
  try {
    if (pool) {
      await botConfigsDb.remove(req.params.id);
    } else {
      memConfigs.delete(req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
