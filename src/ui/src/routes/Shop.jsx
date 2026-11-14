import React, { useEffect, useState } from 'react';
import { getShop } from '../api/lol/lol-shop-client';
import { Outlet, useParams } from 'react-router-dom';
import { getCart } from '../api/lol/lol-cart-client';
import { cartAtom } from '../atoms/CartAtom';
import { useSetAtom } from 'jotai';
import ManaLoader from '../component/ManaLoader';

const Shop = () => {
    const [shop, setShop] = useState({});
    const [loading, setLoading] = useState(true);
    const setCart = useSetAtom(cartAtom);

    const { shopId } = useParams();

    useEffect(() => {
        setLoading(true);

        (async () => {
            try {
                const shopData = await getShop(shopId);
                const cartData = await getCart(shopId);
                setShop(shopData);
                setCart(cartData);
                setLoading(false);
            } catch (err) {
                // Auth failures are routed to the 403 page by deviceFetch.
                console.error(err);
            }
        })();
    }, [shopId]);

    if (loading) {
        return <ManaLoader />;
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h1>{shop.name}</h1>
            </div>
            <Outlet />
        </div>
    )
}

export default Shop;