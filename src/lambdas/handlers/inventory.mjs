import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getShopId } from "../utils/shop.mjs";
import { jsonResponse, normalizeName } from "../utils/util.mjs";
import { createInventoryId, getInventoryEntry, getInventoryEntryByName, upsertInventory } from "../utils/inventory.mjs";
import { expandItems, getScryfallCollection } from "../utils/scryfall.mjs";

const inventoryTableName = process.env.INVENTORY_TABLE;
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const addInventory = async (event, context) => {
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);

        if (!requestBody) {
            return jsonResponse(400, {message: "Request does not include a shop entity"});
        }
    } catch (err) {
        return jsonResponse(400, {message: "Unable to parse body JSON"}, err);
    }

    const identifier = event.pathParameters?.identifier;
    const shopId = await getShopId(identifier);

    const inventoryItem = {
        ...requestBody,
        shopId,
        inventoryId: createInventoryId(requestBody.scryfallId, requestBody.finish)
    };

    let createdInventory;
    try {
        createdInventory = await upsertInventory(inventoryItem);
    } catch (err) {
        return jsonResponse(500, { message: "Failed to add new inventory" }, err);
    }

    return jsonResponse(201, createdInventory);
}

export const addBatchInventory = async (event, context) => {
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);

        if (!requestBody) {
            return jsonResponse(400, {message: "Request does not include a shop entity"});
        }
    } catch (err) {
        return jsonResponse(400, {message: "Unable to parse body JSON"}, err);
    }

    const identifier = event.pathParameters?.identifier;
    const shopId = await getShopId(identifier);

    if (typeof shopId !== "string") {
        return shopId;
    }

    const items = Array.isArray(requestBody)
        ? requestBody
        : requestBody.items;

    if (!Array.isArray(items)) {
        return jsonResponse(400, {
            message: "Request body must be either an array of inventory items or an object with an 'items' array."
        });
    }

    const created = [];
    const failed = [];

    let start = 0;
    while (start < items.length) {
        const currentBatch = items.slice(start, start + 75);

        let scryfallData;
        try {
            scryfallData = await expandItems(currentBatch);
        } catch (err) {
            console.error("Failed to expand batch at index", start, err);
            failed.push(...currentBatch);
            start += 75;
            continue;
        }

        const cardMap = Object.fromEntries(scryfallData.cards.map(c => [c.scryfallId, c]));
        const notFoundIds = new Set(scryfallData.notFound.map(nf => nf.id));

        for (const item of currentBatch) {
            if (notFoundIds.has(item.scryfallId)) {
                failed.push(item);
                continue;
            }

            const inventoryItem = {
                ...item,
                ...cardMap[item.scryfallId],
                shopId,
                inventoryId: createInventoryId(item.scryfallId, item.finish)
            };

            try {
                const createdInventory = await upsertInventory(inventoryItem);
                created.push(createdInventory);
            } catch (err) {
                console.error("Failed to upsert inventory item:", JSON.stringify(inventoryItem), err);
                failed.push(item);
            }
        }

        start += 75;
    }

    return jsonResponse(201, {created, failed});
}

export const getInventory = async (event, context) => {
    const identifier = event.pathParameters?.identifier;
    const shopId = await getShopId(identifier);

    if (typeof shopId !== "string") {
        return shopId;
    }

    const by    = event.queryStringParameters?.by;
    const value = event.queryStringParameters?.value;

    const GSI_MAP = {
        name:     { index: "inventory-by-name",     attribute: "normalizedName" },
        category: { index: "inventory-by-category", attribute: "browseCategory" },
        color:    { index: "inventory-by-color",    attribute: "colorCategory" },
        rarity:   { index: "inventory-by-rarity",   attribute: "rarity" },
        set:      { index: "inventory-by-set",      attribute: "setCode" }
    };

    if (by && !GSI_MAP[by]) {
        return jsonResponse(400, {
            message: `Invalid 'by' value. Valid options: ${Object.keys(GSI_MAP).join(", ")}`
        });
    }

    if (by && !value) {
        return jsonResponse(400, { message: "'value' is required when using 'by'" });
    }

    let queryParams;
    if (by) {
        const { index, attribute } = GSI_MAP[by];
        queryParams = {
            TableName: inventoryTableName,
            IndexName: index,
            KeyConditionExpression: "shopId = :shopId AND #attr = :value",
            ExpressionAttributeNames: { "#attr": attribute },
            ExpressionAttributeValues: { ":shopId": shopId, ":value": value }
        };
    } else {
        queryParams = {
            TableName: inventoryTableName,
            KeyConditionExpression: "shopId = :shopId",
            ExpressionAttributeValues: { ":shopId": shopId }
        };
    }

    let inventory;
    try {
        inventory = (await documentClient.send(new QueryCommand(queryParams)))?.Items;
    } catch (err) {
        return jsonResponse(500, { message: "Failed to retrieve inventory" }, err);
    }

    return jsonResponse(200, inventory);
}

export const getInventoryItem = async (event) => {
    const { identifier, inventoryId } = event.pathParameters;

    const shopId = await getShopId(identifier);

    const inventoryEntry = await getInventoryEntry(shopId, inventoryId);

    if (!inventoryEntry) {
        return jsonResponse(404, {
            message: `Inventory entry id=${inventoryId} shopId=${shopId} shopIdentifier=${identifier} not found.`
        });
    }

    return jsonResponse(200, inventoryEntry);
};

export const getInventoryBatch = async (event) => {
    const { identifier } = event.pathParameters;
    const shopId = await getShopId(identifier);

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);

        if (!requestBody) {
            return jsonResponse(400, {
                message: "Request does not include a shop entity",
            }, "Request does not include a shop entity");
        }
    } catch (err) {
        return jsonResponse(
            400,
            { message: "Unable to parse body JSON" },
            err
        );
    }

    if (!Array.isArray(requestBody)) {
        return jsonResponse(400, {
            message: "Request body must be an array of items with at least a 'name' field."
        });
    }

    const results = await Promise.all(
        requestBody.map(async ({ name, quantity }) => {
            try {
                const items = await getInventoryEntryByName(shopId, name);

                return {
                    name,
                    items
                };
            } catch (err) {
                console.error("Inventory batch lookup failed", {
                    shopId,
                    name,
                    error: err?.message
                });

                return {
                    name,
                    items: [],
                    error: "lookup_failed"
                };
            }
        })
    );

    const ambiguousResults = results.filter(
        (result) => result.items && result.items.length > 1
    );

    const nonambiguousResults = results.filter(
        (result) => result.items && result.items.length === 1
    );

    const notFound = results.filter(
        (result) => result.items?.length <= 0
    );

    const scryfallIdentifiers = [
        ...nonambiguousResults.flatMap((result) =>
            result.items.map((item) => item.scryfallId)
        ),
        ...ambiguousResults.flatMap((result) =>
            result.items.map((item) => item.scryfallId)
        )
    ];

    const scryfallResponse = await getScryfallCollection(
        scryfallIdentifiers
    );

    const scryfallCardsById = new Map(
        (scryfallResponse.data ?? []).map((card) => [card.id, card])
    );

    nonambiguousResults.forEach((result) => {
        result.items = result.items.map((item) => {
            const scryfallCard = scryfallCardsById.get(
                item.scryfallId
            );

            return {
                ...item,
                prices: scryfallCard?.prices ?? null
            };
        });
    });

    ambiguousResults.forEach((result) => {
        result.items = result.items.map((item) => {
            const scryfallCard = scryfallCardsById.get(
                item.scryfallId
            );

            return {
                ...item,
                prices: scryfallCard?.prices ?? null
            };
        });
    });

    return jsonResponse(
        200,
        {
            nonambiguousResults,
            ambiguousResults,
            notFound
        }
    );
};