import { CustomTypeormEntityBase, CustomTypeormFields } from '@vyapti/core';
export class Student extends CustomTypeormEntityBase {
    static tableName = 'student';
    student_id = CustomTypeormFields.AutoPK({ db_column: 'student_id' });
    student = CustomTypeormFields.CharacterString({ db_column: 'student' });
    deleted_at = CustomTypeormFields.Integer({
        db_column: 'deleted_at',
        null: true,
    });
}
