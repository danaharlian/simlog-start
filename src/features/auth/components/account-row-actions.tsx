import { MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import {
  ACCOUNT_ACTION_TEXT,
  ROLE_ACTION_TEXT,
  STATUS_ACTION_TEXT,
} from "@/features/auth/components/account-labels"
import type { ActionText } from "@/features/auth/components/account-labels"
import type {
  AccountRow,
  AccountStatus,
  Role,
  StatusTarget,
} from "@/features/auth/schemas"

export type AccountAction =
  | {
      readonly kind: "status"
      readonly row: AccountRow
      readonly nextStatus: StatusTarget
    }
  | { readonly kind: "role"; readonly row: AccountRow; readonly nextRole: Role }

export function actionText(action: AccountAction): ActionText {
  return action.kind === "status"
    ? STATUS_ACTION_TEXT[action.nextStatus]
    : ROLE_ACTION_TEXT[action.nextRole]
}

// Which choices the menu offers (spec section 8, step 2). The server still decides every
// change against the locked rows (accounts.rules.ts), so this list only shapes the menu.
const OFFERED_STATUSES: Record<AccountStatus, ReadonlyArray<StatusTarget>> = {
  pending: ["active", "rejected"],
  active: ["inactive"],
  rejected: ["active"],
  inactive: ["active"],
}

// The signed-in superadmin's own row offers neither Nonaktifkan nor Cabut superadmin (EC15).
// Role actions appear on active rows only (spec section 8, step 2).
function choicesFor(row: AccountRow, isSelf: boolean): AccountAction[] {
  const statusChoices: AccountAction[] = OFFERED_STATUSES[row.status]
    .filter((next) => !(isSelf && next === "inactive"))
    .map((next) => ({ kind: "status", row, nextStatus: next }))
  if (row.status !== "active" || isSelf) return statusChoices
  const nextRole: Role = row.role === "user" ? "superadmin" : "user"
  return [...statusChoices, { kind: "role", row, nextRole }]
}

type AccountRowActionsProps = {
  readonly row: AccountRow
  readonly isSelf: boolean
  readonly disabled: boolean
  readonly onChoose: (action: AccountAction) => void
}

export function AccountRowActions({
  row,
  isSelf,
  disabled,
  onChoose,
}: AccountRowActionsProps) {
  const choices = choicesFor(row, isSelf)
  if (choices.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={ACCOUNT_ACTION_TEXT.menu(row.username)}
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {choices.map((choice) => {
            const text = actionText(choice)
            return (
              <DropdownMenuItem
                key={text.label}
                variant={text.destructive ? "destructive" : "default"}
                onClick={() => onChoose(choice)}
              >
                {text.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
