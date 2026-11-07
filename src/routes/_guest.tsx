import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { currentUserQueryOptions, resolveAccessRedirect } from "@/features/auth"

// UX only: a signed-in user leaves /login and /register (R12). Data is protected in server functions.
export const Route = createFileRoute("/_guest")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query(currentUserQueryOptions())
    const to = resolveAccessRedirect("guest", user)
    if (to !== null) throw redirect({ to })
  },
  component: Outlet,
})
