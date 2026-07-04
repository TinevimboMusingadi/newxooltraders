import { Router } from 'express';
import { SYMBOL_CATALOG } from '../data/symbols.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { cacheMiddleware } from '../lib/cache.js';

const router = Router();

router.get('/symbols', (_req, res) => {
  res.json({ symbols: SYMBOL_CATALOG, cachedAt: new Date().toISOString() });
});

router.get('/symbols/live', cacheMiddleware({ ttl: 300, prefix: 'mkt' }), async (_req, res) => {
  try {
    const cached = await cacheGet('active_symbols');
    if (cached) return res.json(cached);

    const ws = new (await import('ws')).default(
      'wss://ws.derivws.com/websockets/v3?app_id=' + (process.env.DERIV_APP_ID || '1089'),
    );

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 10000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ active_symbols: 'full', product_type: 'basic' }));
      });

      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'active_symbols') {
          clearTimeout(timeout);
          ws.close();
          resolve(data.active_symbols);
        }
        if (data.error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(data.error.message));
        }
      });

      ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });

    const response = { symbols: result, cachedAt: new Date().toISOString() };
    await cacheSet('active_symbols', response, 300);
    res.json(response);
  } catch (err) {
    res.json({ symbols: SYMBOL_CATALOG, cachedAt: new Date().toISOString(), fallback: true });
  }
});

router.get('/contracts/:symbol', cacheMiddleware({ ttl: 300, prefix: 'contracts' }), async (req, res) => {
  const { symbol } = req.params;
  try {
    const ws = new (await import('ws')).default(
      'wss://ws.derivws.com/websockets/v3?app_id=' + (process.env.DERIV_APP_ID || '1089'),
    );

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 10000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ contracts_for: symbol, product_type: 'basic' }));
      });

      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.msg_type === 'contracts_for') {
          clearTimeout(timeout);
          ws.close();
          resolve(data.contracts_for);
        }
        if (data.error) {
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
