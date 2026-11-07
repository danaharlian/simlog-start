export const AUTH_ERROR = {
  USERNAME_REQUIRED: "USERNAME_REQUIRED",
} as const

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR]
