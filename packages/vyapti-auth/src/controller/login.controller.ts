import { Body, Controller, Res } from '@nestjs/common';
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
import { Public } from '../guards/public.decorator.js';
import { LoginRequestDto } from '../schema/login.schema.js';
import {
    serializeLogin,
    type LoginResponse,
} from '../serializers/login.serializer.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import { RefreshCookieService } from '../services/refresh-cookie.service.js';

type CookieResponse = {
    setHeader(name: string, value: string): void;
};

@Controller()
class LoginController {
    constructor(
        private readonly authSessionService: AuthSessionService,
        private readonly refreshCookieService: RefreshCookieService,
    ) {}

    @Public()
    @buildEndpoint({
        method: API_METHOD_TYPES.POST,
        path: AUTH_ROUTE_PATHS.LOGIN,
        tags: AUTH_TAGS,
        responses: {
            [HTTP_STATUS_CODES.OK]: AUTH_MESSAGES.LOGGED_IN,
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.INVALID_CREDENTIALS,
        },
    })
    async login(
        @Body() payload: LoginRequestDto,
        @Res({ passthrough: true }) response: CookieResponse,
    ): Promise<ApiSuccessResponse<LoginResponse>> {
        const session = await this.authSessionService.login({
            email: payload.email,
            password: payload.password,
        });
        this.refreshCookieService.set(response, session.refreshToken);
        return apiSuccess(serializeLogin(session), {
            message: AUTH_MESSAGES.LOGGED_IN,
        });
    }
}

export { LoginController };
