import { Router } from 'express';
import { derivWsRequest } from '../lib/derivWs.js';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { getWsOtp } from '../services/deriv.js';

const router = Router();

router.get('/strategies', async (_req, res) => {
  try {
    const data = await derivWsRequest({ auto_list_strategies: 1 }, { match: 'auto_list_strategies' });
    res.json(data.auto_list_strategies || data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.use(ensureValidToken);

router.post('/start', async (req, res) => {
  const accountId = req.body.accountId || req.session.selectedAccountId;
  const { strategyId, contractTemplate } = req.body;
  if (!accountId || !strategyId) {
    return res.status(400).json({ error: 'accountId and strategyId required' });
  }
  try {
    const { wsUrl } = await getWsOtp(req.session.accessToken, accountId);
    const WebSocket = (await import('ws')).default;
    const result = await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 15000);
      ws.on('open', () => {
        ws.send(JSON.stringify({
          auto_start: 1,
          strategy_id: strategyId,
          contract_template: contractTemplate || { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 5, duration_unit: 't', symbol: 'R_100' },
        }));
      });
      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.error) { clearTimeout(timeout); ws.close(); reject(new Error(data.error.message)); return; }
        if (data.msg_type === 'auto_start') {
          clearTimeout(timeout);
          ws.close();
          resolve(data);
        }
      });
      ws.on('error', (e) => { clearTimeout(timeout); reject(e); });
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/stop', async (req, res) => {
  const accountId = req.body.accountId || req.session.selectedAccountId;
  const { runId } = req.body;
  if (!accountId || !runId) return res.status(400).json({ error: 'runId required' });
  try {
    const { wsUrl } = await getWsOtp(req.session.accessToken, accountId);
    const WebSocket = (await import('ws')).default;
    const result = await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 15000);
      ws.on('open', () => ws.send(JSON.stringify({ auto_stop: 1, run_id: runId })));
      ws.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.error) { clearTimeout(timeout); ws.close(); reject(new Error(data.error.message)); return; }
        if (data.msg_type === 'auto_stop') { clearTimeout(timeout); ws.close(); resolve(data); }
      });
      ws.on('error', (e) => { clearTimeout(timeout); reject(e); });
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
