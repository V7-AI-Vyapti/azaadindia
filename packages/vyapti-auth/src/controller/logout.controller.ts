import { Controller, Req, Res } from '@nestjs/common';
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
import { AUTH_BEARER_DECORATORS } from '../swagger/auth-bearer.decorators.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import { RefreshCookieService } from '../services/refresh-cookie.service.js';

type CookieResponse = {
    setHeader(name: string, value: string): void;
};

@Controller()
class LogoutController {
    constructor(
        private readonly authSessionService: AuthSessionService,
        private readonly refreshCookieService: RefreshCookieService,
    ) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.POST,
        path: AUTH_ROUTE_PATHS.LOGOUT,
        tags: AUTH_TAGS,
        responses: {
            [HTTP_STATUS_CODES.OK]: AUTH_MESSAGES.LOGGED_OUT,
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async logout(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: CookieResponse,
    ): Promise<ApiSuccessResponse<null>> {
        await this.authSessionService.logout({
            refreshToken: this.refreshCookieService.read(request.headers),
        });
        this.refreshCookieService.clear(response);
        return apiSuccess(null, { message: AUTH_MESSAGES.LOGGED_OUT });
    }
}

export { LogoutController };
