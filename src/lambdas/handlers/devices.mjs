
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    PutCommand,
    GetCommand,
    TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import { randomBytes, createHash } from "node:crypto";

import { getShopId, authorizeShopAccess } from "../utils/shop.mjs";
import { jsonResponse } from "../utils/util.mjs";

const deviceTable = process.env.DEVICES_TABLE;

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const PAIRING_PREFIX = "PAIRING#";
const DEVICE_PREFIX = "REGISTRATION#";
const PAIRING_LIFETIME_SECONDS = 5 * 60;

const nowSeconds = () => Math.floor(Date.now() / 1000);

const hashString = (value) =>
    createHash("sha256")
        .update(value)
        .digest("hex");

const generateToken = () =>
    randomBytes(32).toString("base64url");

const pairingItemKey = (token) =>
    PAIRING_PREFIX + hashString(token);

const registrationItemKey = (token) =>
    DEVICE_PREFIX + hashString(token);

const parseBody = (event) => {
    try {
        if (!event.body) return {};
        const body = JSON.parse(event.body);
        return body && typeof body === "object" && !Array.isArray(body)
            ? body
            : null;
    } catch {
        return null;
    }
};

export const createRegistrationInvite = async (event, context) => {
    try {
        const identifier = event.pathParameters?.identifier;

        if (!identifier) {
            return jsonResponse(400, {
                message: "Shop identifier is required."
            });
        }

        const { shop, errorResponse } =
            await authorizeShopAccess(event, identifier);

        if (errorResponse) return errorResponse;

        const createdAt = nowSeconds();
        const expiresAt = createdAt + PAIRING_LIFETIME_SECONDS;
        const token = generateToken();

        await documentClient.send(new PutCommand({
            TableName: deviceTable,
            Item: {
                shopId: shop.shopId,
                itemKey: pairingItemKey(token),
                createdAt,
                expiresAt
            },
            ConditionExpression: "attribute_not_exists(shopId)"
        }));

        return jsonResponse(201, {
            shopId: shop.shopId,
            pairingKey: token,
            createdAt,
            expiresAt
        });

    } catch (error) {
        return jsonResponse(
            500,
            { message: "Unable to create registration invite." },
            error
        );
    }
};

export const registerDevice = async (event, context) => {
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

        const body = parseBody(event);

        if (!body) {
            return jsonResponse(400, {
                message: "Invalid JSON request body."
            });
        }

        const { pairingKey, name } = body;

        if (
            typeof pairingKey !== "string" ||
            !/^[A-Za-z0-9_-]{43}$/.test(pairingKey)
        ) {
            return jsonResponse(400, {
                message: "A valid pairing key is required."
            });
        }

        if (
            name !== undefined &&
            (typeof name !== "string" ||
             !name.trim() ||
             name.length > 100)
        ) {
            return jsonResponse(400, {
                message: "Device name must be 1-100 characters."
            });
        }

        const pairingKeyHash = pairingItemKey(pairingKey);

        const pairingResult = await documentClient.send(
            new GetCommand({
                TableName: deviceTable,
                Key: {
                    shopId,
                    itemKey: pairingKeyHash
                },
                ConsistentRead: true
            })
        );

        const invitation = pairingResult.Item;
        const createdAt = nowSeconds();

        if (
            !invitation ||
            typeof invitation.expiresAt !== "number" ||
            invitation.expiresAt <= createdAt
        ) {
            return jsonResponse(400, {
                message: "Pairing key is invalid or expired."
            });
        }

        const registrationKey = generateToken();
        const deviceItemKey = registrationItemKey(registrationKey);

        await documentClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Delete: {
                        TableName: deviceTable,
                        Key: {
                            shopId,
                            itemKey: pairingKeyHash
                        },
                        ConditionExpression:
                            "attribute_exists(shopId) AND expiresAt > :now",
                        ExpressionAttributeValues: {
                            ":now": nowSeconds()
                        }
                    }
                },
                {
                    Put: {
                        TableName: deviceTable,
                        Item: {
                            shopId,
                            itemKey: deviceItemKey,
                            createdAt,
                            status: "active",
                            ...(name ? { name: name.trim() } : {})
                        },
                        ConditionExpression:
                            "attribute_not_exists(shopId)"
                    }
                }
            ]
        }));

        return jsonResponse(201, {
            shopId,
            registrationKey,
            createdAt
        });

    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            return jsonResponse(409, {
                message: "Pairing key has expired or was already used."
            });
        }

        return jsonResponse(
            500,
            { message: "Unable to register device." },
            error
        );
    }
};

export const getRegisteredDevices = async (event, context) => {
    try {
        const identifier = event.pathParameters?.identifier;

        if (!identifier) {
            return jsonResponse(400, {
                message: "Shop identifier is required."
            });
        }

        const { shop, errorResponse } =
            await authorizeShopAccess(event, identifier);

        if (errorResponse) return errorResponse;

        const registeredDevices = [];
        let lastEvaluatedKey;

        do {
            const result = await documentClient.send(
                new QueryCommand({
                    TableName: deviceTable,
                    KeyConditionExpression:
                        "shopId = :shopId AND begins_with(itemKey, :prefix)",
                    ExpressionAttributeValues: {
                        ":shopId": shop.shopId,
                        ":prefix": DEVICE_PREFIX
                    },
                    ExclusiveStartKey: lastEvaluatedKey
                })
            );

            registeredDevices.push(
                ...(result.Items ?? []).map(item => ({
                    shopId: item.shopId,
                    itemKey: item.itemKey,
                    name: item.name ?? null,
                    createdAt: item.createdAt,
                    status: item.status ?? "active"
                }))
            );

            lastEvaluatedKey = result.LastEvaluatedKey;

        } while (lastEvaluatedKey);

        return jsonResponse(200, registeredDevices);

    } catch (error) {
        return jsonResponse(
            500,
            { message: "Failed to list registered devices." },
            error
        );
    }
};
