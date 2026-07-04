import { Router } from 'express';
import { ensureValidToken } from '../middleware/requireAuth.js';
import {
  createDemoAccount,
  getAccounts,
  getWsOtp,
  resetDemoBalance,
} from '../services/deriv.js';
import { mapAccounts } from '../lib/mapAccount.js';

const router = Router();

router.use(ensureValidToken);

router.get('/accounts', async (req, res) => {
  try {
    const data = await getAccounts(req.session.accessToken);
    const raw = data.data || [];
    const accounts = mapAccounts(Array.isArray(raw) ? raw : [raw].filter(Boolean));

    req.session.accounts = accounts;
    req.session.save(() => {});

    res.json({ accounts });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/accounts/create-demo', async (req, res) => {
  try {
    const data = await createDemoAccount(req.session.accessToken);
    const refresh = await getAccounts(req.session.accessToken);
    const raw = refresh.data || [];
    const accounts = mapAccounts(Array.isArray(raw) ? raw : [raw].filter(Boolean));
    req.session.accounts = accounts;
    const created = mapAccounts(Array.isArray(data.data) ? data.data : data.data ? [data.data] : []);
    const newest = created[0];
    if (newest) req.session.selectedAccountId = newest.accountId;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Failed to save session' });
      res.json({ accounts, created: newest || null });
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/accounts/:id/reset-demo', async (req, res) => {
  const { id } = req.params;
  const account = (req.session.accounts || []).find((a) => a.accountId === id);
  if (!account?.isVirtual) {
    return res.status(400).json({ error: 'Only demo accounts can be reset' });
  }
  try {
    await resetDemoBalance(req.session.accessToken, id);
    res.json({ ok: true, message: 'Demo balance reset to $10,000' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/accounts/select', (req, res) => {
  const { accountId } = req.body;
  const exists = (req.session.accounts || []).some((a) => a.accountId === accountId);
  if (!exists) {
    return res.status(400).json({ error: 'Invalid account' });
  }
  req.session.selectedAccountId = accountId;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Failed to save selection' });
    res.json({ selectedAccountId: accountId });
  });
});

router.post('/ws-otp', async (req, res) => {
  const accountId = req.body.accountId || req.session.selectedAccountId;
  if (!accountId) {
    return res.status(400).json({ error: 'No account selected' });
  }

  try {
    const data = await getWsOtp(req.session.accessToken, accountId);
    res.json({ wsUrl: data.data?.url || data.url });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
