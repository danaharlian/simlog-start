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
