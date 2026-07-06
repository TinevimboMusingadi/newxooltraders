import { Play, Maximize2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradeSession } from '../context/TradeSessionContext';
import { useTradingFooter } from '../context/TradingFooterContext';

export default function TradingFooter() {
  const { theme, toggleTheme } = useTheme();
  const { connected } = useTradingWs();
  const { lastContractStatus } = useTradeSession();
  const { runLabel, running, invokeRun, runHandler } = useTradingFooter();

  const now = new Date().toUTCString().replace('GMT', 'GMT');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <footer className="trading-footer">
      <button type="button" className="risk-disclaimer-btn">Risk Disclaimer</button>

      <div className="trading-footer-center">
        {runHandler && (
          <button type="button" className="btn btn-primary footer-run-btn" disabled={running || !connected} onClick={invokeRun}>
            <Play size={16} /> {running ? 'Running…' : runLabel}
          </button>
        )}
        <span className="footer-status">{lastContractStatus}</span>
        <div className="footer-progress" aria-hidden />
      </div>

      <div className="trading-footer-meta">
        <span className="text-muted">© {new Date().getFullYear()} Newxool Traders</span>
        <span className={`footer-dot ${connected ? 'online' : 'offline'}`} title={connected ? 'Connected' : 'Disconnected'} />
        <span className="footer-time mono">{now}</span>
        <button type="button" className="footer-icon-btn" onClick={toggleTheme} aria-label="Theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <span className="footer-lang">EN</span>
        <button type="button" className="footer-icon-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
}
