import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { serializeApiKeyListItem } from '../serializers/api-key.serializer.js';
import { createAuthServices } from './test-auth.helpers.js';

describe('ApiKeyService', () => {
    it('issues a raw key once and lists prefix only (never the hash)', async () => {
        const services = createAuthServices();
        const user = await services.persistence.createUser({
            email: 'user@example.com',
            passwordHash: 'hash',
            displayName: 'User',
        });
        const issued = await services.apiKeyService.issue({
            userId: String(user.id),
            name: 'ci',
        });
        assert.match(issued.rawKey, /^v7ak_/);
        assert.equal(issued.prefix.length, 16);

        const listed = await services.apiKeyService.list({
            userId: String(user.id),
        });
        assert.equal(listed.rows.length, 1);
        const serialized = listed.rows.map(serializeApiKeyListItem);
        const payload = JSON.stringify(serialized);
        assert.equal(serialized[0]?.prefix, issued.prefix);
        assert.doesNotMatch(payload, /hash/i);
        assert.equal(payload.includes(issued.rawKey), false);

        const stored = await services.persistence.findApiKeyByPrefix({
            prefix: issued.prefix,
        });
        assert.ok(stored);
        assert.notEqual(stored.hash, issued.rawKey);
        assert.equal(JSON.stringify(serialized).includes(stored.hash), false);
    });

    it('authenticates a valid API key', async () => {
        const services = createAuthServices();
        const user = await services.persistence.createUser({
            email: 'user@example.com',
            passwordHash: 'hash',
        });
        const issued = await services.apiKeyService.issue({
            userId: String(user.id),
        });
        const principal = await services.apiKeyService.authenticate({
            rawKey: issued.rawKey,
        });
        assert.equal(principal.id, String(user.id));
        assert.equal(principal.authMethod, 'api-key');
    });
});
