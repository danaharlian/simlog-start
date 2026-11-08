import type { AppError } from "@/shared/errors"

// Codes this feature defines, prefixed with the feature name (error-handling.md).
// Better Auth's own codes (USER_ALREADY_EXISTS, INVALID_USERNAME, ...) keep their names.
export const AUTH_ERROR = {
  USERNAME_REQUIRED: "AUTH_USERNAME_REQUIRED",
  SESSION_REQUIRED: "AUTH_REQUIRED",
  NOT_ACTIVE_SUPERADMIN: "AUTH_NOT_ACTIVE_SUPERADMIN",
  ACCOUNT_NOT_FOUND: "AUTH_ACCOUNT_NOT_FOUND",
  CANNOT_CHANGE_SELF: "AUTH_CANNOT_CHANGE_SELF",
  ACCOUNT_STATUS_CHANGED: "AUTH_ACCOUNT_STATUS_CHANGED",
  INVALID_STATUS_TRANSITION: "AUTH_INVALID_STATUS_TRANSITION",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR]
export type AuthError = AppError<AuthErrorCode>
