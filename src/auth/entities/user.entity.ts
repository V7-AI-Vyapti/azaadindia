import { CustomTypeormEntityBase, CustomTypeormFields } from '@vyapti/core';

export class User extends CustomTypeormEntityBase {
    static tableName = 'user';
    user_id = CustomTypeormFields.AutoPK({ db_column: 'user_id' });
    email = CustomTypeormFields.CharacterString({
        db_column: 'email',
        null: false,
        blank: false,
        max_length: 255,
        unique: true,
    });
    password_hash = CustomTypeormFields.CharacterString({
        db_column: 'password_hash',
        null: false,
        blank: false,
        max_length: 255,
    });
    display_name = CustomTypeormFields.CharacterString({
        db_column: 'display_name',
        null: true,
        blank: true,
        max_length: 200,
    });
    is_active = CustomTypeormFields.Boolean({
        db_column: 'is_active',
        null: false,
        blank: false,
        default: true,
    });
}
