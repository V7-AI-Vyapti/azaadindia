import type { AuthUserPrincipal } from '../types/auth.types.js';

type UserResponse = {
    id: string;
    email: string;
    display_name: string | null;
};

function serializeUser(principal: AuthUserPrincipal): UserResponse {
    return {
        id: principal.id,
        email: principal.email,
        display_name: principal.displayName,
    };
}

export { serializeUser };
export type { UserResponse };
