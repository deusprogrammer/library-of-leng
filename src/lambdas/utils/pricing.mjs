import { getScryfallCollection } from "./scryfall.mjs";

const toPrice = (value) => {
    const price = Number(value);

    return Number.isFinite(price) && value !== null && value !== undefined ? price : null;
};

// Price a copy based on the finish actually in the cart, falling back to the
// other finishes when Scryfall has no price for it.
export const getFinishPrice = (prices, finish) => {
    if (!prices) {
        return null;
    }

    const usd = toPrice(prices.usd);
    const foil = toPrice(prices.usd_foil);
    const etched = toPrice(prices.usd_etched);

    if (finish === "etched") {
        return etched ?? foil ?? usd;
    }

    if (finish === "foil") {
        return foil ?? usd;
    }

    return usd ?? foil ?? etched;
};

const roundCents = (value) => Math.round(value * 100) / 100;

export const priceCarts = async (carts) => {
    const scryfallIds = carts.flatMap((cart) => (cart.items ?? []).map((item) => item.scryfallId));

    let cardsById = null;

    try {
        const collection = await getScryfallCollection(scryfallIds);
        cardsById = new Map((collection.data ?? []).map((card) => [card.id, card]));
    } catch (error) {
        console.error("Unable to price carts", error);
    }

    return carts.map((cart) => {
        const items = (cart.items ?? []).map((item) => {
            const unitPrice = cardsById
                ? getFinishPrice(cardsById.get(item.scryfallId)?.prices, item.finish)
                : null;

            return {
                ...item,
                unitPrice,
                lineTotal: unitPrice === null ? null : roundCents(unitPrice * item.quantity)
            };
        });

        return {
            ...cart,
            items,
            // null signals pricing was unavailable rather than a $0 cart.
            total: cardsById
                ? roundCents(items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0))
                : null,
            unpricedItems: items.filter((item) => item.unitPrice === null).length
        };
    });
};
