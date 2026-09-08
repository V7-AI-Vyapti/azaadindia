import type { DynamicModule } from '@nestjs/common';

type AuthStrategy = 'jwt' | 'api-key';
type AuthRegisterPolicy = 'invite-only' | 'public' | 'admin-creates';
type AuthMethod = 'jwt' | 'api-key';

type AuthUserRecord = {
    id: string | number;
    email: string;
    passwordHash: string;
    displayName: string | null;
    isActive: boolean;
};

type AuthUserPrincipal = {
    id: string;
    email: string;
    displayName: string | null;
    authMethod: AuthMethod;
};

type StoredRefreshToken = {
    id: string | number;
    userId: string | number;
    hash: string;
    expiresAt: Date;
};

type StoredApiKey = {
    id: string | number;
    userId: string | number;
    prefix: string;
    hash: string;
    name: string | null;
    createdAt: Date;
    revokedAt: Date | null;
};

type ApiKeyListRecord = {
    id: string | number;
    prefix: string;
    name: string | null;
    createdAt: Date;
};

type ListApiKeysArgs = {
    userId: string;
    search: string | null;
    skip: number;
    take: number;
    sortBy: 'created_at' | 'name';
    sortOrder: 'ASC' | 'DESC';
};

type AuthPersistenceAdapter = {
    findUserByEmail(args: { email: string }): Promise<AuthUserRecord | null>;
    findUserById(args: { userId: string }): Promise<AuthUserRecord | null>;
    createUser(args: {
        email: string;
        passwordHash: string;
        displayName?: string;
    }): Promise<AuthUserRecord>;
    updateUser(args: {
        userId: string;
        displayName?: string;
        email?: string;
    }): Promise<AuthUserRecord>;
    saveRefreshToken(args: {
        userId: string;
        hash: string;
        expiresAt: Date;
    }): Promise<void>;
    findRefreshTokenByHash(args: {
        hash: string;
    }): Promise<StoredRefreshToken | null>;
    deleteRefreshTokenByHash(args: { hash: string }): Promise<void>;
    createApiKey(args: {
        userId: string;
        name: string | null;
        prefix: string;
        hash: string;
    }): Promise<ApiKeyListRecord>;
    listApiKeys(
        args: ListApiKeysArgs,
    ): Promise<{ rows: ApiKeyListRecord[]; total: number }>;
    findApiKeyByPrefix(args: { prefix: string }): Promise<StoredApiKey | null>;
    revokeApiKey(args: { userId: string; apiKeyId: string }): Promise<boolean>;
};

type AuthJwtOptions = {
    privateKeyEnv: string;
    publicKeyEnv: string;
    accessTtl?: string;
    refreshTtl?: string;
};

type AuthCookieOptions = {
    name?: string;
    path?: string;
    secure?: boolean;
};

type AuthModuleRootOptions = {
    routePrefix: string;
    jwt: AuthJwtOptions;
    persistence: AuthPersistenceAdapter;
    strategies?: AuthStrategy[];
    registerPolicy?: AuthRegisterPolicy;
    globalGuard?: boolean;
    cookie?: AuthCookieOptions;
};

type ResolvedAuthJwtOptions = {
    privateKey: string;
    publicKey: string;
    accessTtl: string;
    accessTtlSeconds: number;
    refreshTtl: string;
    refreshTtlSeconds: number;
};

type ResolvedAuthModuleOptions = {
    routePrefix: string;
    cookieName: string;
    cookiePath: string;
    cookieSecure: boolean;
    strategies: readonly AuthStrategy[];
    registerPolicy: AuthRegisterPolicy;
    globalGuard: boolean;
    jwt: ResolvedAuthJwtOptions;
};

type AuthModuleAsyncOptions = {
    routePrefix: string;
    globalGuard?: boolean;
    imports?: DynamicModule['imports'];
    inject?: Array<string | symbol | Function>;
    useFactory: (
        ...args: unknown[]
    ) => AuthModuleRootOptions | Promise<AuthModuleRootOptions>;
};

export type {
    ApiKeyListRecord,
    AuthCookieOptions,
    AuthJwtOptions,
    AuthMethod,
    AuthModuleAsyncOptions,
    AuthModuleRootOptions,
    AuthPersistenceAdapter,
    AuthRegisterPolicy,
    AuthStrategy,
    AuthUserPrincipal,
    AuthUserRecord,
    ListApiKeysArgs,
    ResolvedAuthJwtOptions,
    ResolvedAuthModuleOptions,
    StoredApiKey,
    StoredRefreshToken,
};
