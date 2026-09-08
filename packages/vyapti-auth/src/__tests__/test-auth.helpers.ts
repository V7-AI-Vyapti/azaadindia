import { generateKeyPairSync } from 'node:crypto';
import { AUTH_JWT_DEFAULTS, AUTH_REGISTER_POLICIES, AUTH_STRATEGIES } from '../auth.constants.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import { JwtTokenService } from '../services/jwt-token.service.js';
import { PasswordService } from '../services/password.service.js';
import { RefreshTokenService } from '../services/refresh-token.service.js';
import type {
    AuthPersistenceAdapter,
    ResolvedAuthModuleOptions,
} from '../types/auth.types.js';
import { parseTtlToSeconds } from '../utils/parse-ttl.util.js';
import { InMemoryAuthPersistenceAdapter } from './in-memory-auth-persistence.adapter.js';

const TEST_PRIVATE_KEY_ENV = 'TEST_AUTH_JWT_PRIVATE_KEY';
const TEST_PUBLIC_KEY_ENV = 'TEST_AUTH_JWT_PUBLIC_KEY';

function generateTestJwtKeys(): { privateKey: string; publicKey: string } {
    const pair = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return {
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
    };
}

function setTestJwtEnv(keys: { privateKey: string; publicKey: string }): void {
    process.env[TEST_PRIVATE_KEY_ENV] = keys.privateKey;
    process.env[TEST_PUBLIC_KEY_ENV] = keys.publicKey;
}

function createResolvedOptions(args?: {
    accessTtl?: string;
    strategies?: ResolvedAuthModuleOptions['strategies'];
    registerPolicy?: ResolvedAuthModuleOptions['registerPolicy'];
    keys?: { privateKey: string; publicKey: string };
}): ResolvedAuthModuleOptions {
    const keys = args?.keys ?? generateTestJwtKeys();
    const accessTtl = args?.accessTtl ?? AUTH_JWT_DEFAULTS.ACCESS_TTL;
    const refreshTtl = AUTH_JWT_DEFAULTS.REFRESH_TTL;
    return {
        routePrefix: 'auth',
        cookieName: 'refresh_token',
        cookiePath: '/auth',
        cookieSecure: false,
        strategies: args?.strategies ?? [AUTH_STRATEGIES.JWT, AUTH_STRATEGIES.API_KEY],
        registerPolicy:
            args?.registerPolicy ?? AUTH_REGISTER_POLICIES.INVITE_ONLY,
        globalGuard: true,
        jwt: {
            privateKey: keys.privateKey,
            publicKey: keys.publicKey,
            accessTtl,
            accessTtlSeconds: parseTtlToSeconds(accessTtl),
            refreshTtl,
            refreshTtlSeconds: parseTtlToSeconds(refreshTtl),
        },
    };
}

function createAuthServices(args?: {
    options?: ResolvedAuthModuleOptions;
    persistence?: AuthPersistenceAdapter;
}): {
    options: ResolvedAuthModuleOptions;
    persistence: AuthPersistenceAdapter;
    passwordService: PasswordService;
    jwtTokenService: JwtTokenService;
    refreshTokenService: RefreshTokenService;
    apiKeyService: ApiKeyService;
    authSessionService: AuthSessionService;
} {
    const options = args?.options ?? createResolvedOptions();
    const persistence = args?.persistence ?? new InMemoryAuthPersistenceAdapter();
    const passwordService = new PasswordService();
    const jwtTokenService = new JwtTokenService(options);
    const refreshTokenService = new RefreshTokenService(options, persistence);
    const apiKeyService = new ApiKeyService(options, persistence);
    const authSessionService = new AuthSessionService(
        options,
        persistence,
        passwordService,
        jwtTokenService,
        refreshTokenService,
        apiKeyService,
    );
    return {
        options,
        persistence,
        passwordService,
        jwtTokenService,
        refreshTokenService,
        apiKeyService,
        authSessionService,
    };
}

export {
    TEST_PRIVATE_KEY_ENV,
    TEST_PUBLIC_KEY_ENV,
    createAuthServices,
    createResolvedOptions,
    generateTestJwtKeys,
    setTestJwtEnv,
};
