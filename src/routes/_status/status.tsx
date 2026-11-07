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
  // The _status guard already sent a visitor without a session to /login.
  return user === null ? null : <AccountStatusView status={user.status} />
}
