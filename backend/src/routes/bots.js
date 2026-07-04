import { Router } from 'express';
import { randomBytes } from 'crypto';
import { ensureValidToken } from '../middleware/requireAuth.js';

const router = Router();
const configs = new Map();

function sessionKey(req) {
  return req.sessionID || req.session?.id || 'anon';
}

router.use(ensureValidToken);

router.get('/configs', (req, res) => {
  const key = sessionKey(req);
  const list = [...configs.values()].filter((c) => c.userKey === key);
  res.json({ configs: list });
});

router.post('/configs', (req, res) => {
  const key = sessionKey(req);
  const { name, config, symbol } = req.body;
  const id = randomBytes(6).toString('hex');
  const entry = { id, userKey: key, name, config, symbol, updatedAt: new Date().toISOString() };
  configs.set(id, entry);
  res.json({ config: entry });
});

router.delete('/configs/:id', (req, res) => {
  configs.delete(req.params.id);
  res.json({ ok: true });
});

export default router;
