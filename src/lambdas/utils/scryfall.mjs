import { normalizeName } from "./util.mjs";

const MAX_COLLECTION_SIZE = 75;

const SCRYFALL_COLLECTION_URL =
    "https://api.scryfall.com/cards/collection";
const SCRYFALL_USER_AGENT =
    process.env.SCRYFALL_USER_AGENT ??
    "LibraryOfLeng/0.1 (+https://github.com/deusprogrammer/library-of-leng)";
const SCRYFALL_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": SCRYFALL_USER_AGENT
};

const chunk = (array, size) => {
    const chunks = [];

    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }

    return chunks;
};

export const expandItems = async (items) => {
    if (items.length > 75) {
        throw new Error("Too many cards presented. The maximum is 75.");
    }

    const requestBody = {
        identifiers: items.map(({ scryfallId }) => ({
            id: scryfallId
        }))
    };

    const response = await fetch(SCRYFALL_COLLECTION_URL, {
        method: "POST",
        headers: SCRYFALL_HEADERS,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
            `Scryfall collection request failed: ` +
            `${response.status} ${response.statusText}: ${errorBody}`
        );
    }

    const result = await response.json();

    const extractBrowseCategory = (typeLine) => {
        if (!typeLine) return "other";
        typeLine = typeLine.toLowerCase();

        if (typeLine.includes("artifact")) return "artifact";
        if (typeLine.includes("creature")) return "creature";
        if (typeLine.includes("enchantment")) return "enchantment";
        if (typeLine.includes("instant")) return "instant";
        if (typeLine.includes("sorcery")) return "sorcery";
        if (typeLine.includes("land")) return "land";
        if (typeLine.includes("planeswalker")) return "planeswalker";
        if (typeLine.includes("battle")) return "battle";

        return "other";
    };

    const extractColorCategory = (colors) => {
        const colorMap = {
            W: "white",
            U: "blue",
            B: "black",
            R: "red",
            G: "green"
        };

        if (!colors || colors.length === 0) return "colorless";
        if (colors.length === 1) return colorMap[colors[0]];

        return "multicolor";
    };

    const cards = (result.data ?? []).map(
        ({ id, name, set, rarity, type_line, colors, image_uris, card_faces }) => ({
            scryfallId: id,
            name,
            normalizedName: normalizeName(name),
            setCode: set,
            rarity,
            browseCategory: extractBrowseCategory(type_line),
            colorCategory: extractColorCategory(colors),
            thumbnailUrl: image_uris?.small ?? card_faces?.[0]?.image_uris?.small ?? null
        })
    );

    return {
        cards,
        notFound: result.not_found ?? []
    };
};

export const getScryfallCollection = async (scryfallIds) => {
    const validIds = [...new Set(
        (scryfallIds ?? [])
            .filter((id) => typeof id === "string")
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
    )];

    if (validIds.length === 0) {
        return {
            data: [],
            warnings: [],
            not_found: []
        };
    }

    const batches = chunk(validIds, MAX_COLLECTION_SIZE);

    const responses = await Promise.all(
        batches.map(async (batch) => {
            const response = await fetch(
                  SCRYFALL_COLLECTION_URL,
                {
                    method: 'POST',
                      headers: SCRYFALL_HEADERS,
                    body: JSON.stringify({
                        identifiers: batch.map(id => ({ id }))
                    })
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();

                throw new Error(
                    `Failed to retrieve Scryfall collection. ` +
                    `Status: ${response.status}. Body: ${errorBody}`
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