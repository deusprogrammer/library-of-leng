import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get("code");
    
    const COGNITO_URL = 'https://library-of-leng.auth.us-east-1.amazoncognito.com/oauth2/token';
    const COGNITO_CLIENT_ID = '45eu0ccq0jfkpm6l0rus56298h';
    const COGNITO_REDIRECT_URI = 'http://localhost:5173/auth/callback';

    useEffect(() => {
        if (code) {
            (async () => {
                const response = await fetch(COGNITO_URL, {
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

                const tokens = await response.json();
                console.log(tokens);

                sessionStorage.setItem("accessToken", tokens.access_token);
                sessionStorage.setItem("idToken", tokens.id_token);
                sessionStorage.setItem("refreshToken", tokens.refresh_token);

                navigate("/");
            })();
        }

    }, [code]);

    return (
        <>
            <h1>Logged In</h1>
        </>
    )
}

export default AuthCallback;