import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    CONTROLLER_PATH_METADATA,
    applyControllerPath,
} from '../utils/apply-controller-path.util.js';

describe('applyControllerPath', () => {
    it('sets Nest controller path metadata', () => {
        class SampleController {}
        applyControllerPath({
            controllers: [SampleController],
            path: 'vulcan/auth',
        });
        assert.equal(
            Reflect.getMetadata(CONTROLLER_PATH_METADATA, SampleController),
            'vulcan/auth',
        );
    });
});
