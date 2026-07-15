import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const inventoryTableName = process.env.INVENTORY_TABLE;
const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const createInventoryId = (scryfallId, finish = "default") => {
    if (!scryfallId) {
        return `inventory-${Date.now()}`;
    }

    return createHash("sha256")
        .update(`${scryfallId}:${finish ?? "default"}`)
        .digest("hex")
        .slice(0, 24);
};

export const upsertInventory = async (inventoryItem) => {
    const { shopId, inventoryId, scryfallId, finish, name, quantity,
            normalizedName, setCode, rarity, browseCategory, colorCategory, thumbnailUrl } = inventoryItem;

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
                    thumbnailUrl = if_not_exists(thumbnailUrl, :thumbnailUrl),
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
                ":thumbnailUrl": thumbnailUrl ?? null,
                ":zero": 0,
                ":increment": quantity ?? 1
            },

            ReturnValues: "ALL_NEW"
        })
    );

    return response.Attributes;
}