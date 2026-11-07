import type { AccountStatus } from "@/features/auth/schemas"

const STATUS_TEXT: Record<
  AccountStatus,
  { title: string; description: string }
> = {
  pending: {
    title: "Menunggu persetujuan",
    description: "Akun Anda menunggu persetujuan superadmin.",
  },
  active: { title: "Aktif", description: "Akun Anda sudah aktif." },
  rejected: { title: "Ditolak", description: "Pendaftaran Anda ditolak." },
  inactive: { title: "Nonaktif", description: "Akun Anda dinonaktifkan." },
}

export function AccountStatusView({ status }: { status: AccountStatus }) {
  const text = STATUS_TEXT[status]
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-2 p-6">
      <h1 className="text-2xl font-semibold">Status akun: {text.title}</h1>
      <p className="text-muted-foreground">{text.description}</p>
    </main>
  )
}
