import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import {
  ACCOUNT_ACTION_TEXT,
  ACCOUNT_STATUS_LABEL,
} from "@/features/auth/components/account-labels"
import { AccountRowActions } from "@/features/auth/components/account-row-actions"
import type { AccountAction } from "@/features/auth/components/account-row-actions"
import { AUTH_ERROR_TEXT } from "@/features/auth/components/auth-messages"
import { AccountsTable } from "@/features/auth/components/accounts-table"
import { ConfirmAccountActionDialog } from "@/features/auth/components/confirm-account-action-dialog"
import { useChangeAccountStatus } from "@/features/auth/hooks/use-change-account-status"
import {
  accountsQueryOptions,
  currentUserQueryOptions,
} from "@/features/auth/queries"
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

type ChangeStatusState = ReturnType<typeof useChangeAccountStatus>

// A failed action shows its text in a banner while the list reloads (spec section 8, step 4).
function actionBanner(changeStatus: ChangeStatusState): string | undefined {
  if (changeStatus.isError) return ACCOUNT_ACTION_TEXT.failed
  return changeStatus.data?.ok === false
    ? AUTH_ERROR_TEXT[changeStatus.data.error.code]
    : undefined
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
  const { data: currentUser } = useSuspenseQuery(currentUserQueryOptions())
  const changeStatus = useChangeAccountStatus()
  // The action waiting for confirmation is temporary UI state (spec section 8, state location).
  const [chosen, setChosen] = useState<AccountAction | null>(null)

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
  const banner = actionBanner(changeStatus)

  function confirm(action: AccountAction) {
    changeStatus.mutate(
      {
        userId: action.row.id,
        // The status the superadmin saw; the server refuses if it changed meanwhile (EC14).
        expectedStatus: action.row.status,
        nextStatus: action.nextStatus,
      },
      { onSettled: () => setChosen(null) }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {banner === undefined ? null : (
        <Alert variant="destructive">
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      )}
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
          <AccountsTable
            rows={items}
            actions={(row) => (
              <AccountRowActions
                row={row}
                isSelf={row.id === currentUser?.id}
                disabled={
                  changeStatus.isPending &&
                  changeStatus.variables.userId === row.id
                }
                onChoose={setChosen}
              />
            )}
          />
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

      {chosen === null ? null : (
        <ConfirmAccountActionDialog
          action={chosen}
          isPending={changeStatus.isPending}
          onConfirm={confirm}
          onDismiss={() => setChosen(null)}
        />
      )}
    </div>
  )
}
