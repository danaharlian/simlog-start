import { z } from "zod"

export const accountStatuses = [
  "pending",
  "active",
  "rejected",
  "inactive",
] as const
export const accountStatusSchema = z.enum(accountStatuses)
export type AccountStatus = z.infer<typeof accountStatusSchema>

export const roles = ["user", "superadmin"] as const
export const roleSchema = z.enum(roles)
export type Role = z.infer<typeof roleSchema>

export const currentUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  username: z.string(),
  status: accountStatusSchema,
  role: roleSchema,
})
export type CurrentUser = z.infer<typeof currentUserSchema>

// Limits match the username plugin defaults (ADR 0039) and Better Auth's password defaults (PRD R2, R4).
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const NAME_MAX_LENGTH = 100
const EMAIL_MAX_LENGTH = 254
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH, "Username minimal 3 karakter")
  .max(USERNAME_MAX_LENGTH, "Username maksimal 30 karakter")
  .regex(USERNAME_PATTERN, "Hanya huruf, angka, garis bawah, dan titik")

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password minimal 8 karakter")
  .max(PASSWORD_MAX_LENGTH, "Password maksimal 128 karakter")

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi")
      .max(NAME_MAX_LENGTH, "Nama maksimal 100 karakter"),
    username: usernameSchema,
    email: z
      .string()
      .trim()
      .max(EMAIL_MAX_LENGTH, "Email terlalu panjang")
      .pipe(z.email("Email tidak sah")),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .max(PASSWORD_MAX_LENGTH, "Password maksimal 128 karakter"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  })
export type RegisterInput = z.infer<typeof registerSchema>
export type RegisterFormValues = z.input<typeof registerSchema>

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username atau email wajib diisi")
    .max(EMAIL_MAX_LENGTH, "Username atau email terlalu panjang"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(PASSWORD_MAX_LENGTH, "Password maksimal 128 karakter"),
})
export type LoginInput = z.infer<typeof loginSchema>
export type LoginFormValues = z.input<typeof loginSchema>
