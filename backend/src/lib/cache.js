import { cacheGet, cacheSet } from './redis.js';

export function cacheMiddleware({ ttl = 300, prefix = 'cache' } = {}) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `${prefix}:${req.originalUrl}`;
    const cached = await cacheGet(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cacheSet(key, data, ttl).catch(() => {});
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}
