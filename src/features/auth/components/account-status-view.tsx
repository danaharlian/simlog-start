import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { useSignOut } from "@/features/auth/hooks/use-sign-out"
import { authKeys } from "@/features/auth/queries"
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

export function AccountStatusView({
  status,
}: {
  readonly status: AccountStatus
}) {
  const text = STATUS_TEXT[status]
  const signOut = useSignOut()
  const queryClient = useQueryClient()
  const router = useRouter()

  // "Periksa lagi" re-reads the user; the route guard then moves an activated user to / (EC12).
  async function checkAgain() {
    await queryClient.invalidateQueries({ queryKey: authKeys.currentUser() })
    await router.invalidate()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Status akun: {text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkAgain()}
          >
            Periksa lagi
          </Button>
          <Button
            type="button"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            {signOut.isPending ? "Keluar…" : "Keluar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
