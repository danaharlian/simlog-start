import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { currentUserQueryOptions, resolveAccessRedirect } from "@/features/auth"

// UX only: no session → /login (R11), active → / (R14). Data is protected in server functions.
export const Route = createFileRoute("/_status")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query(currentUserQueryOptions())
    const to = resolveAccessRedirect("status", user)
    if (to !== null) throw redirect({ to })
  },
  component: Outlet,
})
