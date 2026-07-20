const SCRYFALL_COLLECTION_URL =
    "https://api.scryfall.com/cards/collection";

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
        headers: {
            "content-type": "application/json",
            "accept": "application/json",
            "user-agent": "LibraryOfLeng/0.1"
        },
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

    const normalizeName = (name) =>
        name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

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