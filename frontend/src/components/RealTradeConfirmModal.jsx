import { AlertTriangle } from 'lucide-react';
import { setRealTradeConfirmation } from '../lib/accountDisplay';

export default function RealTradeConfirmModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  const handleConfirm = () => {
    setRealTradeConfirmation();
    onConfirm?.();
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card card">
        <div className="modal-icon-wrap">
          <AlertTriangle size={32} color="#ffb74d" />
        </div>
        <h3 className="heading-md">Live account trade</h3>
        <p className="text-secondary">
          You are about to place a trade on a <strong>real money</strong> Deriv account.
          Losses are real. Only continue if you intend to trade with live funds.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            I understand — trade live
          </button>
        </div>
      </div>
    </div>
  );
}
