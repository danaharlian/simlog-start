import { useSuspenseQuery } from "@tanstack/react-query"
import {
  Outlet,
  createFileRoute,
  redirect,
  useMatches,
  useNavigate,
} from "@tanstack/react-router"
import { HouseIcon, UsersIcon } from "lucide-react"
import { AppShell } from "@/shared/ui/app-shell"
import type { AppShellLabels, AppShellNavItem } from "@/shared/ui/app-shell"
import {
  SIGN_OUT_TEXT,
  currentUserQueryOptions,
  resolveAccessRedirect,
  useSignOut,
} from "@/features/auth"

const APP_NAME = "Simlog"

const HOME_ITEM: AppShellNavItem = {
  label: "Beranda",
  to: "/",
  icon: <HouseIcon />,
}
// Only superadmins see this item (R15, EC11); the server still checks every call (R22).
const USERS_ITEM: AppShellNavItem = {
  label: "Manajemen pengguna",
  to: "/users",
  icon: <UsersIcon />,
}

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
  // The deepest page that names itself sets the header title (staticData.title).
  const title = useMatches({
    select: (matches) =>
      matches.reduce<string | undefined>(
        (found, match) => match.staticData.title ?? found,
        undefined
      ),
  })
  // The _app guard already sent a visitor without an active session elsewhere.
  if (user === null) return null

  return (
    <AppShell
      appName={APP_NAME}
      homeTo="/"
      title={title ?? APP_NAME}
      navItems={
        user.role === "superadmin" ? [HOME_ITEM, USERS_ITEM] : [HOME_ITEM]
      }
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
