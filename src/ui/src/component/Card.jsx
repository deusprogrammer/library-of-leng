import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPrice } from '../api/scryfall/scry-client';

const Card = ({ card, hide }) => {
    // Use the shop identifier already in the current URL (slug or UUID)
    // rather than card.shopId (always the canonical UUID). Otherwise,
    // browsing via a shop's slug and clicking a card silently switches
    // the URL to the UUID, which creates a second, separate cart and
    // breaks "Add to Cart" (see Shop.jsx for the cart-creation side).
    const { shopId } = useParams();

    return (
        <Link to={`/shops/${shopId}/inventory/${encodeURIComponent(card.inventoryId)}`}>
            <div style={{display: 'flex', flexDirection: 'column', width: '146px'}}>
                <div>
                    <img src={card.thumbnailUrl} />
                </div>
                <div>
                    {!hide?.includes("name") && card.name}
                    <br />
                    {!hide?.includes("price") && card.prices && `$${getPrice(card)}`}
                </div>
            </div>
        </Link>
    )
}

export default Card;