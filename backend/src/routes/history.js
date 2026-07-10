import { Router } from 'express';
import { randomBytes } from 'crypto';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { cacheMiddleware } from '../lib/cache.js';
import { getWsOtp } from '../services/deriv.js';
import { pool } from '../db/pool.js';
import { tradeHistoryDb } from '../db/queries/platform.js';

const router = Router();
router.use(ensureValidToken);

const memTrades = new Map();

function sessionKey(req) {
  return req.sessionID || req.session?.id || 'anon';
}

function accountIdOf(req) {
  return req.query.accountId || req.body?.accountId || req.session.selectedAccountId;
}

async function authenticatedWsRequest(accessToken, accountId, payload, matchType, timeoutMs = 15000) {
  const otp = await getWsOtp(accessToken, accountId);
  const wsUrl = otp.data?.url || otp.url || otp.wsUrl;
  if (!wsUrl) throw new Error('No WebSocket URL from OTP');

  const WebSocket = (await import('ws')).default;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for Deriv response'));
    }, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(payload));
    });

    ws.on('message', (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.error) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(data.error.message || 'Deriv API error'));
        return;
      }
      if (data.msg_type === matchType) {
        clearTimeout(timeout);
        ws.close();
        resolve(data[matchType] ?? data);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

router.get('/profit-table', cacheMiddleware({ ttl: 30, prefix: 'profit' }), async (req, res) => {
  const accountId = accountIdOf(req);
  if (!accountId) {
    return res.status(400).json({ error: 'No trading account selected' });
  }

  const { from, to, limit = 50, offset = 0 } = req.query;
  try {
    const payload = {
      profit_table: 1,
      limit: Number(limit),
      offset: Number(offset),
      sort: 'DESC',
      description: 1,
    };
    if (from) payload.date_from = from;
    if (to) payload.date_to = to;

    const result = await authenticatedWsRequest(
      req.session.accessToken,
      accountId,
      payload,
      'profit_table',
    );
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/statement', cacheMiddleware({ ttl: 30, prefix: 'stmt' }), async (req, res) => {
  const accountId = accountIdOf(req);
  if (!accountId) {
    return res.status(400).json({ error: 'No trading account selected' });
  }

  const { from, to, action_type, limit = 50 } = req.query;
  try {
    const payload = {
      statement: 1,
      limit: Number(limit),
      description: 1,
    };
    if (from) payload.date_from = from;
    if (to) payload.date_to = to;
    if (action_type) payload.action_type = action_type;

    const result = await authenticatedWsRequest(
      req.session.accessToken,
      accountId,
      payload,
      'statement',
    );
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/local', async (req, res) => {
  const key = sessionKey(req);
  const accountId = accountIdOf(req);
  const limit = Number(req.query.limit) || 100;
  try {
    if (pool) {
      const trades = await tradeHistoryDb.list(key, accountId, limit);
      return res.json({ trades });
    }
    const trades = [...memTrades.values()]
      .filter((t) => t.userKey === key && (!accountId || t.accountId === accountId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    res.json({ trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/local', async (req, res) => {
  const key = sessionKey(req);
  const accountId = accountIdOf(req) || req.body.accountId;
  const {
    contractId,
    symbol,
    contractType,
    buyPrice,
    sellPrice,
    profit,
    source,
    status = 'open',
    meta,
  } = req.body;

  if (!symbol && !contractId) {
    return res.status(400).json({ error: 'symbol or contractId required' });
  }

  const id = randomBytes(8).toString('hex');
  const entry = {
    id,
    userKey: key,
    accountId: accountId || null,
    contractId: contractId || null,
    symbol: symbol || null,
    contractType: contractType || null,
    buyPrice: buyPrice != null ? Number(buyPrice) : null,
    sellPrice: sellPrice != null ? Number(sellPrice) : null,
    profit: profit != null ? Number(profit) : null,
    source: source || 'app',
    status,
    meta: meta || null,
    createdAt: new Date().toISOString(),
    closedAt: status === 'closed' ? new Date().toISOString() : null,
  };

  try {
    if (pool) {
      await tradeHistoryDb.insert(entry);
      return res.json({ trade: entry });
    }
    memTrades.set(id, entry);
    res.json({ trade: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/local/:id', async (req, res) => {
  const key = sessionKey(req);
  const { sellPrice, profit, status = 'closed', meta } = req.body;
  try {
    if (pool) {
      const updated = await tradeHistoryDb.close(req.params.id, key, {
        sellPrice,
        profit,
        status,
        meta,
      });
      if (!updated) return res.status(404).json({ error: 'Trade not found' });
      return res.json({ trade: updated });
    }
    const existing = memTrades.get(req.params.id);
    if (!existing || existing.userKey !== key) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    const next = {
      ...existing,
      sellPrice: sellPrice != null ? Number(sellPrice) : existing.sellPrice,
      profit: profit != null ? Number(profit) : existing.profit,
      status,
      meta: meta ?? existing.meta,
      closedAt: new Date().toISOString(),
    };
    memTrades.set(req.params.id, next);
    res.json({ trade: next });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
