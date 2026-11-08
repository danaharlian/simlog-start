import type { AccountStatus, Role, StatusTarget } from "@/features/auth/schemas"

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

export type ActionText = {
  readonly label: string
  readonly title: string
  readonly description: string
  readonly destructive: boolean
}

export const STATUS_ACTION_TEXT: Record<StatusTarget, ActionText> = {
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

// Keyed by the role the account gets.
export const ROLE_ACTION_TEXT: Record<Role, ActionText> = {
  superadmin: {
    label: "Jadikan superadmin",
    title: "Jadikan superadmin?",
    description:
      "Pemilik akun bisa mengelola semua akun, termasuk superadmin lain.",
    destructive: false,
  },
  user: {
    label: "Cabut superadmin",
    title: "Cabut superadmin?",
    description:
      "Pemilik akun kembali menjadi pengguna biasa dan kehilangan akses ke Manajemen pengguna.",
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
