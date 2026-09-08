import type {
    ApiKeyListRecord,
    AuthPersistenceAdapter,
    AuthUserRecord,
    ListApiKeysArgs,
    StoredApiKey,
    StoredRefreshToken,
} from '../types/auth.types.js';

class InMemoryAuthPersistenceAdapter implements AuthPersistenceAdapter {
    private users = new Map<string, AuthUserRecord>();
    private usersByEmail = new Map<string, string>();
    private refreshTokens = new Map<string, StoredRefreshToken>();
    private apiKeys = new Map<string, StoredApiKey>();
    private nextUserId = 1;
    private nextRefreshId = 1;
    private nextApiKeyId = 1;

    async findUserByEmail(args: { email: string }): Promise<AuthUserRecord | null> {
        const userId = this.usersByEmail.get(args.email);
        return userId ? (this.users.get(userId) ?? null) : null;
    }

    async findUserById(args: { userId: string }): Promise<AuthUserRecord | null> {
        return this.users.get(args.userId) ?? null;
    }

    async createUser(args: {
        email: string;
        passwordHash: string;
        displayName?: string;
    }): Promise<AuthUserRecord> {
        const id = String(this.nextUserId++);
        const user: AuthUserRecord = {
            id,
            email: args.email,
            passwordHash: args.passwordHash,
            displayName: args.displayName ?? null,
            isActive: true,
        };
        this.users.set(id, user);
        this.usersByEmail.set(args.email, id);
        return user;
    }

    async updateUser(args: {
        userId: string;
        displayName?: string;
        email?: string;
    }): Promise<AuthUserRecord> {
        const user = this.users.get(args.userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (args.email && args.email !== user.email) {
            this.usersByEmail.delete(user.email);
            user.email = args.email;
            this.usersByEmail.set(args.email, args.userId);
        }
        if (args.displayName !== undefined) {
            user.displayName = args.displayName;
        }
        this.users.set(args.userId, user);
        return user;
    }

    async saveRefreshToken(args: {
        userId: string;
        hash: string;
        expiresAt: Date;
    }): Promise<void> {
        this.refreshTokens.set(args.hash, {
            id: String(this.nextRefreshId++),
            userId: args.userId,
            hash: args.hash,
            expiresAt: args.expiresAt,
        });
    }

    async findRefreshTokenByHash(args: {
        hash: string;
    }): Promise<StoredRefreshToken | null> {
        return this.refreshTokens.get(args.hash) ?? null;
    }

    async deleteRefreshTokenByHash(args: { hash: string }): Promise<void> {
        this.refreshTokens.delete(args.hash);
    }

    async createApiKey(args: {
        userId: string;
        name: string | null;
        prefix: string;
        hash: string;
    }): Promise<ApiKeyListRecord> {
        const id = String(this.nextApiKeyId++);
        const createdAt = new Date();
        this.apiKeys.set(id, {
            id,
            userId: args.userId,
            prefix: args.prefix,
            hash: args.hash,
            name: args.name,
            createdAt,
            revokedAt: null,
        });
        return { id, prefix: args.prefix, name: args.name, createdAt };
    }

    async listApiKeys(
        args: ListApiKeysArgs,
    ): Promise<{ rows: ApiKeyListRecord[]; total: number }> {
        let rows = [...this.apiKeys.values()].filter(
            (row) => String(row.userId) === args.userId && !row.revokedAt,
        );
        if (args.search) {
            const term = args.search.toLowerCase();
            rows = rows.filter((row) =>
                (row.name ?? '').toLowerCase().includes(term),
            );
        }
        rows.sort((left, right) => {
            const leftValue =
                args.sortBy === 'name'
                    ? (left.name ?? '')
                    : left.createdAt.toISOString();
            const rightValue =
                args.sortBy === 'name'
                    ? (right.name ?? '')
                    : right.createdAt.toISOString();
            const compared = leftValue.localeCompare(rightValue);
            return args.sortOrder === 'ASC' ? compared : -compared;
        });
        const total = rows.length;
        const page = rows.slice(args.skip, args.skip + args.take).map((row) => ({
            id: row.id,
            prefix: row.prefix,
            name: row.name,
            createdAt: row.createdAt,
        }));
        return { rows: page, total };
    }

    async findApiKeyByPrefix(args: { prefix: string }): Promise<StoredApiKey | null> {
        return (
            [...this.apiKeys.values()].find((row) => row.prefix === args.prefix) ??
            null
        );
    }

    async revokeApiKey(args: { userId: string; apiKeyId: string }): Promise<boolean> {
        const stored = this.apiKeys.get(args.apiKeyId);
        if (!stored || String(stored.userId) !== args.userId || stored.revokedAt) {
            return false;
        }
        stored.revokedAt = new Date();
        this.apiKeys.set(args.apiKeyId, stored);
        return true;
    }
}

export { InMemoryAuthPersistenceAdapter };
