import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { getDeviceCart, getRegisteredDevices, removeDevice } from '../../api/lol/lol-owner-client';
import CartItemsTable from '../../component/CartItemsTable';
import ManaLoader from '../../component/ManaLoader';
import OwnerCartActions from '../../component/OwnerCartActions';
import TrashIcon from '../../component/TrashIcon';

const formatTimestamp = (epochSeconds) => {
    if (!epochSeconds) {
        return "-";
    }

    return new Date(epochSeconds * 1000).toLocaleString();
};

const DeviceCart = ({ shopId, deviceId }) => {
    const [state, setState] = useState({ loading: true });

    const loadCart = useCallback(async (isCancelled = () => false) => {
        try {
            const cart = await getDeviceCart(shopId, deviceId);

            if (!isCancelled()) {
                setState({ loading: false, cart });
            }
        } catch (err) {
            console.error(err);

            if (!isCancelled()) {
                setState({ loading: false, error: err.message });
            }
        }
    }, [shopId, deviceId]);

    useEffect(() => {
        let cancelled = false;

        loadCart(() => cancelled);

        return () => {
            cancelled = true;
        };
    }, [loadCart]);

    if (state.loading) {
        return <ManaLoader />;
    }

    if (state.error) {
        return <div style={{ color: 'red' }}>{state.error}</div>;
    }

    if (!state.cart) {
        return <div className="device-cart-empty">No active cart for this device.</div>;
    }

    const { cart } = state;

    return (
        <div className="device-cart">
            <div className="device-cart-meta">
                <span>Cart <strong>{cart.slug}</strong></span>
                <span>Created: {formatTimestamp(cart.createdAt)}</span>
                <span>Expires: {formatTimestamp(cart.expiresAt)}</span>
            </div>
            <CartItemsTable items={cart.items} total={cart.total} showPrices />
            <OwnerCartActions shopId={shopId} cart={cart} onChanged={() => loadCart()} />
        </div>
    );
};

const ShopDevices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [removingDeviceId, setRemovingDeviceId] = useState(null);

    const { shopId } = useParams();
    const { shop } = useOutletContext() ?? {};

    const loadDevices = useCallback(async () => {
        try {
            const result = await getRegisteredDevices(shopId);

            setDevices([...result].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [shopId]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    const onRemove = async (device) => {
        const label = device.name ?? 'this device';

        if (!window.confirm(`Remove ${label}? It will need to be registered again to use the kiosk.`)) {
            return;
        }

        setRemovingDeviceId(device.deviceId);

        try {
            await removeDevice(shopId, device.deviceId);

            if (selectedDeviceId === device.deviceId) {
                setSelectedDeviceId(null);
            }

            await loadDevices();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setRemovingDeviceId(null);
        }
    };

    const toggleDevice = (deviceId) => {
        setSelectedDeviceId((current) => (current === deviceId ? null : deviceId));
    };

    if (loading) {
        return <ManaLoader />;
    }

    return (
        <div className="shop-devices">
            <h2>Registered Devices</h2>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {devices.length === 0
                ? <div>No devices are registered to {shop?.name ?? 'this shop'} yet.</div>
                : (
                    <ul className="device-list">
                        {devices.map((device) => {
                            const expanded = selectedDeviceId === device.deviceId;

                            return (
                                <li key={device.deviceId} className={`device-item${expanded ? ' expanded' : ''}`}>
                                    <div className="device-row">
                                        <button
                                            type="button"
                                            className="device-toggle"
                                            aria-expanded={expanded}
                                            onClick={() => toggleDevice(device.deviceId)}
                                        >
                                            <span className="device-caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
                                            <span className="device-name">{device.name ?? 'Unnamed device'}</span>
                                            <span className="device-date">Registered {formatTimestamp(device.createdAt)}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            title="Remove device"
                                            aria-label={`Remove ${device.name ?? 'device'}`}
                                            disabled={removingDeviceId === device.deviceId}
                                            onClick={() => onRemove(device)}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    {expanded && <DeviceCart shopId={shopId} deviceId={device.deviceId} />}
                                </li>
                            );
                        })}
                    </ul>
                )}
        </div>
    );
};

export default ShopDevices;
