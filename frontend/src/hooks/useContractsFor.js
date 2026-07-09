import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { parseContractsFor, pickDefaultDuration } from '../lib/contractsFor';
import { isValidSymbol } from '../lib/symbolUtils';

const cache = new Map();

export function useContractsFor(symbol, contractTypes = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const typesKey = contractTypes.join(',');

  useEffect(() => {
    if (!isValidSymbol(symbol)) return;
    let cancelled = false;
    const cacheKey = `${symbol}:${typesKey}`;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (cache.has(cacheKey)) {
          if (!cancelled) setData(cache.get(cacheKey));
          return;
        }
        const raw = await api.getContractsFor(symbol);
        const parsed = parseContractsFor(raw, contractTypes);
        cache.set(cacheKey, parsed);
        if (!cancelled) setData(parsed);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [symbol, typesKey]);

  const defaultDuration = useMemo(
    () => pickDefaultDuration(data?.allowedDurations),
    [data],
  );

  return {
    loading,
    error,
    available: data?.available || [],
    allowedDurations: data?.allowedDurations || [],
    growthRates: data?.growthRates || [],
    maxPayout: data?.maxPayout,
    maxTicks: data?.maxTicks,
    defaultDuration,
  };
}
