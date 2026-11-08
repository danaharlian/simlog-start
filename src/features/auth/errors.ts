// Codes this feature defines, prefixed with the feature name (error-handling.md).
// Better Auth's own codes (USER_ALREADY_EXISTS, INVALID_USERNAME, ...) keep their names.
export const AUTH_ERROR = {
  USERNAME_REQUIRED: "AUTH_USERNAME_REQUIRED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  NOT_ACTIVE_SUPERADMIN: "AUTH_NOT_ACTIVE_SUPERADMIN",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR]
