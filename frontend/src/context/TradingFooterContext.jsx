import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const TradingFooterContext = createContext(null);

export function TradingFooterProvider({ children }) {
  const [runHandler, setRunHandlerState] = useState(null);
  const [runLabel, setRunLabel] = useState('Run');
  const [running, setRunning] = useState(false);

  const setRunHandler = useCallback((fn, label = 'Run') => {
    setRunHandlerState(() => fn);
    setRunLabel(label);
  }, []);

  const clearRunHandler = useCallback(() => {
    setRunHandlerState(null);
    setRunLabel('Run');
    setRunning(false);
  }, []);

  const invokeRun = useCallback(async () => {
    if (!runHandler) return;
    setRunning(true);
    try {
      await runHandler();
    } finally {
      setRunning(false);
    }
  }, [runHandler]);

  const value = useMemo(() => ({
    runHandler,
    runLabel,
    running,
    setRunHandler,
    clearRunHandler,
    invokeRun,
  }), [runHandler, runLabel, running, setRunHandler, clearRunHandler, invokeRun]);

  return (
    <TradingFooterContext.Provider value={value}>{children}</TradingFooterContext.Provider>
  );
}

export function useTradingFooter() {
  return useContext(TradingFooterContext);
}
