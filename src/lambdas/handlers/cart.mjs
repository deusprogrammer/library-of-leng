import { randomUUID, createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { generateCartSlug, getCartById } from "../utils/cart.mjs";
import { getShopId } from "../utils/shop.mjs";
import { getCartMetaBySlug } from "../utils/cart.mjs";
import { jsonResponse } from "../utils/util.mjs";

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
                            #location = :location
                            createdAt = :createdAt
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

        return jsonResponse(204, {
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

        const item = {
            shopId,
            cartId,
            slug,
            itemKey: "META",
            createdAt,
            expiresAt
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