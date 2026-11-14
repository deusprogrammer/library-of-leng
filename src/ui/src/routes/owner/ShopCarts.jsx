import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listShopCarts } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';
import CartItemsTable from '../../component/CartItemsTable';

const formatTimestamp = (epochSeconds) => {
    if (!epochSeconds) {
        return "-";
    }

    return new Date(epochSeconds * 1000).toLocaleString();
};

const ShopCarts = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { shopId } = useParams();

    useEffect(() => {
        (async () => {
            try {
                setCarts(await listShopCarts(shopId));
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [shopId]);

    if (loading) {
        return <ManaLoader />;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2>Carts</h2>
            {carts.length === 0
                ? <div>No active carts.</div>
                : [...carts]
                    .sort((cart1, cart2) => (cart2.createdAt ?? 0) - (cart1.createdAt ?? 0))
                    .map((cart) => (
                        <div key={cart.cartId} style={{ border: '1px solid #ccc', padding: '10px' }}>
                            <h3>{cart.slug}</h3>
                            <div>Created: {formatTimestamp(cart.createdAt)}</div>
                            <div>Expires: {formatTimestamp(cart.expiresAt)}</div>
                            <CartItemsTable items={cart.items} />
                        </div>
                    ))}
        </div>
    );
};

export default ShopCarts;
