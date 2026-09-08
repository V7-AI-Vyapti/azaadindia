import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../services/jwt-token.service.js';
import { createAuthServices, createResolvedOptions } from './test-auth.helpers.js';

describe('JwtTokenService', () => {
    it('signs and verifies a valid RS256 JWT', () => {
        const options = createResolvedOptions();
        const service = new JwtTokenService(options);
        const token = service.signAccessToken({
            userId: '42',
            email: 'user@example.com',
        });
        const principal = service.verifyAccessToken({ token });
        assert.equal(principal.id, '42');
        assert.equal(principal.email, 'user@example.com');
        assert.equal(principal.authMethod, 'jwt');
    });

    it('rejects an expired JWT', async () => {
        const options = createResolvedOptions({ accessTtl: '1s' });
        const service = new JwtTokenService(options);
        const token = service.signAccessToken({
            userId: '42',
            email: 'user@example.com',
        });
        await new Promise((resolve) => setTimeout(resolve, 1100));
        assert.throws(() => service.verifyAccessToken({ token }));
    });

    it('maps verify failures to 401', () => {
        const { authSessionService } = createAuthServices();
        assert.throws(
            () => authSessionService.authenticateJwt({ token: 'not-a-jwt' }),
            (error: unknown) =>
                error instanceof UnauthorizedException &&
                error.getStatus() === 401,
        );
    });
});
