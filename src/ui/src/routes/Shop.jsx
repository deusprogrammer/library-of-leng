import React, { useEffect, useState } from 'react';
import { getShop } from '../api/lol/lol-shop-client';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { getCart } from '../api/lol/lol-cart-client';
import { cartAtom } from '../atoms/CartAtom';
import { useAtom } from 'jotai';
import ManaLoader from '../component/ManaLoader';

const Shop = () => {
    const [shop, setShop] = useState({});
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useAtom(cartAtom);

    const { shopId } = useParams();
    const navigate   = useNavigate();

    useEffect(() => {
        (async () => {
            const shopData = await getShop(shopId);
            const cartData = await getCart(shopId);
            setShop(shopData);
            setCart(cartData);
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return <ManaLoader />;
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <div onClick={() => navigate(-1)}>&lt;Back</div>
                <div><Link to={`/shops/${shopId}`}>Home</Link></div>
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