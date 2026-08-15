import React, { useState } from 'react';
import { getShopInventory, getShopInventoryBatch } from '../../api/lol/lol-inventory-client';
import { useParams } from 'react-router-dom';
import Card from '../../component/Card';

const MoxSearch = () => {
    const [moxfieldList, setMoxfieldList] = useState();
    const [hideList, setHideList] = useState(false);
    const [cards, setCards] = useState([]);
    const [ambiguousCards, setAmbiguousCards] = useState([]);

    const { shopId } = useParams();

    const parseMoxfieldList = (text) => {
        if (!text) {
            return {};
        }

        return text.split("\n").map((line) => {
            if (line.trim().split(" ").length === 1) {
                return null;
            }

            const [quantity, ...name] = line.trim().split(" ");
            return { quantity, name: name.join(' ') };
        }).filter(element => element);
    }

    const search = async (text) => {
        setHideList(false);
        const payload = parseMoxfieldList(text);

        const results = await getShopInventoryBatch(shopId, payload);
        setCards(results?.nonambiguousResults?.flatMap((result) => result.items.map((card => card))));
        setAmbiguousCards(results?.ambiguousResults);
    }

    return (
        <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            {cards.length <= 0 && <textarea rows="25" onChange={(e) => setMoxfieldList(e.target.value)} value={moxfieldList} />}
            {moxfieldList && cards.length <= 0 && <button onClick={() => { search(moxfieldList) }}>Search</button>}
            <h3>Singles Found</h3>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                {cards?.sort((card1, card2) => card1.colorCategory.localeCompare(card2.colorCategory)).map((card) => (
                    <Card card={card} />
                ))}
            </div>
            <h3>Cards with Variants</h3>
            {ambiguousCards.map(((card) => (
                <div style={{marginLeft: "10px"}}>
                    <h4>{card.name}</h4>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                        {card.items.map((variant) => (
                            <Card card={variant} hide={["name"]} />
                        ))}
                    </div>
                </div>
            )))}
        </div>
    )
}

export default MoxSearch;