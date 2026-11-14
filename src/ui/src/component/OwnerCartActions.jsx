import React, { useCallback, useState } from 'react';
import { clearCart, processCart } from '../api/lol/lol-owner-client';
import { formatMoney } from './CartItemsTable';
import ConfirmModal from './ConfirmModal';

const OwnerCartActions = ({ shopId, cart, onChanged }) => {
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const itemCount = (cart.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const closeModal = useCallback(() => setPending(null), []);

    const run = async () => {
        setBusy(true);
        setError(null);

        try {
            await (pending === 'process' ? processCart : clearCart)(shopId, cart.slug);
            setPending(null);
            await onChanged?.(pending);
        } catch (err) {
            console.error(err);
            setPending(null);
            setError(err.message);
            // Processing can partially succeed across batches, so always refresh.
            await onChanged?.(pending);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="owner-cart-actions">
            <div className="owner-cart-buttons">
                <button type="button" className="button-secondary" disabled={itemCount === 0 || busy} onClick={() => setPending('clear')}>
                    Clear Cart
                </button>
                <button type="button" disabled={itemCount === 0 || busy} onClick={() => setPending('process')}>
                    Process Cart
                </button>
            </div>
            {error && <div className="error-text">{error}</div>}
            {pending === 'process' && (
                <ConfirmModal
                    title="Process this cart?"
                    confirmLabel="Process Cart"
                    danger
                    busy={busy}
                    onConfirm={run}
                    onCancel={closeModal}
                >
                    <p>
                        This will permanently remove these {itemCount} {itemCount === 1 ? 'card' : 'cards'} from
                        your inventory and empty cart <strong>{cart.slug}</strong>.
                    </p>
                    {cart.total !== null && cart.total !== undefined && (
                        <p>Cart total: <strong>{formatMoney(cart.total)}</strong></p>
                    )}
                    <p>This can't be undone.</p>
                </ConfirmModal>
            )}
            {pending === 'clear' && (
                <ConfirmModal
                    title="Clear this cart?"
                    confirmLabel="Clear Cart"
                    busy={busy}
                    onConfirm={run}
                    onCancel={closeModal}
                >
                    <p>
                        This will remove all items from cart <strong>{cart.slug}</strong>. Your inventory won't change.
                    </p>
                </ConfirmModal>
            )}
        </div>
    );
};

export default OwnerCartActions;
