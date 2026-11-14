import * as shopHandlers from "./handlers/shop.mjs";
import * as inventoryHandlers from "./handlers/inventory.mjs";
import * as cartHandlers from "./handlers/cart.mjs";
import { createRegistrationInvite, registerDevice, getRegisteredDevices, removeDevice } from "./handlers/devices.mjs";
import { withDeviceAccess } from "./utils/device.mjs";
import { withShopOwner } from "./utils/shop.mjs";

// Admin endpoints (Cognito-protected in API Gateway).
export const { getMyShops, createShop } = shopHandlers;
export const { addInventory, addBatchInventory } = inventoryHandlers;
export const { listCarts, getDeviceCart } = cartHandlers;
export { createRegistrationInvite, getRegisteredDevices, removeDevice };

// Owner-console reads of kiosk data, gated by Cognito instead of a device key.
export const getMyShop = withShopOwner(shopHandlers.getShop);
export const getMyShopInventory = withShopOwner(inventoryHandlers.getInventory);

// Device pairing is how a kiosk obtains its key, so it can't require one.
export { registerDevice };

// Kiosk (non-admin) endpoints require a registered device's bearer key.
export const getShop = withDeviceAccess(shopHandlers.getShop);
export const getInventory = withDeviceAccess(inventoryHandlers.getInventory);
export const getInventoryItem = withDeviceAccess(inventoryHandlers.getInventoryItem);
export const getInventoryBatch = withDeviceAccess(inventoryHandlers.getInventoryBatch);
export const getCart = withDeviceAccess(cartHandlers.getCart);
export const createCart = withDeviceAccess(cartHandlers.createCart);
export const addToCart = withDeviceAccess(cartHandlers.addToCart);
export const removeFromCart = withDeviceAccess(cartHandlers.removeFromCart);
