import { useSuspenseQuery } from "@tanstack/react-query"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { ACCOUNT_STATUS_LABEL } from "@/features/auth/components/account-labels"
import { AUTH_ERROR_TEXT } from "@/features/auth/components/auth-messages"
import { AccountsTable } from "@/features/auth/components/accounts-table"
import { accountsQueryOptions } from "@/features/auth/queries"
import { accountStatusSchema, accountStatuses } from "@/features/auth/schemas"
import type { ListAccountsInput } from "@/features/auth/schemas"

const ALL_STATUSES = "all"

function emptyText(
  search: ListAccountsInput,
  page: number,
  totalPages: number
): string {
  if (page > totalPages) return "Halaman ini kosong. Kembali ke halaman 1."
  return search.status === undefined
    ? "Belum ada akun."
    : "Tidak ada akun dengan status ini."
}
const STATUS_FILTER_ITEMS: Record<string, string> = {
  [ALL_STATUSES]: "Semua status",
  ...ACCOUNT_STATUS_LABEL,
}

type UserManagementViewProps = {
  readonly search: ListAccountsInput
  // The route owns the URL: filter and page live in search params (spec section 8, state location).
  readonly onSearchChange: (next: ListAccountsInput) => void
}

export function UserManagementView({
  search,
  onSearchChange,
}: UserManagementViewProps) {
  const { data: result } = useSuspenseQuery(accountsQueryOptions(search))

  if (!result.ok) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {AUTH_ERROR_TEXT[result.error.code]}
        </AlertDescription>
      </Alert>
    )
  }

  const { items, page, pageSize, total } = result.data
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span id="status-filter-label" className="text-sm font-medium">
          Status
        </span>
        <Select
          items={STATUS_FILTER_ITEMS}
          value={search.status ?? ALL_STATUSES}
          onValueChange={(value) => {
            const status = accountStatusSchema.safeParse(value)
            onSearchChange({
              ...search,
              page: 1,
              status: status.success ? status.data : undefined,
            })
          }}
        >
          <SelectTrigger
            className="w-full sm:w-48"
            aria-labelledby="status-filter-label"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>
              {STATUS_FILTER_ITEMS[ALL_STATUSES]}
            </SelectItem>
            {accountStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {ACCOUNT_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {emptyText(search, page, totalPages)}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <AccountsTable rows={items} />
        </div>
      )}

      <nav
        aria-label="Halaman daftar akun"
        className="flex items-center justify-between gap-2"
      >
        <span className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onSearchChange({ ...search, page: page - 1 })}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onSearchChange({ ...search, page: page + 1 })}
          >
            Berikutnya
          </Button>
        </div>
      </nav>
    </div>
  )
}
