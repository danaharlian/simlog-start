import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Skeleton } from "@/shared/ui/skeleton"
import {
  UserManagementView,
  accountsQueryOptions,
  listAccountsInputSchema,
} from "@/features/auth"

const SKELETON_ROWS = ["a", "b", "c", "d", "e"]

export const Route = createFileRoute("/_app/users")({
  staticData: { title: "Manajemen pengguna" },
  head: () => ({ meta: [{ title: "Manajemen pengguna" }] }),
  validateSearch: listAccountsInputSchema,
  loaderDeps: ({ search }) => search,
  // No staleTime override: a demoted superadmin must not see a cached list (R21, R22, EC17; review T4 S5).
  loader: async ({ context, deps }) => {
    const result = await context.queryClient.query(accountsQueryOptions(deps))
    // A session that ended goes to sign-in (EC19); every other refusal is shown on the page.
    if (!result.ok && result.error.code === "AUTH_REQUIRED")
      throw redirect({ to: "/login" })
  },
  pendingComponent: AccountsSkeleton,
  component: UsersPage,
})

function UsersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <UserManagementView
      search={search}
      onSearchChange={(next) => void navigate({ search: next })}
    />
  )
}

function AccountsSkeleton() {
  return (
    <div
      className="flex flex-col gap-2"
      aria-busy="true"
      aria-label="Memuat daftar akun"
    >
      {SKELETON_ROWS.map((key) => (
        <Skeleton key={key} className="h-10 w-full" />
      ))}
    </div>
  )
}
