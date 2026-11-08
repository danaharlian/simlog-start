import { useSuspenseQuery } from "@tanstack/react-query"
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { HouseIcon } from "lucide-react"
import { AppShell } from "@/shared/ui/app-shell"
import type { AppShellLabels, AppShellNavItem } from "@/shared/ui/app-shell"
import {
  SIGN_OUT_TEXT,
  currentUserQueryOptions,
  resolveAccessRedirect,
  useSignOut,
} from "@/features/auth"

const APP_NAME = "Simlog"
// TODO(T4): the header title follows the current page once /users exists (review T3 nit 5).
const PAGE_TITLE = "Beranda"

const NAV_ITEMS: ReadonlyArray<AppShellNavItem> = [
  { label: "Beranda", to: "/", icon: <HouseIcon /> },
]

const LABELS: AppShellLabels = {
  navigation: "Menu utama",
  toggleSidebar: "Buka atau tutup sidebar",
  signOut: SIGN_OUT_TEXT.label,
  signingOut: SIGN_OUT_TEXT.pending,
}

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
  const { data: user } = useSuspenseQuery(currentUserQueryOptions())
  const signOut = useSignOut({ onSignedOut: () => navigate({ to: "/login" }) })
  // The _app guard already sent a visitor without an active session elsewhere.
  if (user === null) return null

  return (
    <AppShell
      appName={APP_NAME}
      homeTo="/"
      title={PAGE_TITLE}
      navItems={NAV_ITEMS}
      user={{ name: user.name, username: user.username }}
      labels={LABELS}
      onSignOut={() => signOut.mutate()}
      isSigningOut={signOut.isPending}
      signOutError={
        signOut.data?.ok === false ? SIGN_OUT_TEXT.failed : undefined
      }
    >
      <Outlet />
    </AppShell>
  )
}
