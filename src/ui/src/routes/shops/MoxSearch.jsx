import React, { useState } from 'react';
import { getShopInventoryBatch } from '../../api/lol/lol-inventory-client';
import { addToCart, getCart } from '../../api/lol/lol-cart-client';
import { getPrice } from '../../api/scryfall/scry-client';
import { useParams } from 'react-router-dom';
import { useAtom } from 'jotai';
import { cartAtom } from '../../atoms/CartAtom';
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

// A selectable (non-navigating) variant tile, used so the user can pick
// which printing/finish they want for an ambiguous card name without
// being sent away to the card detail page.
const VariantTile = ({ card, selected, onSelect }) => (
    <div
        onClick={onSelect}
        style={{
            display: 'flex',
            flexDirection: 'column',
            width: '146px',
            cursor: 'pointer',
            border: selected ? '3px solid #e2b96f' : '3px solid transparent',
            borderRadius: '8px',
            padding: '3px'
        }}
    >
        <img src={card.thumbnailUrl} alt="" style={{ width: '100%', borderRadius: '6px' }} />
        <div>{card.prices && `$${getPrice(card)}`}</div>
    </div>
);

const MoxSearch = () => {
    const [moxfieldList, setMoxfieldList] = useState();
    const [cards, setCards] = useState([]);
    const [ambiguousCards, setAmbiguousCards] = useState([]);
    const [notFoundCards, setNotFoundCards] = useState([]);
    const [requestedQuantities, setRequestedQuantities] = useState({});
    const [selectedVariants, setSelectedVariants] = useState({});
    const [variantQuantities, setVariantQuantities] = useState({});
    const [searching, setSearching] = useState(false);
    const [addingAll, setAddingAll] = useState(false);
    const [addProgress, setAddProgress] = useState({ done: 0, total: 0 });
    const [addResults, setAddResults] = useState(null);
    const [error, setError] = useState(null);

    const { shopId } = useParams();
    const [, setCart] = useAtom(cartAtom);

    const search = async (text) => {
        setSearching(true);
        setError(null);
        setAddResults(null);

        const payload = parseMoxfieldList(text);

        if (payload.length === 0) {
            setSearching(false);
            setError("Couldn't find any \"<quantity> <card name>\" lines to search for.");
            return;
        }

        const quantityByName = Object.fromEntries(
            payload.map((item) => [item.name, item.quantity])
        );

        try {
            const results = await getShopInventoryBatch(shopId, payload);

            // Tag each single match with the original requested name so we
            // can look its quantity back up after the search completes.
            const singles = (results?.nonambiguousResults ?? []).flatMap((result) =>
                result.items.map((item) => ({ ...item, requestedName: result.name }))
            );
            const ambiguous = results?.ambiguousResults ?? [];

            setCards(singles);
            setAmbiguousCards(ambiguous);
            setNotFoundCards(results?.notFound ?? []);
            setRequestedQuantities(quantityByName);
            setSelectedVariants({});
            setVariantQuantities(
                Object.fromEntries(
                    ambiguous.map((group) => [group.name, quantityByName[group.name] ?? 1])
                )
            );
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
        setRequestedQuantities({});
        setSelectedVariants({});
        setVariantQuantities({});
        setAddResults(null);
        setError(null);
    }

    const unresolvedVariants = ambiguousCards.filter((group) => !selectedVariants[group.name]);

    const addAllToCart = async () => {
        if (unresolvedVariants.length > 0) {
            setError(`Please select a variant below for: ${unresolvedVariants.map((g) => g.name).join(", ")}`);
            return;
        }

        setError(null);
        setAddResults(null);

        const toAdd = [
            ...cards.map((card) => ({
                inventoryId: card.inventoryId,
                name: card.requestedName ?? card.name,
                quantity: requestedQuantities[card.requestedName] ?? 1
            })),
            ...ambiguousCards.map((group) => ({
                inventoryId: selectedVariants[group.name],
                name: group.name,
                quantity: variantQuantities[group.name] ?? 1
            }))
        ];

        setAddingAll(true);
        setAddProgress({ done: 0, total: toAdd.length });

        const added = [];
        const failed = [];

        for (const item of toAdd) {
            try {
                await addToCart(shopId, item.inventoryId, item.quantity);
                added.push(item);
            } catch (err) {
                failed.push({ ...item, reason: err.message });
            }

            setAddProgress((existing) => ({ ...existing, done: existing.done + 1 }));
        }

        try {
            setCart(await getCart(shopId));
        } catch (err) {
            console.error("Failed to refresh cart after bulk add", err);
        }

        setAddResults({ added, failed });
        setAddingAll(false);
    }

    if (searching) {
        return <ManaLoader />;
    }

    if (addingAll) {
        return <ManaLoader phrase={`Adding ${addProgress.done}/${addProgress.total} cards to cart...`} />;
    }

    const hasResults = cards.length > 0 || ambiguousCards.length > 0 || notFoundCards.length > 0;
    const canAddAnything = cards.length > 0 || ambiguousCards.length > 0;

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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <button onClick={reset}>Start a New Search</button>
                        {canAddAnything && !addResults && (
                            <button onClick={addAllToCart} disabled={unresolvedVariants.length > 0}>
                                Add All to Cart
                            </button>
                        )}
                        {canAddAnything && unresolvedVariants.length > 0 && !addResults && (
                            <span className="count" style={{ margin: 0 }}>
                                Select a variant for each card below first.
                            </span>
                        )}
                    </div>

                    {error && <div className="status error">{error}</div>}

                    {addResults && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div className="status" style={{ margin: 0, color: '#6fbf73' }}>
                                Added {addResults.added.length} card{addResults.added.length === 1 ? "" : "s"} to cart.
                            </div>
                            {addResults.failed.length > 0 && (
                                <div className="status error" style={{ margin: 0 }}>
                                    {addResults.failed.length} card(s) could not be added:
                                    <ul>
                                        {addResults.failed.map((item, index) => (
                                            <li key={index}>{item.name}: {item.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <h3>Singles Found</h3>
                    {cards.length === 0 && <div className="count">None of your cards were found in stock as a single unambiguous match.</div>}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                        {[...cards].sort((card1, card2) => card1.colorCategory.localeCompare(card2.colorCategory)).map((card) => (
                            <div key={card.inventoryId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Card card={card} />
                                <div className="count" style={{ margin: 0 }}>×{requestedQuantities[card.requestedName] ?? 1}</div>
                            </div>
                        ))}
                    </div>

                    {ambiguousCards.length > 0 && <h3>Cards with Variants</h3>}
                    {ambiguousCards.map((group) => (
                        <div key={group.name} style={{marginLeft: "10px"}}>
                            <h4>{group.name}</h4>
                            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginLeft: "10px" }}>
                                <label>
                                    Quantity:{" "}
                                    <input
                                        type="number"
                                        min="1"
                                        style={{ width: '60px' }}
                                        value={variantQuantities[group.name] ?? 1}
                                        onChange={(e) => setVariantQuantities((existing) => ({
                                            ...existing,
                                            [group.name]: Number(e.target.value) || 1
                                        }))}
                                    />
                                </label>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'left', flexWrap: 'wrap', gap: '5px', marginLeft: "10px" }}>
                                {group.items.map((variant) => (
                                    <VariantTile
                                        key={variant.inventoryId}
                                        card={variant}
                                        selected={selectedVariants[group.name] === variant.inventoryId}
                                        onSelect={() => setSelectedVariants((existing) => ({
                                            ...existing,
                                            [group.name]: variant.inventoryId
                                        }))}
                                    />
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