import { deviceFetch } from "./lol-device-client";

const sha256 = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

const getStorageKey = (shopId) => {
    return `lol.shops[${shopId}].cart`
}

const storeCartMeta = (shopId, cartMeta) => {
    localStorage.setItem(getStorageKey(shopId), JSON.stringify(cartMeta));
}

export const getStoreCartMeta = (shopId) => {
    const cartMeta = localStorage.getItem(getStorageKey(shopId));

    if (!cartMeta) {
        return null;
    }

    return JSON.parse(cartMeta);
}

export const getCart = async (shopId) => {
    const cartMeta = await createCart(shopId);
    
    const response = await deviceFetch(shopId, `${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts/${cartMeta.slug}`, {
        method: "GET",
        headers: {
            "x-cart-token": await sha256(cartMeta.token)
        }
    });

    if (response.status === 404) {
        await createCart(shopId, true);
        return await getCart(shopId);
    }

    const cartData = await response.json();

    return cartData;
}

export const createCart = async (shopId, forceRefresh = false) => {
    let cartData = getStoreCartMeta(shopId);

    if (!forceRefresh && cartData) {
        return cartData;
    }

    const response = await deviceFetch(shopId, `${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts`, {
        method: "POST"
    });

    cartData = await response.json();
    storeCartMeta(shopId, cartData);

    return cartData;
}

export const addToCart = async (shopId, inventoryId, quantity = 1) => {
    const cartMeta = getStoreCartMeta(shopId);
    const response = await deviceFetch(shopId, `${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts/${cartMeta.slug}/items`, {
        method: "POST",
        body: JSON.stringify({
            inventoryId,
            quantity
        }),
        headers: {
            "Content-Type": "application/json",
            "x-cart-token": await sha256(cartMeta.token)
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        console.error("Failed to add to cart", error);
        throw new Error(error?.message ?? "Failed to add item to cart");
    }

    return response.json();
}

export const removeFromCart = async (shopId, inventoryId) => {
    const cartMeta = getStoreCartMeta(shopId);
    const response = await deviceFetch(shopId, `${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts/${cartMeta.slug}/items/${encodeURIComponent(inventoryId)}`, {
        method: "DELETE",
        headers: {
            "x-cart-token": await sha256(cartMeta.token)
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);

        console.error("Failed to remove from cart", error);
        throw new Error(error?.message ?? "Failed to remove item from cart");
    }

    return response.json();
}