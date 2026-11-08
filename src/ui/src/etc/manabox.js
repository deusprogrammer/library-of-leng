/**
 * Parses a Manabox CSV export into inventory batch items for the
 * POST /shops/{id}/inventory/batch endpoint.
 *
 * Expected columns (header row required):
 *   Name, Set code, Set name, Collector number, Foil, Rarity, Quantity,
 *   ManaBox ID, Scryfall ID, Purchase price, Misprint, Altered,
 *   Condition, Language, Purchase price currency
 */

const FINISH_MAP = {
    normal: "nonfoil",
    foil: "foil",
    etched: "etched"
};

// Minimal CSV parser that handles quoted fields and escaped quotes.
export const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") {
                i++;
            }

            row.push(field);
            field = "";
            rows.push(row);
            row = [];
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((r) => r.some((value) => value.trim() !== ""));
};

export const parseManaboxCsv = (text) => {
    const rows = parseCsv(text);

    if (rows.length < 2) {
        return { items: [], invalidRows: [] };
    }

    const header = rows[0].map((column) => column.trim().toLowerCase());
    const columnIndex = (name) => header.indexOf(name.toLowerCase());

    const nameIdx = columnIndex("Name");
    const setCodeIdx = columnIndex("Set code");
    const foilIdx = columnIndex("Foil");
    const quantityIdx = columnIndex("Quantity");
    const scryfallIdIdx = columnIndex("Scryfall ID");
    const conditionIdx = columnIndex("Condition");
    const languageIdx = columnIndex("Language");
    const priceIdx = columnIndex("Purchase price");

    if (scryfallIdIdx === -1) {
        throw new Error(
            "This does not look like a Manabox export: no 'Scryfall ID' column found."
        );
    }

    const items = [];
    const invalidRows = [];

    rows.slice(1).forEach((row, index) => {
        const scryfallId = row[scryfallIdIdx]?.trim();
        const quantity = parseInt(row[quantityIdx]?.trim(), 10);
        const foil = row[foilIdx]?.trim().toLowerCase();

        if (!scryfallId) {
            invalidRows.push({ line: index + 2, row, reason: "Missing Scryfall ID" });
            return;
        }

        items.push({
            scryfallId,
            finish: FINISH_MAP[foil] ?? "nonfoil",
            quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
            name: row[nameIdx]?.trim(),
            setCode: row[setCodeIdx]?.trim()?.toLowerCase(),
            condition: row[conditionIdx]?.trim(),
            language: row[languageIdx]?.trim(),
            purchasePrice: row[priceIdx]?.trim()
        });
    });

    return { items, invalidRows };
};
