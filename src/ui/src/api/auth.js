const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;

const TOKEN_ENDPOINT = `${COGNITO_DOMAIN}/oauth2/token`;

// Treat tokens expiring within this window as already expired so we
// refresh before an in-flight request can fail.
const EXPIRY_SKEW_SECONDS = 60;

export const decodeJwt = (token) => {
    if (!token) {
        return null;
    }

    try {
        const [, payload] = token.split(".");

        return JSON.parse(
            atob(
                payload
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );
    } catch {
        return null;
    }
};

export const isTokenExpired = (token) => {
    const claims = decodeJwt(token);

    if (!claims?.exp) {
        return true;
    }

    return claims.exp - EXPIRY_SKEW_SECONDS <= Date.now() / 1000;
};

export const getTokens = () => ({
    accessToken: sessionStorage.getItem("accessToken"),
    idToken: sessionStorage.getItem("idToken"),
    refreshToken: sessionStorage.getItem("refreshToken")
});

export const storeTokens = ({ access_token, id_token, refresh_token }) => {
    if (access_token) {
        sessionStorage.setItem("accessToken", access_token);
    }

    if (id_token) {
        sessionStorage.setItem("idToken", id_token);
    }

    // The refresh_token grant does not return a new refresh token,
    // so keep the existing one in that case.
    if (refresh_token) {
        sessionStorage.setItem("refreshToken", refresh_token);
    }
};

export const clearTokens = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("idToken");
    sessionStorage.removeItem("refreshToken");
};

export const hasSession = () => {
    const { accessToken, refreshToken } = getTokens();

    return Boolean(accessToken || refreshToken);
};

export const getLoginUrl = () => {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: COGNITO_CLIENT_ID,
        redirect_uri: COGNITO_REDIRECT_URI,
        scope: "openid email profile"
    });

    return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
};

export const redirectToLogin = () => {
    window.location.assign(getLoginUrl());
};

export const logout = () => {
    clearTokens();

    const params = new URLSearchParams({
        client_id: COGNITO_CLIENT_ID,
        logout_uri: window.location.origin
    });

    window.location.assign(`${COGNITO_DOMAIN}/logout?${params.toString()}`);
};

export const exchangeCodeForTokens = async (code) => {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: COGNITO_CLIENT_ID,
            code,
            redirect_uri: COGNITO_REDIRECT_URI
        })
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens = await response.json();
    storeTokens(tokens);

    return tokens;
};

let refreshPromise = null;

export const refreshTokens = async () => {
    // Dedupe concurrent refreshes (e.g. several components waking on focus).
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const { refreshToken } = getTokens();

        if (!refreshToken) {
            return null;
        }

        let response;
        try {
            response = await fetch(TOKEN_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    client_id: COGNITO_CLIENT_ID,
                    refresh_token: refreshToken
                })
            });
        } catch {
            // Network failure: keep the session so a later attempt can retry.
            return null;
        }

        if (!response.ok) {
            // Refresh token is expired or revoked; the session is dead.
            clearTokens();
            return null;
        }

        const tokens = await response.json();
        storeTokens(tokens);

        return tokens;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
};

/**
 * Returns a valid access token, refreshing it if needed.
 * Returns null when there is no usable session.
 */
export const ensureFreshAccessToken = async () => {
    const { accessToken } = getTokens();

    if (accessToken && !isTokenExpired(accessToken)) {
        return accessToken;
    }

    const tokens = await refreshTokens();

    return tokens?.access_token ?? null;
};

export const getUser = () => {
    const { idToken } = getTokens();

    return decodeJwt(idToken);
};

export const getUserGroups = () => {
    return getUser()?.["cognito:groups"] ?? [];
};

export const isShopOwner = () => {
    const groups = getUserGroups();

    return groups.includes("shop_owner") || groups.includes("admin");
};

/**
 * fetch wrapper for protected endpoints. Ensures a fresh access token,
 * attaches it as a Bearer token, and retries once after a refresh if the
 * API still answers 401. Redirects to login when no session can be
 * established.
 */
export const authFetch = async (url, options = {}) => {
    const accessToken = await ensureFreshAccessToken();

    if (!accessToken) {
        redirectToLogin();
        throw new Error("Not authenticated");
    }

    const withAuth = (token) => ({
        ...options,
        headers: {
            ...(options.headers ?? {}),
            "Authorization": `Bearer ${token}`
        }
    });

    let response = await fetch(url, withAuth(accessToken));

    if (response.status === 401) {
        const tokens = await refreshTokens();

        if (!tokens?.access_token) {
            redirectToLogin();
            throw new Error("Session expired");
        }

        response = await fetch(url, withAuth(tokens.access_token));
    }

    return response;
};
