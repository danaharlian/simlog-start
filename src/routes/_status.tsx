import { Outlet, createFileRoute } from "@tanstack/react-router"

// The guard (no session → /login, active → /) arrives in T2 with resolveAccessRedirect.
export const Route = createFileRoute("/_status")({
  component: Outlet,
})
