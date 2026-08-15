const MAX_COLLECTION_SIZE = 75;

const chunk = (array, size) => {
    const chunks = [];

    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }

    return chunks;
};

export const getScryfallCard = async (scryfallId) => {
    const response = await fetch(
        `https://api.scryfall.com/cards/${encodeURIComponent(scryfallId)}`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to retrieve Scryfall card ${scryfallId}. Status: ${response.status}`
        );
    }

    return await response.json();
};

export const getSets = async () => {
    const response = await fetch("https://api.scryfall.com/sets");

    if (!response.ok) {
        throw new Error(`Failed to fetch sets: ${response.status}`);
    }

    const json = await response.json();

    return json.data;
};

export const getPrice = (card) => {
    const prices = card.prices;

    console.log("PRICES: " + JSON.stringify(prices, null, 2));

    if (card.finishes?.includes("etched")) {
        return prices.usd_etched;
    }

    if (card.finishes?.includes("foil") && !card.finishes?.includes("nonfoil")) {
        return prices.usd_foil;
    }

    return prices.usd;
};

export const getScryfallCollection = async (scryfallIds) => {
    const batches = chunk(scryfallIds, MAX_COLLECTION_SIZE);

    const responses = await Promise.all(
        batches.map(async (batch) => {
            const response = await fetch(
                'https://api.scryfall.com/cards/collection',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        identifiers: batch.map(id => ({ id }))
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to retrieve Scryfall collection. Status: ${response.status}`
                );
            }

            return response.json();
        })
    );

    return {
        data: responses.flatMap(r => r.data),
        warnings: responses.flatMap(r => r.warnings ?? []),
        not_found: responses.flatMap(r => r.not_found ?? [])
    };
};