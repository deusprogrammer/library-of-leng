import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens, isShopOwner } from "../api/auth";
import ManaLoader from "../component/ManaLoader";

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    // The OAuth code is single-use; guard against StrictMode double-invoke.
    const exchangeStarted = useRef(false);

    useEffect(() => {
        if (oauthError) {
            setError(searchParams.get("error_description") ?? oauthError);
            return;
        }

        if (!code || exchangeStarted.current) {
            return;
        }

        exchangeStarted.current = true;

        (async () => {
            try {
                await exchangeCodeForTokens(code);
            } catch (err) {
                console.error(err);
                setError("Login failed. Please try again.");
                return;
            }

            navigate(isShopOwner() ? "/owner" : "/", { replace: true });
        })();
    }, [code, oauthError]);

    if (error) {
        return (
            <>
                <h1>Login failed</h1>
                <p>{error}</p>
            </>
        );
    }

    return (
        <ManaLoader phrase="Logging in..." />
    );
};

export default AuthCallback;
