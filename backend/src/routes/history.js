import { Router } from 'express';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { cacheMiddleware } from '../lib/cache.js';

const router = Router();
router.use(ensureValidToken);

router.get('/profit-table', cacheMiddleware({ ttl: 30, prefix: 'profit' }), async (req, res) => {
  const { from, to, limit = 50, offset = 0 } = req.query;
  try {
    const ws = new (await import('ws')).default(
      `wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '1089'}`,
    );

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 10000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ authorize: req.session.accessToken }));
      });

      let authorized = false;
      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'authorize') {
          authorized = true;
          const payload = { profit_table: 1, limit: Number(limit), offset: Number(offset), sort: 'DESC' };
          if (from) payload.date_from = from;
          if (to) payload.date_to = to;
          ws.send(JSON.stringify(payload));
        }
        if (data.msg_type === 'profit_table') {
          clearTimeout(timeout);
          ws.close();
          resolve(data.profit_table);
        }
        if (data.error && authorized) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(data.error.message));
        }
      });

      ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/statement', cacheMiddleware({ ttl: 30, prefix: 'stmt' }), async (req, res) => {
  const { from, to, action_type, limit = 50 } = req.query;
  try {
    const ws = new (await import('ws')).default(
      `wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '1089'}`,
    );

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 10000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ authorize: req.session.accessToken }));
      });

      let authorized = false;
      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'authorize') {
          authorized = true;
          const payload = { statement: 1, limit: Number(limit), description: 1 };
          if (from) payload.date_from = from;
          if (to) payload.date_to = to;
          if (action_type) payload.action_type = action_type;
          ws.send(JSON.stringify(payload));
        }
        if (data.msg_type === 'statement') {
          clearTimeout(timeout);
          ws.close();
          resolve(data.statement);
        }
        if (data.error && authorized) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(data.error.message));
        }
      });

      ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
