export const getShopInventory = async (shopId) => {
    const shopInventory = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/inventory`, {
        method: "GET"
    });

    return await shopInventory.json();
}

export const getShopInventoryItem = async (shopId, inventoryId) => {
    const shopInventory = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/inventory/${encodeURIComponent(inventoryId)}`, {
        method: "GET"
    });

    return await shopInventory.json();
}

export const getShopInventoryBatch = async (shopId, batchObject) => {
    const shopInventory = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/search/batch`, {
        method: "POST",
        body: JSON.stringify(batchObject)
    });

    return await shopInventory.json();
}

export const searchInventory = async ({
    identifier,
    by,
    value
}) => {
    const params = new URLSearchParams();

    if (by) {
        params.set("by", by);
        params.set("value", value);
    }

    const query = params.toString();
    const url = `${import.meta.env.VITE_LOL_API_URL}/shops/${encodeURIComponent(identifier)}/inventory${
        query ? `?${query}` : ""
    }`;

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        throw new Error(
            error?.message ??
            `Failed to retrieve inventory: ${response.status}`
        );
    }

    return response.json();
};