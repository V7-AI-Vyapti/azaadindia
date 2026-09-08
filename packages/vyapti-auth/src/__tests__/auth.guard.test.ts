import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../guards/auth.guard.js';
import { IS_PUBLIC_KEY } from '../guards/public.decorator.js';
import {
    createAuthServices,
    createResolvedOptions,
} from './test-auth.helpers.js';

function createContext(args: {
    authorization?: string;
}): ExecutionContext {
    const request = {
        headers: args.authorization
            ? { authorization: args.authorization }
            : {},
        user: undefined,
    };
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getHandler: () => Function,
        getClass: () => class TestController {},
    } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
    it('allows @Public() routes without a token', async () => {
        const { authSessionService, options } = createAuthServices();
        const reflector = {
            getAllAndOverride: (key: string) => key === IS_PUBLIC_KEY,
        } as unknown as Reflector;
        const guard = new AuthGuard(reflector, options, authSessionService);
        const allowed = await guard.canActivate(createContext({}));
        assert.equal(allowed, true);
    });

    it('rejects missing credentials on protected routes with 401', async () => {
        const { authSessionService, options } = createAuthServices();
        const reflector = {
            getAllAndOverride: () => false,
        } as unknown as Reflector;
        const guard = new AuthGuard(reflector, options, authSessionService);
        await assert.rejects(
            () => guard.canActivate(createContext({})),
            (error: unknown) =>
                error instanceof UnauthorizedException &&
                error.getStatus() === 401,
        );
    });

    it('accepts a valid JWT on a protected route', async () => {
        const services = createAuthServices();
        const passwordHash = await services.passwordService.hashPassword({
            password: 'password12',
        });
        const user = await services.persistence.createUser({
            email: 'user@example.com',
            passwordHash,
            displayName: 'User',
        });
        const token = services.jwtTokenService.signAccessToken({
            userId: String(user.id),
            email: user.email,
        });
        const reflector = {
            getAllAndOverride: () => false,
        } as unknown as Reflector;
        const guard = new AuthGuard(
            reflector,
            services.options,
            services.authSessionService,
        );
        const context = createContext({ authorization: `Bearer ${token}` });
        const allowed = await guard.canActivate(context);
        assert.equal(allowed, true);
        const request = context.switchToHttp().getRequest<{
            user?: { id: string; email: string };
        }>();
        assert.equal(request.user?.id, String(user.id));
        assert.equal(request.user?.email, user.email);
    });

    it('rejects an expired JWT with 401', async () => {
        const options = createResolvedOptions({ accessTtl: '1s' });
        const services = createAuthServices({ options });
        const passwordHash = await services.passwordService.hashPassword({
            password: 'password12',
        });
        const user = await services.persistence.createUser({
            email: 'user@example.com',
            passwordHash,
        });
        const token = services.jwtTokenService.signAccessToken({
            userId: String(user.id),
            email: user.email,
        });
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const reflector = {
            getAllAndOverride: () => false,
        } as unknown as Reflector;
        const guard = new AuthGuard(
            reflector,
            services.options,
            services.authSessionService,
        );
        await assert.rejects(
            () =>
                guard.canActivate(
                    createContext({ authorization: `Bearer ${token}` }),
                ),
            (error: unknown) =>
                error instanceof UnauthorizedException &&
                error.getStatus() === 401,
        );
    });
});
