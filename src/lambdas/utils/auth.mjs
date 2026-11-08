export const getClaims = (event) => {
    return event.requestContext?.authorizer?.jwt?.claims ?? null;
};

export const getUserId = (event) => {
    return getClaims(event)?.sub ?? null;
};

export const getGroups = (event) => {
    const raw = getClaims(event)?.["cognito:groups"];

    if (!raw) {
        return [];
    }

    if (Array.isArray(raw)) {
        return raw;
    }

    // API Gateway HTTP APIs stringify array claims as "[group1 group2]"
    return raw
        .replace(/^\[|\]$/g, "")
        .split(/[\s,]+/)
        .filter(Boolean);
};

export const hasAnyGroup = (event, ...groups) => {
    const userGroups = getGroups(event);

    return groups.some((group) => userGroups.includes(group));
};
