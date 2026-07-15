import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { jsonResponse } from "../utils/util.mjs";
import { slugify } from "../utils/shop.mjs";

const shopTableName = process.env.SHOPS_TABLE;
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

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
        shopId: randomUUID(),
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