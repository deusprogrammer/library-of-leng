import { useEffect, useState } from "react";
import { ensureFreshAccessToken, isShopOwner, redirectToLogin } from "../api/auth";
import ManaLoader from "./ManaLoader";

/**
 * Guards owner-only routes. Redirects to the Cognito login page when the
 * user has no valid session and shows an error when the user is not a
 * shop owner.
 */
const RequireOwner = ({ children }) => {
    const [status, setStatus] = useState("checking");

    useEffect(() => {
        (async () => {
            const accessToken = await ensureFreshAccessToken();

            if (!accessToken) {
                redirectToLogin();
                return;
            }

            setStatus(isShopOwner() ? "authorized" : "forbidden");
        })();
    }, []);

    if (status === "checking") {
        return <ManaLoader />;
    }

    if (status === "forbidden") {
        return <div>You must be a shop owner to view this page.</div>;
    }

    return children;
};

export default RequireOwner;
