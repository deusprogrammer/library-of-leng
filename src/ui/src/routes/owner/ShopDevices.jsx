import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { getRegisteredDevices, removeDevice } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';
import TrashIcon from '../../component/TrashIcon';

const formatTimestamp = (epochSeconds) => {
    if (!epochSeconds) {
        return "-";
    }

    return new Date(epochSeconds * 1000).toLocaleString();
};

const ShopDevices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

            await loadDevices();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setRemovingDeviceId(null);
        }
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
                        {devices.map((device) => (
                            <li key={device.deviceId} className="device-item">
                                <div className="device-row">
                                    <div className="device-info">
                                        <span className="device-name">{device.name ?? 'Unnamed device'}</span>
                                        <span className="device-date">Registered {formatTimestamp(device.createdAt)}</span>
                                    </div>
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
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
};

export default ShopDevices;
