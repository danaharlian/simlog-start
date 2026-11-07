import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AccountStatusView, currentUserQueryOptions } from "@/features/auth"

// No loader: the _status guard's beforeLoad already filled the cache, so the user is read once (review T2 S10).
export const Route = createFileRoute("/_status/status")({
  head: () => ({ meta: [{ title: "Status akun" }] }),
  component: StatusPage,
})

function StatusPage() {
  const navigate = useNavigate()
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  // The _status guard already sent a visitor without a session to /login.
  if (user === null) return null
  return (
    <AccountStatusView
      status={user.status}
      onSignedOut={() => navigate({ to: "/login" })}
    />
  )
}
