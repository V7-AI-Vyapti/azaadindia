import { Body, Controller, Req } from '@nestjs/common';
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
import { IssueApiKeyRequestDto } from '../schema/issue-api-key.schema.js';
import {
    serializeIssuedApiKey,
    type IssuedApiKeyResponse,
} from '../serializers/api-key.serializer.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { AUTH_BEARER_DECORATORS } from '../swagger/auth-bearer.decorators.js';
import { requireRequestUser } from '../utils/require-request-user.util.js';

@Controller()
class IssueApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.POST,
        path: AUTH_ROUTE_PATHS.API_KEYS,
        tags: AUTH_TAGS,
        responses: {
            [HTTP_STATUS_CODES.OK]: AUTH_MESSAGES.API_KEY_ISSUED,
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
            [HTTP_STATUS_CODES.NOT_FOUND]: AUTH_MESSAGES.API_KEY_AUTH_DISABLED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async issueApiKey(
        @Req() request: AuthRequest,
        @Body() payload: IssueApiKeyRequestDto,
    ): Promise<ApiSuccessResponse<IssuedApiKeyResponse>> {
        const issued = await this.apiKeyService.issue({
            userId: requireRequestUser(request).id,
            name: payload.name,
        });
        return apiSuccess(serializeIssuedApiKey(issued), {
            message: AUTH_MESSAGES.API_KEY_ISSUED,
        });
    }
}

export { IssueApiKeyController };
