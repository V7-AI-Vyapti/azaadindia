import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AUTH_MESSAGES } from '../auth.constants.js';
import { loadJwtKeys } from '../utils/load-jwt-keys.util.js';
import {
    TEST_PRIVATE_KEY_ENV,
    TEST_PUBLIC_KEY_ENV,
    generateTestJwtKeys,
    setTestJwtEnv,
} from './test-auth.helpers.js';

describe('loadJwtKeys', () => {
    it('throws when JWT key env vars are unset', () => {
        delete process.env[TEST_PRIVATE_KEY_ENV];
        delete process.env[TEST_PUBLIC_KEY_ENV];

        assert.throws(
            () =>
                loadJwtKeys({
                    privateKeyEnv: TEST_PRIVATE_KEY_ENV,
                    publicKeyEnv: TEST_PUBLIC_KEY_ENV,
                }),
            (error: unknown) =>
                error instanceof Error &&
                error.message.includes(AUTH_MESSAGES.JWT_KEYS_MISSING),
        );
    });

    it('returns PEM keys when env vars are set', () => {
        const keys = generateTestJwtKeys();
        setTestJwtEnv(keys);
        const loaded = loadJwtKeys({
            privateKeyEnv: TEST_PRIVATE_KEY_ENV,
            publicKeyEnv: TEST_PUBLIC_KEY_ENV,
        });
        assert.equal(loaded.privateKey, keys.privateKey);
        assert.equal(loaded.publicKey, keys.publicKey);
    });
});
