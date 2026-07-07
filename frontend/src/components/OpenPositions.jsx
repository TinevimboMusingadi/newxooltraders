import { useState, useEffect } from 'react';
import { X, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';
import { usePanelState } from '../hooks/usePanelState';

function formatTimeLeft(expiryTime) {
  if (!expiryTime) return null;
  const now = Math.floor(Date.now() / 1000);
  const left = expiryTime - now;
  if (left <= 0) return 'Expiring…';
  if (left < 60) return `${left}s left`;
  if (left < 3600) return `${Math.floor(left / 60)}m ${left % 60}s`;
  return `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;
}

function expiryProgress(contract) {
  const start = contract.date_start || contract.purchase_time;
  const end = contract.date_expiry;
  if (!start || !end) return null;
  const now = Math.floor(Date.now() / 1000);
  const total = end - start;
  const elapsed = now - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export default function OpenPositions({
  contracts,
  onSell,
  onUpdateTP,
  onUpdateSL,
  onCloseAll,
  currency,
  closingAll,
  defaultOpen = false,
}) {
  const list = contracts || [];
  const { open, toggle, setOpen } = usePanelState('open-positions', defaultOpen);

  useEffect(() => {
    if (list.length > 0) setOpen(true);
  }, [list.length, setOpen]);

  return (
    <CollapsiblePanel
      title="Open Positions"
      badge={list.length}
      open={open}
      onToggle={toggle}
      className="open-positions"
      actions={
        list.length > 1 && onCloseAll ? (
          <button
            type="button"
            className="btn btn-danger btn-xs"
            disabled={closingAll}
            onClick={onCloseAll}
          >
            {closingAll ? 'Closing…' : 'Close All'}
          </button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <p className="text-muted open-positions-empty">No open positions. Place a trade to see live P/L here.</p>
      ) : (
        <div className="positions-grid">
          {list.map((c) => (
            <PositionCard
              key={c.contract_id}
              contract={c}
              onSell={onSell}
              onUpdateTP={onUpdateTP}
              onUpdateSL={onUpdateSL}
              currency={currency}
            />
          ))}
        </div>
      )}
    </CollapsiblePanel>
  );
}

function PositionCard({ contract, onSell, onUpdateTP, onUpdateSL, currency }) {
  const [showTP, setShowTP] = useState(false);
  const [showSL, setShowSL] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [selling, setSelling] = useState(false);

  const pl = contract.profit != null ? Number(contract.profit) : null;
  const plClass = pl != null ? (pl >= 0 ? 'profit' : 'loss') : '';
  const payout = contract.payout != null ? Number(contract.payout) : null;
  const progress = expiryProgress(contract);
  const timeLeft = formatTimeLeft(contract.date_expiry);

  const handleSell = async () => {
    setSelling(true);
    try {
      await onSell(contract.contract_id);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="position-card">
      <div className="position-card-top">
        <div>
          <span className="position-symbol">{contract.display_name || contract.symbol || '—'}</span>
          <span className="position-type">{contract.contract_type || '—'}</span>
        </div>
        {pl != null && (
          <span className={`position-pl-badge mono ${plClass}`}>
            {pl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {pl >= 0 ? '+' : ''}{pl.toFixed(2)} {currency}
          </span>
        )}
      </div>

      <div className="position-card-stats">
        <div>
          <span className="summary-label">Stake</span>
          <span className="mono">{Number(contract.buy_price || 0).toFixed(2)}</span>
        </div>
        {payout != null && (
          <div>
            <span className="summary-label">Payout</span>
            <span className="mono">{payout.toFixed(2)}</span>
          </div>
        )}
        {timeLeft && (
          <div>
            <span className="summary-label"><Clock size={10} /> Time</span>
            <span>{timeLeft}</span>
          </div>
        )}
      </div>

      {progress != null && (
        <div className="position-expiry-bar">
          <div className="position-expiry-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="position-actions">
        {contract.is_sold !== 1 && contract.is_settleable !== 1 && (
          <>
            <button type="button" className="btn btn-danger btn-xs" disabled={selling} onClick={handleSell}>
              <X size={12} /> {selling ? '…' : 'Sell'}
            </button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowTP(!showTP)}>TP</button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowSL(!showSL)}>SL</button>
          </>
        )}
      </div>

      {showTP && (
        <div className="position-update-row">
          <input type="number" step="0.01" placeholder="Take profit" value={tp} onChange={(e) => setTp(e.target.value)} className="input-sm" />
          <button type="button" className="btn btn-primary btn-xs" onClick={() => { onUpdateTP(contract.contract_id, Number(tp)); setShowTP(false); }}>Set</button>
        </div>
      )}
      {showSL && (
        <div className="position-update-row">
          <input type="number" step="0.01" placeholder="Stop loss" value={sl} onChange={(e) => setSl(e.target.value)} className="input-sm" />
          <button type="button" className="btn btn-primary btn-xs" onClick={() => { onUpdateSL(contract.contract_id, Number(sl)); setShowSL(false); }}>Set</button>
        </div>
      )}
    </div>
  );
}
