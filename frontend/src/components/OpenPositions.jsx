import { useState } from 'react';
import { X } from 'lucide-react';

export default function OpenPositions({ contracts, onSell, onUpdateTP, onUpdateSL, currency }) {
  if (!contracts?.length) return null;

  return (
    <div className="open-positions card">
      <h3 className="heading-sm">Open Positions ({contracts.length})</h3>
      <div className="positions-list">
        {contracts.map((c) => (
          <PositionRow
            key={c.contract_id}
            contract={c}
            onSell={onSell}
            onUpdateTP={onUpdateTP}
            onUpdateSL={onUpdateSL}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}

function PositionRow({ contract, onSell, onUpdateTP, onUpdateSL, currency }) {
  const [showTP, setShowTP] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [showSL, setShowSL] = useState(false);

  const pl = contract.profit != null ? Number(contract.profit) : null;
  const plClass = pl != null ? (pl >= 0 ? 'profit' : 'loss') : '';

  return (
    <div className="position-row">
      <div className="position-info">
        <span className="position-symbol">{contract.symbol || '—'}</span>
        <span className="position-type">{contract.contract_type || '—'}</span>
        <span className="position-stake mono">{Number(contract.buy_price || 0).toFixed(2)} {currency}</span>
        {pl != null && (
          <span className={`position-pl mono ${plClass}`}>
            {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
          </span>
        )}
      </div>
      <div className="position-actions">
        {contract.is_sold !== 1 && contract.is_settleable !== 1 && (
          <>
            <button type="button" className="btn btn-danger btn-xs" onClick={() => onSell(contract.contract_id)}>
              <X size={12} /> Sell
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
