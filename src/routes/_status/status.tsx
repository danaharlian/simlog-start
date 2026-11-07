import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AccountStatusView, currentUserQueryOptions } from "@/features/auth"

export const Route = createFileRoute("/_status/status")({
  head: () => ({ meta: [{ title: "Status akun" }] }),
  // No staleTime override: the current user must be fresh on every navigation (R21, spec section 7).
  loader: ({ context }) => context.queryClient.query(currentUserQueryOptions()),
  component: StatusPage,
})

function StatusPage() {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  if (!user) return <p className="p-6">Anda belum masuk.</p>
  return <AccountStatusView status={user.status} />
}
