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

export const normalizeName = (name) =>
        name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();