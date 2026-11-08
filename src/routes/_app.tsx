import { useSuspenseQuery } from "@tanstack/react-query"
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { HouseIcon } from "lucide-react"
import { AppShell } from "@/shared/ui/app-shell"
import type { AppShellNavItem } from "@/shared/ui/app-shell"
import {
  currentUserQueryOptions,
  resolveAccessRedirect,
  useSignOut,
} from "@/features/auth"

const APP_NAME = "Simlog"

// UX only: no session → /login (R11, EC9), not active → /status (R13, EC10). Data is protected in server functions.
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query(currentUserQueryOptions())
    const to = resolveAccessRedirect("app", user)
    if (to !== null) throw redirect({ to })
  },
  component: AppLayout,
})

function AppLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  const signOut = useSignOut({ onSignedOut: () => navigate({ to: "/login" }) })
  // The _app guard already sent a visitor without an active session elsewhere.
  if (user === null) return null

  const navItems: ReadonlyArray<AppShellNavItem> = [
    {
      label: "Beranda",
      to: "/",
      icon: <HouseIcon />,
      isActive: pathname === "/",
    },
  ]

  return (
    <AppShell
      appName={APP_NAME}
      title="Beranda"
      navItems={navItems}
      user={{ name: user.name, username: user.username }}
      onSignOut={() => signOut.mutate()}
      signOutPending={signOut.isPending}
      signOutFailed={signOut.data?.ok === false}
    >
      <Outlet />
    </AppShell>
  )
}
