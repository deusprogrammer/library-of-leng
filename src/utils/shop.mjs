import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { jsonResponse } from "./util.mjs";

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