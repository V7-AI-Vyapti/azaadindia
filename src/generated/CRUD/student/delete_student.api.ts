import {
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

export const StudentIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export class StudentIdParamsDto extends createZodDto(StudentIdParamsSchema) {}

@Injectable()
export class DeleteStudentService {
    async remove(id: number) {
        const record = await Student.getByPk(id);
        if (!record || record['deleted_at'] != null) {
            throw new NotFoundException('student not found');
        }
        await Student.updateByPk(id, {
            deleted_at: Date.now(),
        });
        return { deleted: true };
    }
}

@Controller({
    path: VULCAN_API_CONFIG.path,
    version: VULCAN_API_CONFIG.version,
})
export class DeleteStudentController {
    constructor(private readonly service: DeleteStudentService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.DELETE,
        path: '/student/:id',
        tags: ['student'],
        responses: {
            [HTTP_STATUS_CODES.OK]: 'student deleted',
            [HTTP_STATUS_CODES.NOT_FOUND]: 'student not found',
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async deleteStudent(
        @Param() params: StudentIdParamsDto,
    ): Promise<ApiSuccessResponse<{ deleted: boolean }>> {
        const data = await this.service.remove(params.id);
        return apiSuccess(data, {
            message: 'student deleted',
        });
    }
}
