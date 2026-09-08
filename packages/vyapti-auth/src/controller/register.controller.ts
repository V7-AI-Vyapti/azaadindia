import { Body, Controller, Req, Res } from '@nestjs/common';
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
import { Public } from '../guards/public.decorator.js';
import { RegisterRequestDto } from '../schema/register.schema.js';
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
class RegisterController {
    constructor(
        private readonly authSessionService: AuthSessionService,
        private readonly refreshCookieService: RefreshCookieService,
    ) {}

    @Public()
    @buildEndpoint({
        method: API_METHOD_TYPES.POST,
        path: AUTH_ROUTE_PATHS.REGISTER,
        tags: AUTH_TAGS,
        responses: {
            [HTTP_STATUS_CODES.OK]: AUTH_MESSAGES.REGISTERED,
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
            [HTTP_STATUS_CODES.NOT_FOUND]: AUTH_MESSAGES.REGISTER_DISABLED,
            [HTTP_STATUS_CODES.CONFLICT]: AUTH_MESSAGES.EMAIL_TAKEN,
        },
    })
    async register(
        @Body() payload: RegisterRequestDto,
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: CookieResponse,
    ): Promise<ApiSuccessResponse<LoginResponse>> {
        const session = await this.authSessionService.register({
            email: payload.email,
            password: payload.password,
            displayName: payload.display_name,
            actor: request.user ?? null,
        });
        this.refreshCookieService.set(response, session.refreshToken);
        return apiSuccess(serializeLogin(session), {
            message: AUTH_MESSAGES.REGISTERED,
        });
    }
}

export { RegisterController };
