
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand
} from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";

import { getShopId } from "./shop.mjs";
import { jsonResponse } from "./util.mjs";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const deviceTable = process.env.DEVICES_TABLE;

const hashString = (value) =>
    createHash("sha256")
        .update(value)
        .digest("hex");

export const authorizeDeviceAccess = async (event, identifier) => {
    try {
        if (!identifier) {
            return {
                errorResponse: jsonResponse(400, {
                    message: "Shop identifier is required."
                })
            };
        }

        const authorization =
            event.headers?.authorization ??
            event.headers?.Authorization;

        const match = typeof authorization === "string"
            ? /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)
            : null;

        if (!match) {
            return {
                errorResponse: jsonResponse(401, {
                    message: "Device registration key is required."
                })
            };
        }

        const registrationKey = match[1];
        const shopId = await getShopId(identifier);

        // getShopId returns an error response object instead of an id on failure.
        if (typeof shopId !== "string") {
            return {
                errorResponse: jsonResponse(404, {
                    message: "Shop not found."
                })
            };
        }

        const itemKey =
            "REGISTRATION#" + hashString(registrationKey);

        const result = await documentClient.send(
            new GetCommand({
                TableName: deviceTable,
                Key: {
                    shopId,
                    itemKey
                },
                ConsistentRead: true
            })
        );

        const device = result.Item;

        if (!device || device.status !== "active") {
            return {
                errorResponse: jsonResponse(403, {
                    message: "Device is not authorized for this shop."
                })
            };
        }

        return {
            device: {
                shopId: device.shopId,
                itemKey: device.itemKey,
                name: device.name ?? null,
                createdAt: device.createdAt
            },
            errorResponse: null
        };

    } catch (error) {
        return {
            errorResponse: jsonResponse(
                500,
                { message: "Unable to authorize device." },
                error
            )
        };
    }
};

/**
 * Wraps a shop-scoped handler so it only runs for requests carrying a valid
 * device registration key for the shop in the {identifier} path parameter.
 */
export const withDeviceAccess = (handler) => async (event, context) => {
    const { errorResponse } = await authorizeDeviceAccess(
        event,
        event.pathParameters?.identifier
    );

    if (errorResponse) return errorResponse;

    return handler(event, context);
};
