import React, { useEffect, useState } from 'react';
import { getShop } from '../api/lol/lol-shop-client';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getCart } from '../api/lol/lol-cart-client';
import { cartAtom } from '../atoms/CartAtom';
import { useAtom } from 'jotai';

const Shop = () => {
    const [shop, setShop] = useState({});
    const [cart, setCart] = useAtom(cartAtom);

    const { shopId } = useParams();

    useEffect(() => {
        (async () => {
            const shopData = await getShop(shopId);
            const cartData = await getCart(shopId);
            setShop(shopData);
            setCart(cartData);
        })();
    }, []);

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <div><Link to={`/shops/${shopId}/inventory`}>&lt;Back</Link></div>
                <div><Link to={`/shops/${shopId}/cart`}>Cart{cart?.items?.length ? `[${cart?.items?.length}]` : null}</Link></div>
            </div>
            <div style={{ textAlign: 'center'}}>
                <h1>{shop.name}</h1>
            </div>
            <Outlet />
        </div>
    )
}

export default Shop;