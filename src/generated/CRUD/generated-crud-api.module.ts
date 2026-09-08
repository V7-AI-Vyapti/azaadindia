import { Module } from '@nestjs/common';
import {
    CreateStudentController,
    CreateStudentService,
} from '@generated-crud/student/create_student.api';
import {
    DeleteStudentController,
    DeleteStudentService,
} from '@generated-crud/student/delete_student.api';
import {
    ListStudentController,
    ListStudentService,
} from '@generated-crud/student/list_student.api';
import {
    UpdateStudentController,
    UpdateStudentService,
} from '@generated-crud/student/update_student.api';
import {
    ViewStudentController,
    ViewStudentService,
} from '@generated-crud/student/view_student.api';

@Module({
    controllers: [
        CreateStudentController,
        DeleteStudentController,
        ListStudentController,
        UpdateStudentController,
        ViewStudentController,
    ],
    providers: [
        CreateStudentService,
        DeleteStudentService,
        ListStudentService,
        UpdateStudentService,
        ViewStudentService,
    ],
})
export class GeneratedCrudApiModule {}
