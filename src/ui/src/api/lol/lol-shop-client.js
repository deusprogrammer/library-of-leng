export const getShop = async (shopId) => {
    const shopMetaData = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}`, {
        method: "GET"
    });

    return await shopMetaData.json();
}