import { Body, Controller, Injectable } from '@nestjs/common';
import { buildEndpoint } from '@vyapti/core/custom_api';
import {
    apiSuccess,
    type ApiSuccessResponse,
} from '@vyapti/core/custom_api_response';
import { Student } from '@entities/student.entity';
import { API_METHOD_TYPES, HTTP_STATUS_CODES } from '@vulcan/shared/constants';
import { VULCAN_API_CONFIG } from '@vulcan/vulcan.config';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AUTH_BEARER_DECORATORS, AUTH_MESSAGES } from '@vyapti/auth';

export const CreateStudentRequestSchema = z.object({
    student: z.string(),
});

export class CreateStudentRequestDto extends createZodDto(
    CreateStudentRequestSchema,
) {}

@Injectable()
export class CreateStudentService {
    async create(body: CreateStudentRequestDto) {
        const parsed = CreateStudentRequestSchema.parse(body);
        return await Student.createOne(parsed);
    }
}

@Controller({
    path: VULCAN_API_CONFIG.path,
    version: VULCAN_API_CONFIG.version,
})
export class CreateStudentController {
    constructor(private readonly service: CreateStudentService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.POST,
        path: '/student',
        tags: ['student'],
        responses: {
            [HTTP_STATUS_CODES.CREATED]: 'student created',
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async createStudent(
        @Body() body: CreateStudentRequestDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        const data = await this.service.create(body);
        return apiSuccess(data, {
            message: 'student created',
        });
    }
}
