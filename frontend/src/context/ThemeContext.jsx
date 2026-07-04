import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('newxool_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('newxool_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
