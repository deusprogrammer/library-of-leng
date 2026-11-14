import { randomUUID, createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { generateCartSlug, getCartById } from "../utils/cart.mjs";
import { getShopId, authorizeShopAccess } from "../utils/shop.mjs";
import { getCartMetaBySlug } from "../utils/cart.mjs";
import { jsonResponse } from "../utils/util.mjs";
import { isDeviceId } from "../utils/device.mjs";

const shopTableName = process.env.SHOPS_TABLE;
const inventoryTableName = process.env.INVENTORY_TABLE;
const cartTableName = process.env.CARTS_TABLE;
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const hashString = (str) => {
    return createHash("sha256")
        .update(str)
        .digest("hex");
}

export const listCarts = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;
        const { shop, errorResponse } = await authorizeShopAccess(event, identifier);

        if (errorResponse) {
            return errorResponse;
        }

        // Only META records carry a slug, so this query returns one row per cart.
        const metaRecords = (await documentClient.send(new QueryCommand({
            TableName: cartTableName,
            IndexName: "cart-by-shop-and-slug",
            KeyConditionExpression: "shopId = :shopId",
            ExpressionAttributeValues: {
                ":shopId": shop.shopId
            }
        })))?.Items ?? [];

        const carts = await Promise.all(
            metaRecords.map(async (meta) => {
                const cart = await getCartById(meta.cartId);
                const { tokenHash, ...safeMeta } = meta;

                return {
                    ...safeMeta,
                    items: cart?.items ?? []
                };
            })
        );

        return jsonResponse(200, carts);
    } catch (error) {
        return jsonResponse(500, { message: "Failed to list carts" }, error);
    }
};

export const getCart = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;
        const slug = event.pathParameters?.cartSlug;

        const shopId = await getShopId(identifier);

        if (!shopId || !slug) {
            return jsonResponse(400, {
                message: "Shop id and cart slug required"
            });
        }

        if (!shopId) {
            return jsonResponse(404, {
                message: "Shop not found."
            });
        }

        const cartMeta = await getCartMetaBySlug(shopId, slug);

        if (!cartMeta) {
            return jsonResponse(404, {
                message: "Cart not found."
            });
        }

        const cartToken = event.headers["x-cart-token"];

        if (!cartToken) {
            return jsonResponse(401, {
                message: "Unauthorized"
            });
        }

        if (cartToken !== cartMeta.tokenHash) {
            return jsonResponse(403, {
                message: "Forbidden"
            });
        }

        const cart = await getCartById(cartMeta.cartId);

        return jsonResponse(200, {
            items: cart.items
        });
    } catch (error) {
        console.error(error);

        return jsonResponse(500, {
            message: "An unexpected error occurred."
        });
    }
};

export const addToCart = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;
        const cartSlug = event.pathParameters?.cartSlug;

        if (!identifier || !cartSlug) {
            return jsonResponse(400, {
                message: "Shop identifier and cart slug are required."
            });
        }

        let requestBody;

        try {
            requestBody = JSON.parse(event.body ?? "{}");
        } catch (error) {
            return jsonResponse(
                400,
                { message: "Request body must contain valid JSON." },
                error
            );
        }

        const {
            inventoryId,
            quantity = 1
        } = requestBody;

        if (!inventoryId) {
            return jsonResponse(400, {
                message: "inventoryId is required."
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return jsonResponse(400, {
                message: "quantity must be a positive integer."
            });
        }

        const shopId = await getShopId(identifier);

        if (!shopId) {
            return jsonResponse(404, {
                message: "Shop not found."
            });
        }

        const cartMeta = await getCartMetaBySlug(shopId, cartSlug);

        if (!cartMeta) {
            return jsonResponse(404, {
                message: "Cart not found."
            });
        }

        const cartToken = event.headers["x-cart-token"];

        if (!cartToken) {
            return jsonResponse(401, {
                message: "Unauthorized"
            })
        }

        if (cartToken !== cartMeta.tokenHash) {
            return jsonResponse(403, {
                message: "Forbidden"
            });
        }

        const inventoryResult = await documentClient.send(
            new GetCommand({
                TableName: inventoryTableName,
                Key: {
                    shopId,
                    inventoryId
                }
            })
        );

        const inventoryItem = inventoryResult.Item;

        if (!inventoryItem) {
            return jsonResponse(404, {
                message: "Inventory item not found."
            });
        }

        if (quantity > inventoryItem.quantity) {
            return jsonResponse(409, {
                message:
                    `Only ${inventoryItem.quantity} of this item ` +
                    `are currently available.`
            });
        }

        const maximumExistingQuantity =
            inventoryItem.quantity - quantity;
        
        const createdAt = Math.floor(Date.now() / 1000);
        const expiresAt = createdAt + (60 * 60 * 6); // 6 hours

        let result;

        try {
            result = await documentClient.send(
                new UpdateCommand({
                    TableName: cartTableName,

                    Key: {
                        cartId: cartMeta.cartId,
                        itemKey: `ITEM#${inventoryId}`
                    },

                    UpdateExpression: `
                        SET
                            inventoryId = :inventoryId,
                            shopId = :shopId,
                            scryfallId = :scryfallId,
                            #name = :name,
                            setCode = :setCode,
                            #finish = :finish,
                            thumbnailUrl = :thumbnailUrl,
                            #location = :location,
                            createdAt = :createdAt,
                            expiresAt = :expiresAt
                        ADD quantity :quantity
                    `,

                    ConditionExpression: `
                        attribute_not_exists(quantity)
                        OR quantity <= :maximumExistingQuantity
                    `,

                    ExpressionAttributeNames: {
                        "#name": "name",
                        "#location": "location",
                        "#finish": "finish"
                    },

                    ExpressionAttributeValues: {
                        ":inventoryId": inventoryId,
                        ":shopId": shopId,
                        ":scryfallId": inventoryItem.scryfallId,
                        ":name": inventoryItem.name,
                        ":setCode": inventoryItem.setCode,
                        ":finish": inventoryItem.finish,
                        ":thumbnailUrl":
                            inventoryItem.thumbnailUrl ?? null,
                        ":location":
                            inventoryItem.location ?? null,
                        ":quantity": quantity,
                        ":maximumExistingQuantity":
                            maximumExistingQuantity,
                        ":createdAt": createdAt,
                        ":expiresAt": expiresAt
                    },

                    ReturnValues: "ALL_NEW"
                })
            );
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return jsonResponse(409, {
                    message:
                        "Adding that quantity would exceed the " +
                        "available inventory."
                });
            }

            throw error;
        }

        return jsonResponse(200, {
            cartId: cartMeta.cartId,
            slug: cartMeta.slug,
            item: result.Attributes
        });
    } catch (error) {
        return jsonResponse(
            500,
            { message: "Failed to add inventory item to cart." },
            error
        );
    }
};

export const removeFromCart = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;
        const cartSlug = event.pathParameters?.cartSlug;
        const inventoryId = event.pathParameters?.inventoryId;

        if (!identifier || !cartSlug || !inventoryId) {
            return jsonResponse(400, {
                message: "Shop identifier, cart slug, and inventory id are required."
            });
        }

        const shopId = await getShopId(identifier);

        if (!shopId) {
            return jsonResponse(404, {
                message: "Shop not found."
            });
        }

        const cartMeta = await getCartMetaBySlug(shopId, cartSlug);

        if (!cartMeta) {
            return jsonResponse(404, {
                message: "Cart not found."
            });
        }

        const cartToken = event.headers["x-cart-token"];

        if (!cartToken) {
            return jsonResponse(401, {
                message: "Unauthorized"
            });
        }

        if (cartToken !== cartMeta.tokenHash) {
            return jsonResponse(403, {
                message: "Forbidden"
            });
        }

        await documentClient.send(
            new DeleteCommand({
                TableName: cartTableName,
                Key: {
                    cartId: cartMeta.cartId,
                    itemKey: `ITEM#${inventoryId}`
                }
            })
        );

        return jsonResponse(200, { removed: true, inventoryId });
    } catch (error) {
        return jsonResponse(
            500,
            { message: "Failed to remove item from cart." },
            error
        );
    }
};

export const createCart = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;

        if (!identifier) {
            return jsonResponse(400, {
                message: "Shop identifier is required."
            });
        }

        const shopId = await getShopId(identifier);

        if (!shopId) {
            return jsonResponse(404, {
                message: "Shop not found."
            });
        }

        const createdAt = Math.floor(Date.now() / 1000);
        const expiresAt = createdAt + (60 * 60 * 6); // 6 hours

        const token = randomUUID();
        const cartId = randomUUID();
        const slug = generateCartSlug();

        const tokenHash = hashString(token);

        const deviceId = event.device?.deviceId;

        const item = {
            shopId,
            cartId,
            slug,
            itemKey: "META",
            createdAt,
            expiresAt,
            ...(deviceId ? { deviceId } : {})
        };

        await documentClient.send(
            new PutCommand({
                TableName: cartTableName,
                Item: {
                    ...item,
                    tokenHash
                },
                ConditionExpression:
                    "attribute_not_exists(cartId) AND attribute_not_exists(itemKey)"
            })
        );

        return jsonResponse(201, {
            ...item,
            token
        });
    } catch (error) {
        return jsonResponse(
            500,
            { message: "Unable to create cart." },
            error
        );
    }
};

export const getDeviceCart = async (event) => {
    try {
        const identifier = event.pathParameters?.identifier;
        const deviceId = event.pathParameters?.deviceId;

        if (!identifier || !isDeviceId(deviceId)) {
            return jsonResponse(400, {
                message: "Shop identifier and a valid device id are required."
            });
        }

        const { shop, errorResponse } = await authorizeShopAccess(event, identifier);

        if (errorResponse) {
            return errorResponse;
        }

        // Newest first; skip any expired-but-not-yet-reaped carts.
        const now = Math.floor(Date.now() / 1000);
        let lastEvaluatedKey;

        do {
            const result = await documentClient.send(new QueryCommand({
                TableName: cartTableName,
                IndexName: "cart-by-device",
                KeyConditionExpression: "deviceId = :deviceId",
                ExpressionAttributeValues: {
                    ":deviceId": deviceId
                },
                ScanIndexForward: false,
                Limit: 10,
                ExclusiveStartKey: lastEvaluatedKey
            }));

            for (const key of result.Items ?? []) {
                const cart = await getCartById(key.cartId);

                if (!cart || cart.shopId !== shop.shopId || (cart.expiresAt ?? Infinity) <= now) {
                    continue;
                }

                const { tokenHash, ...safeCart } = cart;

                return jsonResponse(200, safeCart);
            }

            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return jsonResponse(200, null);
    } catch (error) {
        return jsonResponse(500, { message: "Failed to retrieve the device's cart" }, error);
    }
};
