import { authFetch } from "../auth";

const API_URL = import.meta.env.VITE_LOL_API_URL;

const asJson = async (response, failureMessage) => {
    if (!response.ok) {
        const error = await response.json().catch(() => null);

        throw new Error(error?.message ?? `${failureMessage}: ${response.status}`);
    }

    return response.json();
};

export const getMyShops = async () => {
    const response = await authFetch(`${API_URL}my/shops`, {
        method: "GET"
    });

    return asJson(response, "Failed to retrieve your shops");
};

export const createShop = async (shop) => {
    const response = await authFetch(`${API_URL}shops`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(shop)
    });

    return asJson(response, "Failed to create shop");
};

export const listShopCarts = async (shopId) => {
    const response = await authFetch(`${API_URL}shops/${shopId}/carts`, {
        method: "GET"
    });

    return asJson(response, "Failed to retrieve carts");
};

export const adjustInventory = async (shopId, item) => {
    const response = await authFetch(`${API_URL}shops/${shopId}/inventory`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });

    return asJson(response, "Failed to update inventory");
};

export const addBatchInventory = async (shopId, items) => {
    const response = await authFetch(`${API_URL}shops/${shopId}/inventory/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ items })
    });

    return asJson(response, "Failed to upload inventory batch");
};
