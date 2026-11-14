import { atom } from 'jotai';

export const cartAtom = atom("[]");

// cartAtom starts as a placeholder before the cart loads, so guard on shape.
export const getCartQuantity = (cart, inventoryId) => (
    (Array.isArray(cart?.items) ? cart.items : [])
        .find((item) => item.inventoryId === inventoryId)?.quantity ?? 0
);
