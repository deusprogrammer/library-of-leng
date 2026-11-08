import React, { useState } from 'react';
import { getShopInventoryBatch } from '../../api/lol/lol-inventory-client';
import { useParams } from 'react-router-dom';
import Card from '../../component/Card';
import ManaLoader from '../../component/ManaLoader';

// Strips a trailing Moxfield set-code/collector-number suffix, e.g.
// "Sol Ring (C20) 263" -> "Sol Ring". Requires a short alnum set code
// immediately followed by a collector number, so legitimate parenthetical
// card names (e.g. "B.F.M. (Big Furry Monster)") are left alone.
const SET_SUFFIX_PATTERN = /\s*\([A-Za-z0-9]{2,6}\)\s+[A-Za-z0-9-]+\*?\s*$/;

// Strips trailing Moxfield tags like "*F*" or "*CMDR*".
const TAG_PATTERN = /\s*(\*[^*]+\*\s*)+$/;

export const parseMoxfieldList = (text) => {
    if (!text) {
        return [];
    }

    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("//"))
        .map((line) => {
            // Lines that don't start with "<quantity>[x] <name>" are
            // section headers (Deck/Sideboard/Commander) or junk - skip them.
            const match = line.match(/^(\d+)x?\s+(.+)$/i);

            if (!match) {
                return null;
            }

            const [, quantity, rest] = match;
            const name = rest
                .replace(TAG_PATTERN, "")
                .replace(SET_SUFFIX_PATTERN, "")
                .trim();

            if (!name) {
                return null;
            }

            return { quantity: Number(quantity), name };
        })
        .filter(Boolean);
}

const MoxSearch = () => {
    const [moxfieldList, setMoxfieldList] = useState();
    const [cards, setCards] = useState([]);
    const [ambiguousCards, setAmbiguousCards] = useState([]);
    const [notFoundCards, setNotFoundCards] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);

    const { shopId } = useParams();

    const search = async (text) => {
        setSearching(true);
        setError(null);

        const payload = parseMoxfieldList(text);

        if (payload.length === 0) {
            setSearching(false);
            setError("Couldn't find any \"<quantity> <card name>\" lines to search for.");
            return;
        }

        try {
            const results = await getShopInventoryBatch(shopId, payload);
            setCards(results?.nonambiguousResults?.flatMap((result) => result.items.map((card => card))) ?? []);
            setAmbiguousCards(results?.ambiguousResults ?? []);
            setNotFoundCards(results?.notFound ?? []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "Search failed. Please try again.");
        } finally {
            setSearching(false);
        }
    }

    const reset = () => {
        setMoxfieldList("");
        setCards([]);
        setAmbiguousCards([]);
        setNotFoundCards([]);
        setError(null);
    }

    if (searching) {
        return <ManaLoader />;
    }

    const hasResults = cards.length > 0 || ambiguousCards.length > 0 || notFoundCards.length > 0;

    return (
        <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            {!hasResults && (
                <>
                    <textarea
                        rows="25"
                        placeholder={"Paste a Moxfield decklist, e.g.\n4 Lightning Bolt\n1 Sol Ring (C20) 263"}
                        onChange={(e) => setMoxfieldList(e.target.value)}
                        value={moxfieldList}
                    />
                    {error && <div className="status error">{error}</div>}
                    {moxfieldList && <button onClick={() => { search(moxfieldList) }}>Search</button>}
                </>
            )}

            {hasResults && (
                <>
                    <button onClick={reset}>Start a New Search</button>

                    <h3>Singles Found</h3>
                    {cards.length === 0 && <div className="count">None of your cards were found in stock as a single unambiguous match.</div>}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                        {[...cards].sort((card1, card2) => card1.colorCategory.localeCompare(card2.colorCategory)).map((card) => (
                            <Card key={card.inventoryId} card={card} />
                        ))}
                    </div>

                    {ambiguousCards.length > 0 && <h3>Cards with Variants</h3>}
                    {ambiguousCards.map((card) => (
                        <div key={card.name} style={{marginLeft: "10px"}}>
                            <h4>{card.name}</h4>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                                {card.items.map((variant) => (
                                    <Card key={variant.inventoryId} card={variant} hide={["name"]} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {notFoundCards.length > 0 && (
                        <>
                            <h3>Not Found</h3>
                            <ul>
                                {notFoundCards.map((result) => (
                                    <li key={result.name}>{result.name}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default MoxSearch;