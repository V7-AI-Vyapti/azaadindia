import type { AuthUserRecord } from '@vyapti/auth';
import {
    readBoolean,
    readNumber,
    readString,
} from '@vulcan/shared/utils/record-readers';
import { readNullableString } from './read-nullable-string.util';

function mapAuthUserRecord(row: unknown): AuthUserRecord {
    return {
        id: String(readNumber(row, 'user_id')),
        email: readString(row, 'email'),
        passwordHash: readString(row, 'password_hash'),
        displayName: readNullableString(row, 'display_name'),
        isActive: readBoolean(row, 'is_active'),
    };
}

export { mapAuthUserRecord };
