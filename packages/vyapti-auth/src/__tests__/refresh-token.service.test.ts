import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { createAuthServices } from './test-auth.helpers.js';

describe('refresh token reuse', () => {
    it('rejects a refresh token after it has already been rotated', async () => {
        const services = createAuthServices();
        const passwordHash = await services.passwordService.hashPassword({
            password: 'password12',
        });
        await services.persistence.createUser({
            email: 'user@example.com',
            passwordHash,
        });
        const first = await services.authSessionService.login({
            email: 'user@example.com',
            password: 'password12',
        });
        const second = await services.authSessionService.refresh({
            refreshToken: first.refreshToken,
        });
        assert.notEqual(second.refreshToken, first.refreshToken);
        assert.ok(second.accessToken);

        await assert.rejects(
            () =>
                services.authSessionService.refresh({
                    refreshToken: first.refreshToken,
                }),
            (error: unknown) =>
                error instanceof UnauthorizedException &&
                error.getStatus() === 401,
        );
    });
});
