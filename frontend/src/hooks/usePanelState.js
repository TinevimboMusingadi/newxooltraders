import { useCallback, useState } from 'react';

export function usePanelState(key, defaultOpen = true) {
  const storageKey = `nx-panel-${key}`;

  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored != null) return stored === '1';
    } catch { /* ignore */ }
    return defaultOpen;
  });

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  const set = useCallback((value) => {
    setOpen(value);
    try {
      localStorage.setItem(storageKey, value ? '1' : '0');
    } catch { /* ignore */ }
  }, [storageKey]);

  return { open, toggle, setOpen: set };
}
