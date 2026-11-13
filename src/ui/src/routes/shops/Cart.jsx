import { useAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cartAtom } from '../../atoms/CartAtom';
import { getCart, getStoreCartMeta, removeFromCart } from '../../api/lol/lol-cart-client';
import { getScryfallCollection } from '../../api/scryfall/scry-client';
import ManaLoader from '../../component/ManaLoader';

// Minimal inline trash-can icon so the component has no icon-library
// dependency.
const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H9.8a2 2 0 0 1-2-1.9L7 7h10Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const getPrice = (scryfallCard) => {
    if (!scryfallCard?.prices) {
        return 0;
    }

    if (
        scryfallCard.finishes?.includes('etched') &&
        !scryfallCard.finishes?.includes('foil') &&
        !scryfallCard.finishes?.includes('nonfoil')
    ) {
        return Number(scryfallCard.prices.usd_etched ?? 0);
    }

    if (
        scryfallCard.finishes?.includes('foil') &&
        !scryfallCard.finishes?.includes('nonfoil')
    ) {
        return Number(scryfallCard.prices.usd_foil ?? 0);
    }

    return Number(scryfallCard.prices.usd ?? 0);
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
                        price: getPrice(scryfallCard)
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