import { Router } from 'express';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { cacheMiddleware } from '../lib/cache.js';
import { derivWsRequest } from '../lib/derivWs.js';
import {
  buildCategoriesFromSymbols,
  fetchActiveSymbols,
  filterVolatilitySymbols,
  mapActiveSymbol,
} from '../lib/symbolCategories.js';

const router = Router();

const SYMBOLS_CACHE_KEY = 'active_symbols_v2';

async function getLiveSymbolsResponse() {
  const cached = await cacheGet(SYMBOLS_CACHE_KEY);
  if (cached?.symbols?.length && cached.symbols[0]?.symbol) return cached;

  const raw = await fetchActiveSymbols();
  const symbols = raw.map(mapActiveSymbol).filter((s) => s.symbol);
  const response = {
    symbols,
    cachedAt: new Date().toISOString(),
  };
  await cacheSet(SYMBOLS_CACHE_KEY, response, 300);
  return response;
}

router.get('/symbols', (_req, res) => {
  res.redirect(307, '/api/markets/symbols/live');
});

router.get('/symbols/live', cacheMiddleware({ ttl: 300, prefix: 'mkt-v2' }), async (_req, res) => {
  try {
    const response = await getLiveSymbolsResponse();
    res.json(response);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch live symbols' });
  }
});

router.get('/categories', cacheMiddleware({ ttl: 300, prefix: 'mkt-cat-v2' }), async (_req, res) => {
  try {
    const cached = await cacheGet('market_categories_v2');
    if (cached?.categories?.length) return res.json(cached);

    const { symbols } = await getLiveSymbolsResponse();
    const categories = buildCategoriesFromSymbols(symbols);
    const response = { categories, cachedAt: new Date().toISOString() };
    await cacheSet('market_categories_v2', response, 300);
    res.json(response);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Failed to fetch market categories' });
  }
});

router.get('/contracts/:symbol', cacheMiddleware({ ttl: 300, prefix: 'contracts' }), async (req, res) => {
  const { symbol } = req.params;
  try {
    const data = await derivWsRequest(
      { contracts_for: symbol },
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
    const volSymbols = filterVolatilitySymbols(symbols).slice(0, 8);

    const { computeSignalsFromHistory } = await import('../services/signals.js');
    const signals = await computeSignalsFromHistory(volSymbols.map((s) => s.symbol));
    const response = { signals, cachedAt: new Date().toISOString() };
    await cacheSet('live_signals', response, 30);
    res.json(response);
  } catch (err) {
    console.error('[signals/live]', err.message);
    res.json({ signals: [], cachedAt: new Date().toISOString(), error: err.message });
  }
});

export default router;
