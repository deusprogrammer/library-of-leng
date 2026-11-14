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
                Looking for a card? Head to the shop&rsquo;s in-store kiosk to
                browse their inventory, search for cards or paste in a Moxfield
                decklist, and build a cart to check out with at the counter.
            </p>

            <p style={{ maxWidth: '640px', margin: 0 }}>
                {user && isShopOwner()
                    ? <>Welcome back! Head to <Link to="/owner">My Shops</Link> to create or manage your shops.</>
                    : <>Are you a shop owner? <a href={getLoginUrl()}>Log in</a> to create and manage your shops, update inventory, view customer carts, and register kiosk devices.</>}
            </p>
        </div>
    );
};

export default SplashPage;
