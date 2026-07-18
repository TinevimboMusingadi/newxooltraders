import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Play, Square } from 'lucide-react';
import TraderLineChart from '../components/TraderLineChart';
import OpenPositions from '../components/OpenPositions';
import BotTradeChat from '../components/BotTradeChat';
import { useAuth } from '../hooks/useAuth';
import { useTradingWs } from '../context/TradingWsContext';
import { useTradingFooter } from '../context/TradingFooterContext';
import { useBotDesk } from '../context/BotDeskContext';

export default function BotTradingView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const account = user?.accounts?.find((a) => a.accountId === user?.selectedAccountId);
  const { connected, sellContract, updateContract } = useTradingWs();
  const { setRunHandler, clearRunHandler } = useTradingFooter();
  const {
    name,
    config,
    symbol,
    running,
    messages,
    botContracts,
    loadBot,
    start,
    stop,
    clearMessages,
  } = useBotDesk();

  useEffect(() => {
    if (location.state?.config) {
      loadBot(location.state);
    }
  }, [location.state, loadBot]);

  useEffect(() => {
    setRunHandler(() => {
      if (running) stop();
      else start();
    }, running ? 'Stop Bot' : 'Start Bot');
    return () => clearRunHandler();
  }, [running, start, stop, setRunHandler, clearRunHandler]);

  const paramRows = useMemo(
    () => [
      ['Market', config.marketLabel || symbol],
      ['Trade type', config.tradeTypeLabel || config.tradeKind || '—'],
      ['Contract type', config.contractTypeLabel || config.contractSide || '—'],
      ['Candle interval', config.candleIntervalLabel || '—'],
      ['Win amount', config.winAmount],
      ['stake', config.stakeFromWinAmount ? 'Win amount' : config.baseStake],
      ['prediction', config.prediction],
      ['Take profit', config.takeProfit],
      ['stop loss', config.stopLoss],
      ['Martingale', config.martingale ?? config.multiplier],
      ['maxStake', config.maxStakeFromWinAmount ? 'Win amount' : config.maxStake],
      ['Restart buy/sell on error', config.restartBuySellOnError ? 'On' : 'Off'],
      ['Restart last trade on error', config.restartLastTradeOnError ? 'On' : 'Off'],
    ],
    [config, symbol],
  );

  return (
    <div className={`bot-trading-view ${running ? 'is-running' : ''}`}>
      <header className="bot-desk-header">
        <div className="bot-desk-header-left">
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="heading-md bot-desk-title">{name}</h1>
            <p className="text-muted bot-desk-sub mono">{symbol}</p>
          </div>
        </div>
        <div className="bot-desk-actions">
          <span className={`bot-run-badge ${running ? 'is-running' : 'is-idle'}`}>
            {running ? 'Bot is running' : 'Bot is not running'}
          </span>
          <Link to="/history" className="btn btn-ghost btn-xs bot-desk-history-link">
            <Clock size={12} /> History
          </Link>
          {running ? (
            <button type="button" className="btn btn-danger btn-sm bot-desk-ctrl-btn" onClick={stop}>
              <Square size={14} /> Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm bot-desk-ctrl-btn"
              onClick={start}
              disabled={!connected}
            >
              <Play size={14} /> Start
            </button>
          )}
        </div>
      </header>

      {running && (
        <p className="bot-desk-persist-hint text-muted">
          Session stays active if you open History or another page — come back here to watch the bot.
        </p>
      )}

      <div className="bot-desk-grid">
        <div className="bot-desk-main">
          <div className="bot-desk-chart card">
            <TraderLineChart symbol={symbol} showAccumulatorBand={false} />
          </div>

          <OpenPositions
            contracts={botContracts}
            onSell={(id) => sellContract(id)}
            onUpdateTP={(id, v) => updateContract(id, { take_profit: v })}
            onUpdateSL={(id, v) => updateContract(id, { stop_loss: v })}
            currency={account?.currency || 'USD'}
            defaultOpen
          />

          <div className="bot-params-panel card">
            <h3 className="heading-sm">Strategy parameters</h3>
            <dl className="bot-params-list">
              {paramRows.map(([label, value]) => (
                <div key={label} className="bot-params-row">
                  <dt>{label}</dt>
                  <dd className="mono">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="bot-params-links">
              <Link to="/bots/free" className="btn btn-ghost btn-xs">Free Strategies</Link>
              <Link to="/history" className="btn btn-ghost btn-xs">Trade History</Link>
            </div>
          </div>
        </div>

        <aside className="bot-desk-side">
          <BotTradeChat
            running={running}
            messages={messages}
            onClear={clearMessages}
          />
        </aside>
      </div>
    </div>
  );
}
