import { AUTH_ERROR } from "@/features/auth/errors"
import type { AuthErrorCode } from "@/features/auth/errors"

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

// One text per code this feature defines; a new code fails typecheck here until it has a text.
export const AUTH_ERROR_TEXT: Record<AuthErrorCode, string> = {
  [AUTH_ERROR.USERNAME_REQUIRED]: "Username wajib diisi",
  [AUTH_ERROR.SESSION_REQUIRED]:
    "Sesi Anda sudah berakhir. Muat ulang halaman untuk masuk lagi.",
  [AUTH_ERROR.NOT_ACTIVE_SUPERADMIN]: "Anda tidak punya akses ke halaman ini.",
  [AUTH_ERROR.ACCOUNT_NOT_FOUND]: "Akun tidak ditemukan. Daftar dimuat ulang.",
  [AUTH_ERROR.CANNOT_CHANGE_SELF]: "Anda tidak bisa mengubah akun sendiri.",
  [AUTH_ERROR.ACCOUNT_STATUS_CHANGED]:
    "Status akun sudah berubah. Daftar dimuat ulang.",
  [AUTH_ERROR.INVALID_STATUS_TRANSITION]:
    "Aksi ini tidak berlaku untuk status akun saat ini.",
}
