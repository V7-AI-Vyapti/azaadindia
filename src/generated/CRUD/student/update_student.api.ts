import {
    Body,
    Controller,
    Injectable,
    NotFoundException,
    Param,
} from '@nestjs/common';
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

export const UpdateStudentRequestSchema = z
    .object({
        student: z.string(),
    })
    .partial();

export class UpdateStudentRequestDto extends createZodDto(
    UpdateStudentRequestSchema,
) {}

export const StudentIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export class StudentIdParamsDto extends createZodDto(StudentIdParamsSchema) {}

@Injectable()
export class UpdateStudentService {
    async update(id: number, body: UpdateStudentRequestDto) {
        const record = await Student.getByPk(id);
        if (!record || record['deleted_at'] != null) {
            throw new NotFoundException('student not found');
        }
        const parsed = UpdateStudentRequestSchema.parse(body);
        await Student.updateByPk(id, parsed);
        return await Student.getByPk(id);
    }
}

@Controller({
    path: VULCAN_API_CONFIG.path,
    version: VULCAN_API_CONFIG.version,
})
export class UpdateStudentController {
    constructor(private readonly service: UpdateStudentService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.PATCH,
        path: '/student/:id',
        tags: ['student'],
        responses: {
            [HTTP_STATUS_CODES.OK]: 'student updated',
            [HTTP_STATUS_CODES.NOT_FOUND]: 'student not found',
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async updateStudent(
        @Param() params: StudentIdParamsDto,
        @Body() body: UpdateStudentRequestDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        const data = await this.service.update(params.id, body);
        return apiSuccess(data, {
            message: 'student updated',
        });
    }
}
