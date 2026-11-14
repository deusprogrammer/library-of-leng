import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { createRegistrationInvite, getRegisteredDevices } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';

const POLL_INTERVAL_MS = 3000;

const formatRemaining = (seconds) => {
    const clamped = Math.max(0, seconds);
    const minutes = Math.floor(clamped / 60);
    const secs = String(clamped % 60).padStart(2, '0');

    return `${minutes}:${secs}`;
};

const RegisterDevice = () => {
    const { shopId } = useParams();
    const { shop } = useOutletContext() ?? {};

    const [invite, setInvite] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    const [pairedDevice, setPairedDevice] = useState(null);

    const knownDeviceKeys = useRef(null);

    // Devices register against the slug so their stored key matches the
    // storefront URL; wait for the shop to load before building the link.
    const shopIdentifier = shop?.slug;
    const pairingUrl = invite && shopIdentifier
        ? `${window.location.origin}/register/${encodeURIComponent(shopIdentifier)}#pairingKey=${encodeURIComponent(invite.pairingKey)}`
        : null;

    const secondsLeft = invite ? invite.expiresAt - now : 0;
    const expired = Boolean(invite) && secondsLeft <= 0;

    const createInvite = useCallback(async () => {
        setCreating(true);
        setError(null);
        setPairedDevice(null);
        setInvite(null);
        setQrDataUrl(null);

        try {
            const devices = await getRegisteredDevices(shopId);
            knownDeviceKeys.current = new Set(devices.map((device) => device.itemKey));

            setInvite(await createRegistrationInvite(shopId));
            setNow(Math.floor(Date.now() / 1000));
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setCreating(false);
        }
    }, [shopId]);

    useEffect(() => {
        createInvite();
    }, [createInvite]);

    useEffect(() => {
        if (!pairingUrl) {
            return;
        }

        let cancelled = false;

        QRCode.toDataURL(pairingUrl, { width: 320, margin: 2 })
            .then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl); })
            .catch((err) => { if (!cancelled) setError(err.message); });

        return () => { cancelled = true; };
    }, [pairingUrl]);

    useEffect(() => {
        if (!invite || expired || pairedDevice) {
            return;
        }

        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);

        return () => clearInterval(timer);
    }, [invite, expired, pairedDevice]);

    // Watch for the newly paired device so the owner gets confirmation.
    useEffect(() => {
        if (!invite || expired || pairedDevice) {
            return;
        }

        let cancelled = false;

        const poll = setInterval(async () => {
            try {
                const devices = await getRegisteredDevices(shopId);
                const added = devices.find((device) => !knownDeviceKeys.current?.has(device.itemKey));

                if (added && !cancelled) {
                    setPairedDevice(added);
                }
            } catch (err) {
                console.error(err);
            }
        }, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(poll);
        };
    }, [invite, expired, pairedDevice, shopId]);

    if (pairedDevice) {
        return (
            <div className="register-device">
                <h2>Device registered</h2>
                <p className="register-device-success">
                    <strong>{pairedDevice.name ?? 'Unnamed device'}</strong> can now use the {shop?.name ?? 'shop'} kiosk.
                </p>
                <div className="register-device-actions">
                    <button type="button" onClick={createInvite}>Register another device</button>
                    <Link to={`/owner/shops/${shopId}/devices`}>View devices</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="register-device">
            <h2>Register Device</h2>
            <p className="register-device-help">
                Scan this QR code with the device you want to use as a kiosk for this shop.
                It will ask for a name, then it&rsquo;s ready to go. The code works once and expires in 5 minutes.
            </p>

            {error && <p className="error-text">{error}</p>}

            {(creating || (invite && !qrDataUrl && !expired)) && <ManaLoader />}

            {invite && qrDataUrl && !expired && (
                <>
                    <img className="register-device-qr" src={qrDataUrl} alt="Device pairing QR code" />
                    <p className="register-device-timer">Expires in {formatRemaining(secondsLeft)}</p>
                    <details className="register-device-link">
                        <summary>Can&rsquo;t scan? Open this link on the device instead</summary>
                        <code>{pairingUrl}</code>
                    </details>
                </>
            )}

            {expired && (
                <div className="register-device-actions">
                    <p>This pairing code has expired.</p>
                    <button type="button" onClick={createInvite}>Generate a new code</button>
                </div>
            )}

            {!creating && !invite && error && (
                <div className="register-device-actions">
                    <button type="button" onClick={createInvite}>Try again</button>
                </div>
            )}
        </div>
    );
};

export default RegisterDevice;
