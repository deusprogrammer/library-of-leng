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
    
    const response = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts/${cartMeta.slug}`, {
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

    const response = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts`, {
        method: "POST"
    });

    cartData = await response.json();
    storeCartMeta(shopId, cartData);

    return cartData;
}

export const addToCart = async (shopId, inventoryId, quantity = 1) => {
    const cartMeta = getStoreCartMeta(shopId);
    const response = await fetch(`${import.meta.env.VITE_LOL_API_URL}shops/${shopId}/carts/${cartMeta.slug}/items`, {
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

    if (response.status !== 204) {
        console.error("Failed to add to cart");
        throw new Error("Failed to add item to cart");
    }

    return response.json();
}