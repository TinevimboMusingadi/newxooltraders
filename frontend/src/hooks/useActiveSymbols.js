import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SYMBOL_CATALOG } from '../lib/symbolGroups';

export function useActiveSymbols() {
  const [symbols, setSymbols] = useState(SYMBOL_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getSymbols();
        if (!cancelled && data.symbols?.length) {
          setSymbols(data.symbols);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { symbols, loading, error };
}
