import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getShopInventoryItem } from '../../api/lol/lol-inventory-client';
import { getPrice, getScryfallCard } from '../../api/scryfall/scry-client';
import { addToCart } from '../../api/lol/lol-cart-client';
import { useAtom } from 'jotai';
import { cartAtom } from '../../atoms/CartAtom';
import ManaLoader from '../../component/ManaLoader';

const Card = () => {
    const [card, setCard] = useState({});
    const [scryfallData, setScryfallData] = useState();
    const [cart, setCart] = useAtom(cartAtom);
    const { shopId, inventoryId } = useParams();

    useEffect(() => {
        (async () => {
            const cardData = await getShopInventoryItem(shopId, inventoryId);
            const scryfallRes = await getScryfallCard(cardData.scryfallId);

            setCard(cardData);
            setScryfallData(scryfallRes);
        })();
    }, []);

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

                    <button onClick={() => {
                        const cartItem = addToCart(shopId, inventoryId);
                        setCart({ items: [...cart.items, cartItem] });
                    }}>Add to Cart</button>
                </div>
            </div>}
        </div>
    );
};

export default Card;