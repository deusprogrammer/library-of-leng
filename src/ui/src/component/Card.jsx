import React from 'react';
import { Link } from 'react-router-dom';
import { getPrice } from '../api/scryfall/scry-client';

const Card = ({ card, hide }) => {
    return (
        <Link to={`/shops/${card.shopId}/inventory/${encodeURIComponent(card.inventoryId)}`}>
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