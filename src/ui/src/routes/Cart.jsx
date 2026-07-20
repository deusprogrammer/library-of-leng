import { useAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { cartAtom } from '../atoms/CartAtom';
import { getStoreCartMeta } from '../api/lol/lol-cart-client';
import { getScryfallCollection } from '../api/scryfall/scry-client';
import { useParams } from 'react-router-dom';

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
    const [cart] = useAtom(cartAtom);
    const [cartMeta, setCartMeta] = useState({});
    const [items, setItems] = useState([]);

    const { shopId } = useParams();

    useEffect(() => {
        const loadCartPrices = async () => {
            const meta = getStoreCartMeta(shopId);
            setCartMeta(meta || {});

            if (!cart?.items?.length) {
                setItems([]);
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
        };

        loadCartPrices();
    }, [cart, shopId]);

    const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

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
                    <table
                        style={{
                            width: '60%',
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
                            </tr>
                        </tfoot>
                    </table>

                    <p style={{ width: '60%', margin: '20px auto' }}>
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