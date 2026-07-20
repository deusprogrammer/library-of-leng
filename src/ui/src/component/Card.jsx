import React from 'react';
import { Link } from 'react-router-dom';

const Card = ({ card }) => {
    return (
        <Link to={`/shops/${card.shopId}/inventory/${encodeURIComponent(card.inventoryId)}`}>
            <div style={{display: 'flex', flexDirection: 'column', width: '146px'}}>
                <div>
                    <img src={card.thumbnailUrl} />
                </div>
                <div>
                    {card.name}
                </div>
            </div>
        </Link>
    )
}

export default Card;