import { buildEntitySchema } from '@vyapti/core';
import { Student } from './student.entity';

export const entitySchemas = [buildEntitySchema(Student)];
