const API_URL = import.meta.env.VITE_LOL_API_URL;

export const DEVICE_FORBIDDEN_EVENT = "lol:device-forbidden";

// Shops are addressable by slug or UUID, so a key is stored under every
// identifier the device may use to reach the shop.
const getStorageKey = (identifier) => `lol.shops[${identifier}].deviceKey`;

export const getDeviceKey = (identifier) =>
    localStorage.getItem(getStorageKey(identifier));

export const storeDeviceKey = (identifiers, registrationKey) => {
    for (const identifier of new Set(identifiers.filter(Boolean))) {
        localStorage.setItem(getStorageKey(identifier), registrationKey);
    }
};

export class DeviceForbiddenError extends Error {
    constructor(identifier, status) {
        super("This device is not registered for this shop.");
        this.name = "DeviceForbiddenError";
        this.identifier = identifier;
        this.status = status;
    }
}

/**
 * fetch wrapper for kiosk (non-admin) endpoints. Attaches the device's
 * registration key as a bearer token and, if the API rejects it (401/403),
 * signals the app to show the 403 page and throws.
 */
export const deviceFetch = async (identifier, url, options = {}) => {
    const deviceKey = getDeviceKey(identifier);

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers ?? {}),
            ...(deviceKey ? { Authorization: `Bearer ${deviceKey}` } : {})
        }
    });

    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new CustomEvent(DEVICE_FORBIDDEN_EVENT, {
            detail: { identifier, status: response.status }
        }));

        throw new DeviceForbiddenError(identifier, response.status);
    }

    return response;
};

export const registerDevice = async (identifier, { pairingKey, name }) => {
    const response = await fetch(`${API_URL}shops/${encodeURIComponent(identifier)}/devices`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pairingKey, name })
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(body?.message ?? `Failed to register device: ${response.status}`);
    }

    storeDeviceKey([identifier, body.shopId], body.registrationKey);

    return body;
};
