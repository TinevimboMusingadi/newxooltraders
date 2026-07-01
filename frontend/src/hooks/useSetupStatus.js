import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useSetupStatus() {
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPublicConfig()
      .then(setSetup)
      .catch(() => setSetup(null))
      .finally(() => setLoading(false));
  }, []);

  return { setup, loading };
}
