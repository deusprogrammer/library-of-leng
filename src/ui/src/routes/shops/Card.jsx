import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getShopInventoryItem } from '../../api/lol/lol-inventory-client';
import { getPrice, getScryfallCard } from '../../api/scryfall/scry-client';
import { addToCart, getCart, updateCartItemQuantity } from '../../api/lol/lol-cart-client';
import { useAtom } from 'jotai';
import { cartAtom, getCartQuantity } from '../../atoms/CartAtom';
import ManaLoader from '../../component/ManaLoader';

const Card = () => {
    const [card, setCard] = useState({});
    const [scryfallData, setScryfallData] = useState();
    const [cart, setCart] = useAtom(cartAtom);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState(null);
    const { shopId, inventoryId } = useParams();

    useEffect(() => {
        (async () => {
            const cardData = await getShopInventoryItem(shopId, inventoryId);
            const scryfallRes = await getScryfallCard(cardData.scryfallId);

            setCard(cardData);
            setScryfallData(scryfallRes);
        })();
    }, []);

    const cartQuantity = getCartQuantity(cart, inventoryId);
    const available = Number(card.quantity ?? 0);

    const runCartUpdate = async (update) => {
        setAdding(true);
        setAddError(null);

        try {
            await update();
            // Re-fetch from the server rather than guessing at the new
            // state locally, so the cart badge/count stays accurate.
            setCart(await getCart(shopId));
        } catch (err) {
            console.error(err);
            setAddError(err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleAddToCart = () => runCartUpdate(() => addToCart(shopId, inventoryId));
    const setCartQuantity = (quantity) => runCartUpdate(
        () => updateCartItemQuantity(shopId, inventoryId, quantity)
    );

    if (!scryfallData) {
        return <ManaLoader />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {scryfallData && <div className="card-detail">
                <img
                    src={scryfallData.image_uris?.large}
                    alt={scryfallData.name}
                />

                <div className="card-detail-info">
                    <div>
                        <h2>{scryfallData.name}</h2>
                        <div>{scryfallData.type_line}</div>
                    </div>

                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {scryfallData.oracle_text}
                    </div>

                    <div>
                        <strong>TCGPlayer Market:</strong>{" "}
                        {`$${getPrice(scryfallData)}`}
                    </div>

                    {addError && <div className="status error">{addError}</div>}

                    {cartQuantity > 0 ? (
                        <>
                            <button disabled>Already In Cart</button>
                            {available > 1 && (
                                <div className="cart-quantity">
                                    <span>Quantity in cart</span>
                                    <div className="quantity-stepper">
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            disabled={adding || cartQuantity <= 1}
                                            onClick={() => setCartQuantity(cartQuantity - 1)}
                                        >
                                            −
                                        </button>
                                        <span className="quantity-value" aria-live="polite">{cartQuantity}</span>
                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            disabled={adding || cartQuantity >= available}
                                            onClick={() => setCartQuantity(cartQuantity + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="quantity-available">{available} available</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <button onClick={handleAddToCart} disabled={adding}>
                            {adding ? "Adding..." : "Add to Cart"}
                        </button>
                    )}
                </div>
            </div>}
        </div>
    );
};

export default Card;