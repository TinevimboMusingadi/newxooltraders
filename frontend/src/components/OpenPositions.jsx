import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';
import { usePanelState } from '../hooks/usePanelState';

function formatTimeLeft(expiryTime) {
  if (!expiryTime) return null;
  const now = Math.floor(Date.now() / 1000);
  const left = expiryTime - now;
  if (left <= 0) return '…';
  if (left < 60) return `${left}s`;
  if (left < 3600) return `${Math.floor(left / 60)}m`;
  return `${Math.floor(left / 3600)}h`;
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
      compact
      className={`open-positions ${open ? 'is-open' : ''} ${list.length ? 'has-positions' : ''}`}
      actions={
        list.length > 1 && onCloseAll ? (
          <button
            type="button"
            className="btn btn-danger btn-xs"
            disabled={closingAll}
            onClick={onCloseAll}
          >
            {closingAll ? '…' : 'Close all'}
          </button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <p className="text-muted open-positions-empty">No open positions.</p>
      ) : (
        <>
          <div className="positions-table-wrap positions-desktop">
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Type</th>
                  <th>Stake</th>
                  <th>P/L</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <PositionRow
                    key={c.contract_id}
                    contract={c}
                    onSell={onSell}
                    onUpdateTP={onUpdateTP}
                    onUpdateSL={onUpdateSL}
                    currency={currency}
                    layout="table"
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="positions-cards positions-mobile">
            {list.map((c) => (
              <PositionRow
                key={`card-${c.contract_id}`}
                contract={c}
                onSell={onSell}
                onUpdateTP={onUpdateTP}
                onUpdateSL={onUpdateSL}
                currency={currency}
                layout="card"
              />
            ))}
          </div>
        </>
      )}
    </CollapsiblePanel>
  );
}

function PositionRow({ contract, onSell, onUpdateTP, onUpdateSL, currency, layout }) {
  const [showTP, setShowTP] = useState(false);
  const [showSL, setShowSL] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [selling, setSelling] = useState(false);

  const pl = contract.profit != null ? Number(contract.profit) : null;
  const plClass = pl != null ? (pl >= 0 ? 'profit' : 'loss') : '';
  const timeLeft = formatTimeLeft(contract.date_expiry);
  const canSell = contract.is_sold !== 1 && contract.is_settleable !== 1;
  const label = contract.display_name || contract.symbol || '—';

  const handleSell = async () => {
    setSelling(true);
    try {
      await onSell(contract.contract_id);
    } finally {
      setSelling(false);
    }
  };

  const updateRow = (showTP || showSL) && (
    <div className="position-update-row">
      {showTP && (
        <>
          <input type="number" step="0.01" placeholder="Take profit" value={tp} onChange={(e) => setTp(e.target.value)} className="input-sm" />
          <button type="button" className="btn btn-primary btn-xs" onClick={() => { onUpdateTP(contract.contract_id, Number(tp)); setShowTP(false); }}>Set TP</button>
        </>
      )}
      {showSL && (
        <>
          <input type="number" step="0.01" placeholder="Stop loss" value={sl} onChange={(e) => setSl(e.target.value)} className="input-sm" />
          <button type="button" className="btn btn-primary btn-xs" onClick={() => { onUpdateSL(contract.contract_id, Number(sl)); setShowSL(false); }}>Set SL</button>
        </>
      )}
    </div>
  );

  const actions = canSell && (
    <span className="position-actions-inner">
      <button type="button" className="btn btn-danger btn-xs" disabled={selling} onClick={handleSell}>
        <X size={11} /> {selling ? '…' : 'Sell'}
      </button>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setShowTP((v) => !v); setShowSL(false); }}>TP</button>
      <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setShowSL((v) => !v); setShowTP(false); }}>SL</button>
    </span>
  );

  if (layout === 'card') {
    return (
      <div className="position-card">
        <div className="position-card-top">
          <div className="position-card-meta">
            <strong className="position-symbol">{label}</strong>
            <span className="position-type">{contract.contract_type || '—'}</span>
          </div>
          <div className={`mono position-card-pl ${plClass}`}>
            {pl != null ? `${pl >= 0 ? '+' : ''}${pl.toFixed(2)}` : '—'}
            {pl != null && <span className="position-ccy"> {currency}</span>}
          </div>
        </div>
        <div className="position-card-row">
          <span className="text-muted">Stake</span>
          <span className="mono">{Number(contract.buy_price || 0).toFixed(2)}</span>
          <span className="position-time">
            {timeLeft ? <span className="position-time-inner"><Clock size={10} /> {timeLeft}</span> : '—'}
          </span>
        </div>
        {actions && <div className="position-card-actions">{actions}</div>}
        {updateRow}
      </div>
    );
  }

  return (
    <>
      <tr className="position-row-tr">
        <td className="position-symbol">{label}</td>
        <td className="position-type">{contract.contract_type || '—'}</td>
        <td className="mono">{Number(contract.buy_price || 0).toFixed(2)}</td>
        <td className={`mono ${plClass}`}>
          {pl != null ? `${pl >= 0 ? '+' : ''}${pl.toFixed(2)}` : '—'}
          {pl != null && <span className="position-ccy"> {currency}</span>}
        </td>
        <td className="position-time">
          {timeLeft ? <span className="position-time-inner"><Clock size={10} /> {timeLeft}</span> : '—'}
        </td>
        <td className="position-actions-cell">{actions}</td>
      </tr>
      {(showTP || showSL) && (
        <tr className="position-update-tr">
          <td colSpan={6}>{updateRow}</td>
        </tr>
      )}
    </>
  );
}
