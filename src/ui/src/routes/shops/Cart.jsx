import { useAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cartAtom } from '../../atoms/CartAtom';
import { getCart, getStoreCartMeta, removeFromCart } from '../../api/lol/lol-cart-client';
import { getScryfallCollection } from '../../api/scryfall/scry-client';
import ManaLoader from '../../component/ManaLoader';
import TrashIcon from '../../component/TrashIcon';

// Mirrors the owner-side pricing in src/lambdas/utils/pricing.mjs so the
// kiosk total matches what the shop owner sees.
const getPrice = (scryfallCard, finish) => {
    const prices = scryfallCard?.prices;

    if (!prices) {
        return 0;
    }

    const toPrice = (value) => (value === null || value === undefined ? null : Number(value));
    const usd = toPrice(prices.usd);
    const foil = toPrice(prices.usd_foil);
    const etched = toPrice(prices.usd_etched);

    if (finish === 'etched') {
        return etched ?? foil ?? usd ?? 0;
    }

    if (finish === 'foil') {
        return foil ?? usd ?? 0;
    }

    return usd ?? foil ?? etched ?? 0;
};

const Cart = () => {
    const [cart, setCart] = useAtom(cartAtom);
    const [cartMeta, setCartMeta] = useState({});
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    const [error, setError] = useState(null);

    const { shopId } = useParams();

    useEffect(() => {
        const loadCartPrices = async () => {
            const meta = getStoreCartMeta(shopId);
            setCartMeta(meta || {});

            if (!cart?.items?.length) {
                setItems([]);
                setLoading(false);
                return;
            }

            const collection = await getScryfallCollection(
                cart.items.map((item) => item.scryfallId)
            );

            const scryfallCardsById = new Map(
                collection.data.map((card) => [card.id, card])
            );

            setItems(
                cart.items.map((item) => {
                    const scryfallCard =
                        scryfallCardsById.get(item.scryfallId);

                    return {
                        ...item,
                        price: getPrice(scryfallCard, item.finish)
                    };
                })
            );
            setLoading(false);
        };

        loadCartPrices();
    }, [cart, shopId]);

    const handleRemove = async (inventoryId) => {
        setRemovingId(inventoryId);
        setError(null);

        try {
            await removeFromCart(shopId, inventoryId);
            setCart(await getCart(shopId));
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setRemovingId(null);
        }
    };

    const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    if (loading) {
        return <ManaLoader />;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'center'
            }}
        >
            <h2>Cart</h2>

            {items.length > 0 ? (
                <>
                    <div className="table-scroll">
                    <table
                        style={{
                            width: '100%',
                            maxWidth: '600px',
                            margin: '20px auto',
                            borderCollapse: 'collapse'
                        }}
                    >
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.inventoryId}>
                                    <td
                                        style={{
                                            width: '1%',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <img
                                            src={item.thumbnailUrl}
                                            alt={item.name}
                                            style={{ height: '80px' }}
                                        />
                                    </td>

                                    <td
                                        style={{
                                            textAlign: 'left',
                                            paddingLeft: '10px'
                                        }}
                                    >
                                        {item.name}
                                    </td>

                                    <td
                                        style={{
                                            width: '1%',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ${item.price.toFixed(2)}
                                    </td>

                                    <td
                                        style={{
                                            width: '1%',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ×{item.quantity}
                                    </td>

                                    <td
                                        style={{
                                            width: '1%',
                                            whiteSpace: 'nowrap',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </td>

                                    <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                        <button
                                            onClick={() => handleRemove(item.inventoryId)}
                                            disabled={removingId === item.inventoryId}
                                            aria-label={`Remove ${item.name} from cart`}
                                            title="Remove from cart"
                                            className="icon-button"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td
                                    colSpan="4"
                                    style={{ textAlign: 'right' }}
                                >
                                    <strong>Total:</strong>
                                </td>

                                <td style={{ fontWeight: 'bold' }}>
                                    ${total.toFixed(2)}
                                </td>

                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                    </div>

                    {error && <div className="status error" style={{ marginTop: 0 }}>{error}</div>}

                    <p style={{ width: '100%', maxWidth: '600px', margin: '20px auto' }}>
                        To checkout, come to the register and give them your cart
                        name: <strong>{cartMeta?.slug}</strong>.
                    </p>
                </>
            ) : (
                <div>Cart is empty.</div>
            )}
        </div>
    );
};

export default Cart;