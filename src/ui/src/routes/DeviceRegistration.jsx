import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { registerDevice } from '../api/lol/lol-device-client';

const DeviceRegistration = () => {
    const { shopId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // The pairing key travels in the URL fragment so it isn't sent to the server.
    const pairingKey = useMemo(
        () => new URLSearchParams(location.hash.replace(/^#/, '')).get('pairingKey'),
        [location.hash]
    );

    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const onSubmit = async (e) => {
        e.preventDefault();

        const trimmed = name.trim();

        if (!trimmed) {
            setError('Please give this device a name.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await registerDevice(shopId, { pairingKey, name: trimmed });
            navigate(`/shops/${shopId}`, { replace: true });
        } catch (err) {
            console.error(err);
            setError(`${err.message} Ask the shop owner for a new QR code.`);
            setSubmitting(false);
        }
    };

    if (!pairingKey) {
        return (
            <div className="device-registration">
                <h1>Register this device</h1>
                <p className="error-text">
                    This link is missing its pairing code. Scan the QR code shown in the shop&rsquo;s owner console again.
                </p>
            </div>
        );
    }

    return (
        <div className="device-registration">
            <h1>Register this device</h1>
            <p>Give this device a name so the shop owner can tell their kiosks apart.</p>
            <form onSubmit={onSubmit}>
                <label htmlFor="device-name">Device name</label>
                <input
                    id="device-name"
                    type="text"
                    value={name}
                    maxLength={100}
                    placeholder="e.g. Front counter iPad"
                    autoFocus
                    required
                    onChange={(e) => setName(e.target.value)}
                />
                <button type="submit" disabled={submitting || !name.trim()}>
                    {submitting ? 'Registering…' : 'Register device'}
                </button>
            </form>
            {error && <p className="error-text">{error}</p>}
        </div>
    );
};

export default DeviceRegistration;
