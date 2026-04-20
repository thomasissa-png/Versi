import { useEffect, useRef } from 'react';

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="admin-confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label="Confirmation">
      <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="admin-confirm-actions">
          <button ref={cancelRef} className="btn" onClick={onCancel} type="button">
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm} type="button">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
