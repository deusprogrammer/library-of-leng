import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShopInventory } from '../../api/lol/lol-inventory-client';
import Card from '../../component/Card';

const Inventory = () => {
    const [ inventory, setInventory ] = useState([]);
    const { shopId } = useParams();

    useEffect(() => {
        (async () => {
            const inventoryData = await getShopInventory(shopId);
            setInventory(inventoryData);
        })()
    }, []);

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px;', textAlign: 'center'}}>
            <h2>Inventory</h2>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: '5px'}}>
                {inventory?.sort((card1, card2) => card1.colorCategory.localeCompare(card2.colorCategory)).map((card) => (
                    <Card card={card} />
                ))}
            </div>
        </div>
    )
}

export default Inventory;