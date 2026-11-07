import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/shared/ui/card"
import { FormBanner } from "@/features/auth/components/form-banner"
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

const SIGN_OUT_FAILED = "Gagal keluar. Coba lagi."
const CHECK_FAILED = "Status tidak bisa diperiksa. Coba lagi."

type AccountStatusViewProps = {
  readonly status: AccountStatus
  readonly onSignedOut: () => Promise<void> | void
}

export function AccountStatusView({
  status,
  onSignedOut,
}: AccountStatusViewProps) {
  const text = STATUS_TEXT[status]
  const signOut = useSignOut({ onSignedOut })
  const queryClient = useQueryClient()
  const router = useRouter()
  const [checkFailed, setCheckFailed] = useState(false)

  // "Periksa lagi" re-reads the user; the route guard then moves an activated user to / (EC12).
  async function checkAgain() {
    setCheckFailed(false)
    try {
      await queryClient.invalidateQueries({ queryKey: authKeys.currentUser() })
      await router.invalidate()
    } catch {
      setCheckFailed(true)
    }
  }

  const signOutFailed = signOut.data?.ok === false
  const error = signOutFailed
    ? SIGN_OUT_FAILED
    : checkFailed
      ? CHECK_FAILED
      : undefined

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="font-heading text-base leading-snug font-medium">
            Status akun: {text.title}
          </h1>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormBanner message={error} />
          <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
