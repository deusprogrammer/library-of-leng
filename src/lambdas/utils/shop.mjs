import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { jsonResponse } from "./util.mjs";
import { getUserId, hasAnyGroup } from "./auth.mjs";

const client = new DynamoDBClient({});
const shopTableName = process.env.SHOPS_TABLE;
const documentClient = DynamoDBDocumentClient.from(client);
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const slugify = (name) => {
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

export const isUUID = (identifier) => {
    return UUID_REGEX.test(identifier);
}

export const getShopByIdentifier = async (identifier) => {
    if (!identifier) {
        return undefined;
    }

    if (UUID_REGEX.test(identifier)) {
        return (await documentClient.send(new GetCommand({
            TableName: shopTableName,
            Key: {
                shopId: identifier
            }
        })))?.Item;
    }

    return (await documentClient.send(new QueryCommand(
        {
            TableName: shopTableName,
            IndexName: "slug",
            KeyConditionExpression: "slug = :slug",
            ExpressionAttributeValues: {
                ":slug": identifier
            }
        })
    ))?.Items?.[0];
};

export const getShopId = async (identifier) => {
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
/**
 * Loads the shop for an identifier and verifies that the calling user
 * owns it (or is an admin). Returns { shop } on success or
 * { errorResponse } when the caller should be rejected.
 */
export const authorizeShopAccess = async (event, identifier) => {
    const userId = getUserId(event);

    if (!userId) {
        return { errorResponse: jsonResponse(401, { message: "Unauthorized" }) };
    }

    let shop;
    try {
        shop = await getShopByIdentifier(identifier);
    } catch (err) {
        return { errorResponse: jsonResponse(500, { message: "Failed to retrieve shop" }, err) };
    }

    if (!shop) {
        return { errorResponse: jsonResponse(404, { message: "Shop not found" }) };
    }

    if (shop.ownerId !== userId && !hasAnyGroup(event, "admin")) {
        return { errorResponse: jsonResponse(403, { message: "You do not own this shop" }) };
    }

    return { shop };
};

/**
 * Wraps a shop-scoped handler so it only runs for the shop's owner (or an
 * admin), as identified by the Cognito JWT authorizer.
 */
export const withShopOwner = (handler) => async (event, context) => {
    const { errorResponse } = await authorizeShopAccess(
        event,
        event.pathParameters?.identifier
    );

    if (errorResponse) return errorResponse;

    return handler(event, context);
};
