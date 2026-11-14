import React, { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getMyShop } from '../../api/lol/lol-owner-client';

const ManageShop = () => {
    const [shop, setShop] = useState({});
    const { shopId } = useParams();

    useEffect(() => {
        (async () => {
            try {
                setShop(await getMyShop(shopId));
            } catch (err) {
                console.error(err);
            }
        })();
    }, [shopId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '10px' }}>
            <div className="owner-nav">
                <Link to="/owner">&lt; My Shops</Link>
                <Link to={`/owner/shops/${shopId}`}>Inventory</Link>
                <Link to={`/owner/shops/${shopId}/carts`}>Carts</Link>
                <Link to={`/owner/shops/${shopId}/upload`}>CSV Upload</Link>
                <Link to={`/shops/${shop.slug ?? shopId}`}>View Storefront</Link>
                <Link className="owner-nav-button" to={`/owner/shops/${shopId}/devices/register`}>Register Device</Link>
            </div>
            <div style={{ textAlign: 'center' }}>
                <h1>{shop.name} (Management)</h1>
            </div>
            <Outlet context={{ shop }} />
        </div>
    );
};

export default ManageShop;
