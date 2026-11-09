import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getLoginUrl, isShopOwner } from '../api/auth';
import splashImage from '../../assets/library-of-leng-splash.jpg';

const SplashPage = () => {
    const { user } = useAuth();

    return (
        <div style={{
            textAlign: 'center',
            maxWidth: '900px',
            margin: '2rem auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
        }}>
            {/* The title is baked into the hero image; keep an accessible,
                visually-hidden heading for screen readers/SEO. */}
            <h1 className="sr-only">Library of Leng</h1>

            <img
                src={splashImage}
                alt="Library of Leng"
                className="splash-hero"
            />

            <p style={{ maxWidth: '640px', margin: 0 }}>
                Looking for a store? Each participating shop has a QR code posted
                at the register or front counter — scan it with your phone's
                camera to jump straight to that store's kiosk, browse their
                inventory, and build a cart to check out with.
            </p>

            <p style={{ maxWidth: '640px', margin: 0 }}>
                {user && isShopOwner()
                    ? <>Welcome back! Head to <Link to="/owner">My Shops</Link> to create or manage your shops.</>
                    : <>Are you a shop owner? <a href={getLoginUrl()}>Log in</a> to create and manage your shops, update inventory, and view customer carts.</>}
            </p>
        </div>
    );
};

export default SplashPage;
