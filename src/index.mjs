import { getShop, getShops, createShop } from "./handlers/shop.mjs";
import { getInventory, addInventory, addBatchInventory } from "./handlers/inventory.mjs";
import { getCart, createCart, addToCart } from "./handlers/cart.mjs";

export default {
    getShop,
    getShops,
    createShop,
    getInventory,
    addInventory,
    addBatchInventory,
    getCart,
    createCart,
    addToCart
}