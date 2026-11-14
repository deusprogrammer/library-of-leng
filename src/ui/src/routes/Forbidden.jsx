import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DEVICE_FORBIDDEN_EVENT } from '../api/lol/lol-device-client';

export const Forbidden = () => {
    const location = useLocation();
    const identifier = location.state?.identifier;

    return (
        <div className="forbidden-page">
            <p className="forbidden-code">403</p>
            <h1>This device isn&rsquo;t registered</h1>
            <p>
                {identifier
                    ? <>This device doesn&rsquo;t have access to <strong>{identifier}</strong>&rsquo;s kiosk.</>
                    : <>This device doesn&rsquo;t have access to this shop&rsquo;s kiosk.</>}
                {' '}Ask the shop owner to register it from the Register Device page in their owner console.
            </p>
            <Link className="nav-button menu-action" to="/">Go to the home page</Link>
        </div>
    );
};

/** Sends the user to the 403 page whenever a kiosk API call is rejected. */
export const DeviceForbiddenRedirect = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const onForbidden = (e) => {
            navigate('/forbidden', { replace: true, state: { identifier: e.detail?.identifier } });
        };

        window.addEventListener(DEVICE_FORBIDDEN_EVENT, onForbidden);

        return () => window.removeEventListener(DEVICE_FORBIDDEN_EVENT, onForbidden);
    }, [navigate]);

    return null;
};
