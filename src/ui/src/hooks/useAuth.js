import { useCallback, useEffect, useState } from "react";
import {
    ensureFreshAccessToken,
    getUser,
    hasSession,
    redirectToLogin
} from "../api/auth";

/**
 * Tracks the logged-in user and keeps the session fresh. Whenever the page
 * regains focus (or becomes visible again), an expired access token is
 * refreshed with the refresh token; if that fails the user is redirected
 * to the Cognito login page.
 */
const useAuth = () => {
    const [user, setUser] = useState(() => getUser());

    const revalidate = useCallback(async () => {
        if (!hasSession()) {
            setUser(null);
            return;
        }

        const accessToken = await ensureFreshAccessToken();

        if (!accessToken) {
            setUser(null);
            redirectToLogin();
            return;
        }

        setUser(getUser());
    }, []);

    useEffect(() => {
        revalidate();

        const onFocus = () => {
            revalidate();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                revalidate();
            }
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [revalidate]);

    return { user, revalidate };
};

export default useAuth;
