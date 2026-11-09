import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getShopInventoryItem } from '../../api/lol/lol-inventory-client';
import { getPrice, getScryfallCard } from '../../api/scryfall/scry-client';
import { addToCart, getCart } from '../../api/lol/lol-cart-client';
import { useAtom } from 'jotai';
import { cartAtom } from '../../atoms/CartAtom';
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

    const handleAddToCart = async () => {
        setAdding(true);
        setAddError(null);

        try {
            await addToCart(shopId, inventoryId);
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

                    <button onClick={handleAddToCart} disabled={adding}>
                        {adding ? "Adding..." : "Add to Cart"}
                    </button>
                </div>
            </div>}
        </div>
    );
};

export default Card;