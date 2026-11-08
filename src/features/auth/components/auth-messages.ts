import { AUTH_ERROR } from "@/features/auth/errors"

export type AuthFormErrors = {
  readonly form?: string
  readonly fields: Readonly<
    Record<string, ReadonlyArray<{ readonly message: string }>>
  >
}

const HTTP_TOO_MANY_REQUESTS = 429

const TOO_MANY_ATTEMPTS = "Terlalu banyak percobaan, coba lagi nanti"
const WRONG_CREDENTIALS = "Username/email atau password salah"
const SIGN_IN_FAILED = "Login gagal. Coba lagi."
const SIGN_UP_FAILED = "Pendaftaran gagal. Coba lagi."

// R8: one text for every failed sign-in, whichever field was wrong.
// A malformed email or username on sign-in also gets this text, so the wrong field never shows (R8).
const WRONG_CREDENTIAL_CODES = new Set([
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_USERNAME_OR_PASSWORD",
  "INVALID_EMAIL",
  "INVALID_USERNAME",
])

const SIGN_UP_FIELD_ERRORS: Readonly<
  Record<string, { field: string; message: string }>
> = {
  USER_ALREADY_EXISTS: { field: "email", message: "Email sudah dipakai" },
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
    field: "email",
    message: "Email sudah dipakai",
  },
  USERNAME_IS_ALREADY_TAKEN: {
    field: "username",
    message: "Username sudah dipakai",
  },
  INVALID_USERNAME: { field: "username", message: "Username tidak sah" },
  USERNAME_TOO_SHORT: { field: "username", message: "Username tidak sah" },
  USERNAME_TOO_LONG: { field: "username", message: "Username tidak sah" },
  [AUTH_ERROR.USERNAME_REQUIRED]: {
    field: "username",
    message: "Username wajib diisi",
  },
}

export function signInErrorText(
  code: string | undefined,
  status: number
): string {
  if (status === HTTP_TOO_MANY_REQUESTS) return TOO_MANY_ATTEMPTS
  return code !== undefined && WRONG_CREDENTIAL_CODES.has(code)
    ? WRONG_CREDENTIALS
    : SIGN_IN_FAILED
}

export function signUpFormErrors(
  code: string | undefined,
  status: number
): AuthFormErrors {
  if (status === HTTP_TOO_MANY_REQUESTS)
    return { form: TOO_MANY_ATTEMPTS, fields: {} }
  const fieldError = code === undefined ? undefined : SIGN_UP_FIELD_ERRORS[code]
  if (fieldError === undefined) return { form: SIGN_UP_FAILED, fields: {} }
  return { fields: { [fieldError.field]: [{ message: fieldError.message }] } }
}

// Sign-out text, owned here and passed to the shared AppShell by the layout route (review T3 S2).
export const SIGN_OUT_TEXT = {
  label: "Keluar",
  pending: "Keluar…",
  failed: "Gagal keluar. Coba lagi.",
} as const
