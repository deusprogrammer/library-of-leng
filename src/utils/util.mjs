export const jsonResponse = (statusCode, body, error) => {
    if (error) { 
        console.error(error);
    }

    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    }
}