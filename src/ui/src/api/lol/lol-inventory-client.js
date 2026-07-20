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