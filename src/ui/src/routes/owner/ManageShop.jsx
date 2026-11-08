import React, { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getShop } from '../../api/lol/lol-shop-client';

const ManageShop = () => {
    const [shop, setShop] = useState({});
    const { shopId } = useParams();

    useEffect(() => {
        (async () => {
            setShop(await getShop(shopId));
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
            </div>
            <div style={{ textAlign: 'center' }}>
                <h1>{shop.name} (Management)</h1>
            </div>
            <Outlet />
        </div>
    );
};

export default ManageShop;
