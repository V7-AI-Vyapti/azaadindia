const AUTH_ROUTE_PATHS = {
    LOGIN: 'login',
    REFRESH: 'refresh',
    LOGOUT: 'logout',
    ME: 'me',
    REGISTER: 'register',
    API_KEYS: 'api-keys',
    API_KEY_BY_ID: 'api-keys/:apiKeyId',
} as const;

export { AUTH_ROUTE_PATHS };
