import { Router } from 'express';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { cacheMiddleware } from '../lib/cache.js';
import { derivWsRequest } from '../lib/derivWs.js';
import {
  buildCategoriesFromSymbols,
  fetchActiveSymbols,
  mapActiveSymbol,
} from '../lib/symbolCategories.js';

const router = Router();

async function getLiveSymbolsResponse() {
  const cached = await cacheGet('active_symbols');
  if (cached) return cached;

  const raw = await fetchActiveSymbols();
  const response = {
    symbols: raw.map(mapActiveSymbol),
    cachedAt: new Date().toISOString(),
  };
  await cacheSet('active_symbols', response, 300);
  return response;
}

router.get('/symbols', (_req, res) => {
  res.redirect(307, '/api/markets/symbols/live');
});

router.get('/symbols/live', cacheMiddleware({ ttl: 300, prefix: 'mkt' }), async (_req, res) => {
  try {
    const response = await getLiveSymbolsResponse();
    res.json(response);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch live symbols' });
  }
});

router.get('/categories', cacheMiddleware({ ttl: 300, prefix: 'mkt-cat' }), async (_req, res) => {
  try {
    const cached = await cacheGet('market_categories');
    if (cached) return res.json(cached);

    const { symbols } = await getLiveSymbolsResponse();
    const categories = buildCategoriesFromSymbols(symbols);
    const response = { categories, cachedAt: new Date().toISOString() };
    await cacheSet('market_categories', response, 300);
    res.json(response);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch market categories' });
  }
});

router.get('/contracts/:symbol', cacheMiddleware({ ttl: 300, prefix: 'contracts' }), async (req, res) => {
  const { symbol } = req.params;
  try {
    const data = await derivWsRequest(
      { contracts_for: symbol, product_type: 'basic' },
      { match: 'contracts_for' },
    );
    res.json(data.contracts_for || data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/signals/live', cacheMiddleware({ ttl: 30, prefix: 'signals' }), async (_req, res) => {
  try {
    const cached = await cacheGet('live_signals');
    if (cached) return res.json(cached);

    const { symbols } = await getLiveSymbolsResponse();
    const volSymbols = symbols
      .filter((s) => s.market === 'synthetic_index' && /volatility|random/i.test(s.submarket || ''))
      .slice(0, 8);

    const { computeSignalsFromHistory } = await import('../services/signals.js');
    const signals = await computeSignalsFromHistory(volSymbols.map((s) => s.symbol));
    const response = { signals, cachedAt: new Date().toISOString() };
    await cacheSet('live_signals', response, 30);
    res.json(response);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
