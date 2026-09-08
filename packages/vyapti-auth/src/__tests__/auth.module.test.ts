import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AUTH_MESSAGES } from '../auth.constants.js';
import { AuthModule } from '../auth.module.js';
import {
    TEST_PRIVATE_KEY_ENV,
    TEST_PUBLIC_KEY_ENV,
    generateTestJwtKeys,
    setTestJwtEnv,
} from './test-auth.helpers.js';
import { InMemoryAuthPersistenceAdapter } from './in-memory-auth-persistence.adapter.js';

describe('AuthModule.forRoot', () => {
    it('fails boot when JWT key env vars are unset', () => {
        delete process.env[TEST_PRIVATE_KEY_ENV];
        delete process.env[TEST_PUBLIC_KEY_ENV];
        assert.throws(
            () =>
                AuthModule.forRoot({
                    routePrefix: 'auth',
                    jwt: {
                        privateKeyEnv: TEST_PRIVATE_KEY_ENV,
                        publicKeyEnv: TEST_PUBLIC_KEY_ENV,
                    },
                    persistence: new InMemoryAuthPersistenceAdapter(),
                }),
            (error: unknown) =>
                error instanceof Error &&
                error.message.includes(AUTH_MESSAGES.JWT_KEYS_MISSING),
        );
    });

    it('builds a dynamic module when keys and persistence are provided', () => {
        setTestJwtEnv(generateTestJwtKeys());
        const dynamicModule = AuthModule.forRoot({
            routePrefix: '/v1/vulcan/auth',
            jwt: {
                privateKeyEnv: TEST_PRIVATE_KEY_ENV,
                publicKeyEnv: TEST_PUBLIC_KEY_ENV,
            },
            persistence: new InMemoryAuthPersistenceAdapter(),
        });
        assert.equal(dynamicModule.module, AuthModule);
        assert.equal(dynamicModule.global, false);
        assert.equal(dynamicModule.controllers?.length, 9);
    });
});
