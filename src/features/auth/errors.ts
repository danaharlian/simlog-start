// Codes this feature defines. Better Auth's own codes (USER_ALREADY_EXISTS, INVALID_USERNAME, ...) keep their names.
export const AUTH_ERROR = {
  USERNAME_REQUIRED: "AUTH_USERNAME_REQUIRED",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR]
