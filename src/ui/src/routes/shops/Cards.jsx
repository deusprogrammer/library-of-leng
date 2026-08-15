import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { searchInventory } from '../../api/lol/lol-inventory-client';
import Card from '../../component/Card';

const Cards = () => {
    const [ results, setResults ] = useState();
    const { drillKey, drillValue, shopId } = useParams();

    useEffect(() => {
        (async () => {
            const inventory = await searchInventory({
                identifier: shopId,
                by: drillKey,
                value: drillValue
            });
            setResults(inventory);
        })();
    }, []);

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px;', textAlign: 'center'}}>
            <h2>{drillValue}</h2>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: '5px'}}>
                {results?.sort((card1, card2) => card1.colorCategory.localeCompare(card2.colorCategory)).map((card) => (
                    <Card card={card} />
                ))}
            </div>
        </div>
    )
}

export default Cards;