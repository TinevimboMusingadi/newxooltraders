import { Router } from 'express';
import { ensureValidToken } from '../middleware/requireAuth.js';
import { getAccounts, getWsOtp } from '../services/deriv.js';

const router = Router();

router.use(ensureValidToken);

router.get('/accounts', async (req, res) => {
  try {
    const data = await getAccounts(req.session.accessToken);
    const accounts = (data.data || []).map((a) => ({
      accountId: a.account_id || a.loginid,
      loginid: a.loginid || a.account_id,
      currency: a.currency,
      isVirtual: Boolean(a.is_virtual),
      accountType: a.account_type || (a.is_virtual ? 'demo' : 'real'),
    }));

    req.session.accounts = accounts;
    req.session.save(() => {});

    res.json({ accounts });
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
