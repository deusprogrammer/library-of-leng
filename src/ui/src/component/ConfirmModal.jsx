import React, { useEffect, useRef } from 'react';

const ConfirmModal = ({ title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) => {
    const cancelRef = useRef(null);

    useEffect(() => {
        cancelRef.current?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !busy) {
                onCancel();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [busy, onCancel]);

    return (
        <div className="modal-backdrop" onClick={() => !busy && onCancel()}>
            <div
                className="modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="confirm-modal-title">{title}</h3>
                <div className="modal-body">{children}</div>
                <div className="modal-actions">
                    <button type="button" className="button-secondary" ref={cancelRef} disabled={busy} onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className={danger ? 'button-danger' : undefined} disabled={busy} onClick={onConfirm}>
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
