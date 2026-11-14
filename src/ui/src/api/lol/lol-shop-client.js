import { deviceFetch } from "./lol-device-client";

export const getShop = async (shopId) => {
    const shopMetaData = await deviceFetch(shopId, `${import.meta.env.VITE_LOL_API_URL}shops/${shopId}`, {
        method: "GET"
    });

    return await shopMetaData.json();
}