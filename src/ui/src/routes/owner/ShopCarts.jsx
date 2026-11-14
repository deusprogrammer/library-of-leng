import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDeviceCart, getRegisteredDevices } from '../../api/lol/lol-owner-client';
import CartItemsTable from '../../component/CartItemsTable';
import ManaLoader from '../../component/ManaLoader';
import OwnerCartActions from '../../component/OwnerCartActions';

const formatTimestamp = (epochSeconds) => {
    if (!epochSeconds) {
        return "-";
    }

    return new Date(epochSeconds * 1000).toLocaleString();
};

const loadDeviceCart = async (shopId, deviceId) => {
    try {
        return { cart: await getDeviceCart(shopId, deviceId) };
    } catch (err) {
        console.error(err);

        return { error: err.message };
    }
};

const DeviceCart = ({ shopId, device, result, onChanged }) => {
    const { cart, error } = result ?? {};

    return (
        <li className="device-item expanded">
            <div className="device-cart-header">
                <span className="device-name">{device.name ?? 'Unnamed device'}</span>
                {cart && <span className="device-cart-total">{cart.items.length > 0 ? `Total ${cart.total === null ? '—' : `$${cart.total.toFixed(2)}`}` : 'Empty'}</span>}
            </div>
            {error && <div className="device-cart-empty error-text">{error}</div>}
            {!error && !cart && <div className="device-cart-empty">No active cart for this device.</div>}
            {cart && (
                <div className="device-cart">
                    <div className="device-cart-meta">
                        <span>Cart <strong>{cart.slug}</strong></span>
                        <span>Created: {formatTimestamp(cart.createdAt)}</span>
                        <span>Expires: {formatTimestamp(cart.expiresAt)}</span>
                    </div>
                    <CartItemsTable items={cart.items} total={cart.total} showPrices />
                    <OwnerCartActions shopId={shopId} cart={cart} onChanged={onChanged} />
                </div>
            )}
        </li>
    );
};

const ShopCarts = () => {
    const [devices, setDevices] = useState([]);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { shopId } = useParams();

    const loadCarts = useCallback(async () => {
        try {
            const registered = [...await getRegisteredDevices(shopId)]
                .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
            const loaded = await Promise.all(
                registered.map(async (device) => [device.deviceId, await loadDeviceCart(shopId, device.deviceId)])
            );

            setDevices(registered);
            setResults(Object.fromEntries(loaded));
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        loadCarts();
    }, [loadCarts]);

    const reloadDevice = useCallback(async (deviceId) => {
        const result = await loadDeviceCart(shopId, deviceId);

        setResults((current) => ({ ...current, [deviceId]: result }));
    }, [shopId]);

    if (loading) {
        return <ManaLoader />;
    }

    // Devices with a non-empty cart first, then by most recent registration.
    const hasItems = (device) => (results[device.deviceId]?.cart?.items?.length ?? 0) > 0;
    const orderedDevices = [...devices].sort((a, b) => Number(hasItems(b)) - Number(hasItems(a)));

    return (
        <div className="shop-devices">
            <div className="shop-devices-header">
                <h2>Carts</h2>
                <button type="button" className="button-secondary" onClick={loadCarts}>Refresh</button>
            </div>
            {error && <div className="error-text">{error}</div>}
            {devices.length === 0
                ? (
                    <div>
                        No devices are registered yet. <Link to={`/owner/shops/${shopId}/devices/register`}>Register a device</Link> to start taking carts.
                    </div>
                )
                : (
                    <ul className="device-list">
                        {orderedDevices.map((device) => (
                            <DeviceCart
                                key={device.deviceId}
                                shopId={shopId}
                                device={device}
                                result={results[device.deviceId]}
                                onChanged={() => reloadDevice(device.deviceId)}
                            />
                        ))}
                    </ul>
                )}
        </div>
    );
};

export default ShopCarts;
