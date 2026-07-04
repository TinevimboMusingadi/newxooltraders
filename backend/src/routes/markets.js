import { Router } from 'express';
import { SYMBOL_CATALOG } from '../data/symbols.js';

const router = Router();

router.get('/symbols', (_req, res) => {
  res.json({ symbols: SYMBOL_CATALOG, cachedAt: new Date().toISOString() });
});

export default router;
