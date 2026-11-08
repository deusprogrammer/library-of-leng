import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listShopCarts } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';

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
                            {cart.items.length === 0
                                ? <div>Cart is empty.</div>
                                : (
                                    <div className="table-scroll">
                                    <table style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '5px' }}>Name</th>
                                                <th style={{ textAlign: 'left', padding: '5px' }}>Set</th>
                                                <th style={{ textAlign: 'left', padding: '5px' }}>Finish</th>
                                                <th style={{ textAlign: 'right', padding: '5px' }}>Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.items.map((item) => (
                                                <tr key={item.itemKey}>
                                                    <td style={{ padding: '5px' }}>{item.name}</td>
                                                    <td style={{ padding: '5px' }}>{item.setCode?.toUpperCase()}</td>
                                                    <td style={{ padding: '5px' }}>{item.finish}</td>
                                                    <td style={{ padding: '5px', textAlign: 'right' }}>{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                )}
                        </div>
                    ))}
        </div>
    );
};

export default ShopCarts;
