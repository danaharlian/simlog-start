import { createFileRoute, useNavigate } from "@tanstack/react-router"
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
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...accountsQueryOptions(deps),
      staleTime: "static",
    }),
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
