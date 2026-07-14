import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const shopTableName = process.env.SHOPS_TABLE;
const inventoryTableName = process.env.INVENTORY_TABLE;
const documentClient = DynamoDBDocumentClient.from(client);
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCRYFALL_COLLECTION_URL =
    "https://api.scryfall.com/cards/collection";

const slugify = (name) => {
    if (!name) {
        return "no-name";
    }

    return name
        .normalize("NFKD")                 // Separate accents from letters
        .replace(/[\u0300-\u036f]/g, "")   // Remove accent marks
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")      // Remove punctuation
        .trim()
        .replace(/\s+/g, "-")              // Spaces -> hyphens
        .replace(/-+/g, "-");              // Collapse duplicate hyphens
}

const createInventoryId = (scryfallId, finish) => {
    return `${scryfallId}#${finish}`;
}

const jsonResponse = (statusCode, body, error) => {
    if (error) { 
        console.error(error);
    }

    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    }
}

const expandItems = async (items) => {
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
        ({ id, name, set, rarity, type_line, colors }) => ({
            scryfallId: id,
            name,
            normalizedName: normalizeName(name),
            setCode: set,
            rarity,
            browseCategory: extractBrowseCategory(type_line),
            colorCategory: extractColorCategory(colors)
        })
    );

    return {
        cards,
        notFound: result.not_found ?? []
    };
};

const upsertInventory = async (inventoryItem) => {
    const { shopId, inventoryId, scryfallId, finish, name, quantity,
            normalizedName, setCode, rarity, browseCategory, colorCategory } = inventoryItem;

    const response = await documentClient.send(
        new UpdateCommand({
            TableName: inventoryTableName,

            Key: {
                shopId,
                inventoryId
            },

            UpdateExpression: `
                SET
                    scryfallId = if_not_exists(scryfallId, :scryfallId),
                    #name = if_not_exists(#name, :name),
                    normalizedName = if_not_exists(normalizedName, :normalizedName),
                    #finish = if_not_exists(#finish, :finish),
                    setCode = if_not_exists(setCode, :setCode),
                    rarity = if_not_exists(rarity, :rarity),
                    browseCategory = if_not_exists(browseCategory, :browseCategory),
                    colorCategory = if_not_exists(colorCategory, :colorCategory),
                    #quantity = if_not_exists(#quantity, :zero) + :increment
            `,

            ExpressionAttributeNames: {
                "#name": "name",
                "#finish": "finish",
                "#quantity": "quantity"
            },

            ExpressionAttributeValues: {
                ":scryfallId": scryfallId,
                ":name": name,
                ":normalizedName": normalizedName,
                ":finish": finish,
                ":setCode": setCode,
                ":rarity": rarity,
                ":browseCategory": browseCategory,
                ":colorCategory": colorCategory,
                ":zero": 0,
                ":increment": quantity ?? 1
            },

            ReturnValues: "ALL_NEW"
        })
    );

    return response.Attributes;
}

const getShopId = async (identifier) => {
    try {
        if (UUID_REGEX.test(identifier)) {
            return identifier;
        } else {
            const shop = (await documentClient.send(new QueryCommand(
                {
                    TableName: shopTableName,
                    IndexName: "slug",
                    KeyConditionExpression: "slug = :slug",
                    ExpressionAttributeValues: {
                        ":slug": identifier
                    }
                })
            ))?.Items[0];
            return shop.shopId;
        }
    } catch (err) {
        return jsonResponse(500, { message: "Failed to retrieve shop" }, err);
    }
}

export const createShop = async (event, context) => {
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);

        if (!requestBody) {
            return jsonResponse(400, {message: "Request does not include a shop entity"});
        }
    } catch (err) {
        return jsonResponse(400, {message: "Unable to parse body JSON"}, err);
    }

    const shop = {
        ...requestBody,
        shopId: crypto.randomUUID(),
        slug: requestBody.slug || slugify(requestBody.name)
    };

    try {
        await documentClient.send(new PutCommand({
            TableName: shopTableName,
            Item: shop
        }));
    } catch (err) {
        return jsonResponse(500, { message: "Failed to store new shop" }, err);
    }

    return jsonResponse(201, shop);
}

export const getShops = async (event, context) => {
    let shops;

    try {
        shops = (await documentClient.send(new ScanCommand(
            {
                TableName: shopTableName,
            }
        )))?.Items;
    } catch (err) {
        return jsonResponse(500, { message: "Failed to retrieve shops" }, err);
    }

    return jsonResponse(200, shops);
}

export const getShop = async (event, context) => {
    const identifier = event.pathParameters?.identifier;
    let shop;

    try {
        if (UUID_REGEX.test(identifier)) {
            shop = (await documentClient.send(new GetCommand({
                TableName: shopTableName,
                Key: {
                    shopId: identifier
                }
            })))?.Item;
        } else {
            shop = (await documentClient.send(new QueryCommand(
                {
                    TableName: shopTableName,
                    IndexName: "slug",
                    KeyConditionExpression: "slug = :slug",
                    ExpressionAttributeValues: {
                        ":slug": identifier
                    }
                })
            ))?.Items[0];
        }
    } catch (err) {
        return jsonResponse(500, { message: "Failed to retrieve shop" }, err);
    }

    if (!shop) {
        return jsonResponse(404, { message: "Shop not found" });
    }

    return jsonResponse(200, shop);
}

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
    const created = [];
    const failed = [];

    let start = 0;
    while (start < requestBody.items.length) {
        const currentBatch = requestBody.items.slice(start, start + 75);

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