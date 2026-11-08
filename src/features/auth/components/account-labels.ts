import type { AccountStatus, Role } from "@/features/auth/schemas"

// Indonesian labels for the account list; one owner for the words the UI shows.
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  pending: "Menunggu",
  active: "Aktif",
  rejected: "Ditolak",
  inactive: "Nonaktif",
}

export const ROLE_LABEL: Record<Role, string> = {
  user: "Pengguna",
  superadmin: "Superadmin",
}
