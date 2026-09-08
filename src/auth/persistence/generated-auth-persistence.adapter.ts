import { ILike, IsNull } from 'typeorm';
import type {
    ApiKeyListRecord,
    AuthPersistenceAdapter,
    AuthUserRecord,
    ListApiKeysArgs,
    StoredApiKey,
    StoredRefreshToken,
} from '@vyapti/auth';
import {
    readForeignKeyId,
    readNumber,
    readString,
} from '@vulcan/shared/utils/record-readers';
import { ApiKey } from '../entities/api_key.entity';
import { RefreshToken } from '../entities/refresh_token.entity';
import { User } from '../entities/user.entity';
import { ApiKeyCreateSchema } from '../schema/api-key-write.schema';
import { RefreshTokenCreateSchema } from '../schema/refresh-token-write.schema';
import {
    UserCreateSchema,
    UserUpdateSchema,
} from '../schema/user-write.schema';
import { fromIsoDateString, toIsoDateString } from '../utils/iso-date.util';
import { mapAuthUserRecord } from '../utils/map-auth-user-record.util';
import { parsePositiveId } from '../utils/parse-positive-id.util';
import { readNullableString } from '../utils/read-nullable-string.util';

function requireUserId(userId: string): number {
    const parsed = parsePositiveId(userId);
    if (parsed == null) {
        throw new Error(`Invalid user id '${userId}'`);
    }
    return parsed;
}

function mapStoredRefreshToken(row: unknown): StoredRefreshToken {
    return {
        id: readNumber(row, 'refresh_token_id'),
        userId: readForeignKeyId(row, 'user_id', 'user_id'),
        hash: readString(row, 'token_hash'),
        expiresAt: fromIsoDateString(readString(row, 'expires_at')),
    };
}

function mapApiKeyListRecord(row: unknown): ApiKeyListRecord {
    return {
        id: readNumber(row, 'api_key_id'),
        prefix: readString(row, 'prefix'),
        name: readNullableString(row, 'name'),
        createdAt: fromIsoDateString(readString(row, 'created_at')),
    };
}

function mapStoredApiKey(row: unknown): StoredApiKey {
    const revokedAt = readNullableString(row, 'revoked_at');
    return {
        id: readNumber(row, 'api_key_id'),
        userId: readForeignKeyId(row, 'user_id', 'user_id'),
        prefix: readString(row, 'prefix'),
        hash: readString(row, 'token_hash'),
        name: readNullableString(row, 'name'),
        createdAt: fromIsoDateString(readString(row, 'created_at')),
        revokedAt: revokedAt ? fromIsoDateString(revokedAt) : null,
    };
}

function createGeneratedAuthPersistenceAdapter(): AuthPersistenceAdapter {
    return {
        async findUserByEmail(args: {
            email: string;
        }): Promise<AuthUserRecord | null> {
            const user = await User.one({ email: args.email.toLowerCase() });
            return user ? mapAuthUserRecord(user) : null;
        },

        async findUserById(args: {
            userId: string;
        }): Promise<AuthUserRecord | null> {
            const userId = parsePositiveId(args.userId);
            if (userId == null) {
                return null;
            }
            const user = await User.getByPk(userId);
            return user ? mapAuthUserRecord(user) : null;
        },

        async createUser(args: {
            email: string;
            passwordHash: string;
            displayName?: string;
        }): Promise<AuthUserRecord> {
            const payload = UserCreateSchema.parse({
                email: args.email,
                password_hash: args.passwordHash,
                display_name: args.displayName?.trim()
                    ? args.displayName.trim()
                    : null,
                is_active: true,
            });
            const created = await User.createOne(payload);
            return mapAuthUserRecord(created);
        },

        async updateUser(args: {
            userId: string;
            displayName?: string;
            email?: string;
        }): Promise<AuthUserRecord> {
            const userId = requireUserId(args.userId);
            const payload = UserUpdateSchema.parse({
                ...(args.email !== undefined ? { email: args.email } : {}),
                ...(args.displayName !== undefined
                    ? { display_name: args.displayName }
                    : {}),
            });
            await User.updateByPk(userId, payload);
            const updated = await User.getByPk(userId);
            if (!updated) {
                throw new Error('User was not found after update');
            }
            return mapAuthUserRecord(updated);
        },

        async saveRefreshToken(args: {
            userId: string;
            hash: string;
            expiresAt: Date;
        }): Promise<void> {
            const payload = RefreshTokenCreateSchema.parse({
                user_id: requireUserId(args.userId),
                token_hash: args.hash,
                expires_at: toIsoDateString(args.expiresAt),
            });
            await RefreshToken.createOne(payload);
        },

        async findRefreshTokenByHash(args: {
            hash: string;
        }): Promise<StoredRefreshToken | null> {
            const row = await RefreshToken.one(
                { token_hash: args.hash },
                { relations: { user_id: true } },
            );
            return row ? mapStoredRefreshToken(row) : null;
        },

        async deleteRefreshTokenByHash(args: { hash: string }): Promise<void> {
            await RefreshToken.deleteWhere({ token_hash: args.hash });
        },

        async createApiKey(args: {
            userId: string;
            name: string | null;
            prefix: string;
            hash: string;
        }): Promise<ApiKeyListRecord> {
            const payload = ApiKeyCreateSchema.parse({
                user_id: requireUserId(args.userId),
                prefix: args.prefix,
                token_hash: args.hash,
                name: args.name,
                created_at: toIsoDateString(new Date()),
                revoked_at: null,
            });
            const created = await ApiKey.createOne(payload);
            return mapApiKeyListRecord(created);
        },

        async listApiKeys(
            args: ListApiKeysArgs,
        ): Promise<{ rows: ApiKeyListRecord[]; total: number }> {
            const userId = requireUserId(args.userId);
            const where: Record<string, unknown> = {
                user_id: userId,
                revoked_at: IsNull(),
            };
            if (args.search) {
                where.name = ILike(`%${args.search}%`);
            }
            const sortColumn = args.sortBy === 'name' ? 'name' : 'created_at';
            const [rows, total] = await Promise.all([
                ApiKey.filter(where, {
                    skip: args.skip,
                    take: args.take,
                    order: { [sortColumn]: args.sortOrder },
                }),
                ApiKey.countOf(where),
            ]);
            return {
                rows: rows.map((row) => mapApiKeyListRecord(row)),
                total,
            };
        },

        async findApiKeyByPrefix(args: {
            prefix: string;
        }): Promise<StoredApiKey | null> {
            const row = await ApiKey.one({ prefix: args.prefix });
            return row ? mapStoredApiKey(row) : null;
        },

        async revokeApiKey(args: {
            userId: string;
            apiKeyId: string;
        }): Promise<boolean> {
            const userId = requireUserId(args.userId);
            const apiKeyId = parsePositiveId(args.apiKeyId);
            if (apiKeyId == null) {
                return false;
            }
            const row = await ApiKey.one({
                api_key_id: apiKeyId,
                user_id: userId,
            });
            if (!row || readNullableString(row, 'revoked_at')) {
                return false;
            }
            await ApiKey.updateByPk(apiKeyId, {
                revoked_at: toIsoDateString(new Date()),
            });
            return true;
        },
    };
}

export { createGeneratedAuthPersistenceAdapter };
