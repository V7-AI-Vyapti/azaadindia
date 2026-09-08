import { Controller, Param, Req } from '@nestjs/common';
import { buildEndpoint } from '@vyapti/core/custom_api';
import {
    apiSuccess,
    type ApiSuccessResponse,
} from '@vyapti/core/custom_api_response';
import { AUTH_ROUTE_PATHS } from '../auth.config.js';
import {
    API_METHOD_TYPES,
    AUTH_MESSAGES,
    AUTH_TAGS,
    HTTP_STATUS_CODES,
} from '../auth.constants.js';
import type { AuthRequest } from '../guards/auth.guard.js';
import { ApiKeyIdParamsDto } from '../schema/api-key-id-params.schema.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { AUTH_BEARER_DECORATORS } from '../swagger/auth-bearer.decorators.js';
import { requireRequestUser } from '../utils/require-request-user.util.js';

@Controller()
class RevokeApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.DELETE,
        path: AUTH_ROUTE_PATHS.API_KEY_BY_ID,
        tags: AUTH_TAGS,
        responses: {
            [HTTP_STATUS_CODES.OK]: AUTH_MESSAGES.API_KEY_REVOKED,
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
            [HTTP_STATUS_CODES.NOT_FOUND]: AUTH_MESSAGES.API_KEY_NOT_FOUND,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async revokeApiKey(
        @Req() request: AuthRequest,
        @Param() params: ApiKeyIdParamsDto,
    ): Promise<ApiSuccessResponse<null>> {
        await this.apiKeyService.revoke({
            userId: requireRequestUser(request).id,
            apiKeyId: params.apiKeyId,
        });
        return apiSuccess(null, { message: AUTH_MESSAGES.API_KEY_REVOKED });
    }
}

export { RevokeApiKeyController };
