import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getLoginUrl, isShopOwner } from '../api/auth';

const SplashPage = () => {
    const { user } = useAuth();

    return (
        <div style={{
            textAlign: 'center',
            maxWidth: '640px',
            margin: '4rem auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
        }}>
            <h1>Library of Leng</h1>

            <p>
                Looking for a store? Each participating shop has a QR code posted
                at the register or front counter — scan it with your phone's
                camera to jump straight to that store's kiosk, browse their
                inventory, and build a cart to check out with.
            </p>

            <p>
                {user && isShopOwner()
                    ? <>Welcome back! Head to <Link to="/owner">My Shops</Link> to create or manage your shops.</>
                    : <>Are you a shop owner? <a href={getLoginUrl()}>Log in</a> to create and manage your shops, update inventory, and view customer carts.</>}
            </p>
        </div>
    );
};

export default SplashPage;
