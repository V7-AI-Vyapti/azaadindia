import { Controller, Injectable, Query } from '@nestjs/common';
import { buildEndpoint } from '@vyapti/core/custom_api';
import {
    apiSuccess,
    type ApiSuccessResponse,
    buildPaginationMeta,
} from '@vyapti/core/custom_api_response';
import { Student } from '@entities/student.entity';
import { API_METHOD_TYPES, HTTP_STATUS_CODES } from '@vulcan/shared/constants';
import { VULCAN_API_CONFIG } from '@vulcan/vulcan.config';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ILike, IsNull } from 'typeorm';
import {
    buildAllowedOrder,
    normalizeSearch,
    resolvePagination,
} from '@vulcan/shared/utils/list-query';
import { AUTH_BEARER_DECORATORS, AUTH_MESSAGES } from '@vyapti/auth';

export const ListStudentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional().nullable(),
    sortBy: z.enum(['student_id', 'student']).default('student_id'),
    sortOrder: z.preprocess(
        (value) => (typeof value === 'string' ? value.toUpperCase() : value),
        z.enum(['ASC', 'DESC']).default('DESC'),
    ),
});

export class ListStudentQueryDto extends createZodDto(ListStudentQuerySchema) {}

const LIST_STUDENT_SORT_COLUMNS = {
    student_id: 'student_id',
    student: 'student',
} as const;

@Injectable()
export class ListStudentService {
    async list(query: ListStudentQueryDto) {
        const pagination = resolvePagination(query);
        const search = normalizeSearch(query.search);
        const where: Record<string, unknown> = {
            deleted_at: IsNull(),
        };
        if (search) {
            where.student = ILike(`%${search}%`);
        }
        const order = buildAllowedOrder({
            columns: LIST_STUDENT_SORT_COLUMNS,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            defaultSortBy: 'student_id',
            defaultSortOrder: 'DESC',
        });
        const [rows, total] = await Promise.all([
            Student.filter(where, {
                order,
                skip: pagination.skip,
                take: pagination.take,
            }),
            Student.countOf(where),
        ]);
        return { items: rows, total, pagination };
    }
}

@Controller({
    path: VULCAN_API_CONFIG.path,
    version: VULCAN_API_CONFIG.version,
})
export class ListStudentController {
    constructor(private readonly service: ListStudentService) {}

    @buildEndpoint({
        method: API_METHOD_TYPES.GET,
        path: '/student',
        tags: ['student'],
        responses: {
            [HTTP_STATUS_CODES.OK]: 'student list fetched',
            [HTTP_STATUS_CODES.UNAUTHORIZED]: AUTH_MESSAGES.UNAUTHORIZED,
        },
        decorators: AUTH_BEARER_DECORATORS,
    })
    async listStudent(
        @Query() query: ListStudentQueryDto,
    ): Promise<ApiSuccessResponse<unknown>> {
        const { items, total, pagination } = await this.service.list(query);
        return apiSuccess(items, {
            message: 'student list fetched',
            meta: buildPaginationMeta(pagination.page, pagination.limit, total),
        });
    }
}
