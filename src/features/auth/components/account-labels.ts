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

// A status a superadmin can move an account to; no action leads back to pending (spec section 8).
export type StatusTarget = Exclude<AccountStatus, "pending">

type StatusActionText = {
  readonly label: string
  readonly title: string
  readonly description: string
  readonly destructive: boolean
}

export const STATUS_ACTION_TEXT: Record<StatusTarget, StatusActionText> = {
  active: {
    label: "Aktifkan",
    title: "Aktifkan akun ini?",
    description: "Pemilik akun bisa masuk ke aplikasi.",
    destructive: false,
  },
  rejected: {
    label: "Tolak",
    title: "Tolak pendaftaran ini?",
    description: "Pemilik akun tidak bisa masuk sampai akunnya diaktifkan.",
    destructive: true,
  },
  inactive: {
    label: "Nonaktifkan",
    title: "Nonaktifkan akun ini?",
    description:
      "Pemilik akun kehilangan akses pada request berikutnya, tanpa perlu keluar.",
    destructive: true,
  },
}

export const ACCOUNT_ACTION_TEXT = {
  column: "Aksi",
  menu: (username: string) => `Aksi untuk @${username}`,
  cancel: "Batal",
  pending: "Memproses…",
  failed: "Aksi gagal. Coba lagi.",
} as const
