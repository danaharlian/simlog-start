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
  STATUS_ACTION_TEXT,
} from "@/features/auth/components/account-labels"
import type {
  AccountRow,
  AccountStatus,
  StatusTarget,
} from "@/features/auth/schemas"

export type AccountAction = {
  readonly row: AccountRow
  readonly nextStatus: StatusTarget
}

// Which choices the menu offers (spec section 8, step 2). The server still decides every
// change against the locked row (accounts.rules.ts), so this list only shapes the menu.
const OFFERED: Record<AccountStatus, ReadonlyArray<StatusTarget>> = {
  pending: ["active", "rejected"],
  active: ["inactive"],
  rejected: ["active"],
  inactive: ["active"],
}

type AccountRowActionsProps = {
  readonly row: AccountRow
  // The signed-in superadmin's own row never offers Nonaktifkan (EC15).
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
  const choices = OFFERED[row.status].filter(
    (next) => !(isSelf && next === "inactive")
  )
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
          {choices.map((next) => (
            <DropdownMenuItem
              key={next}
              variant={
                STATUS_ACTION_TEXT[next].destructive ? "destructive" : "default"
              }
              onClick={() => onChoose({ row, nextStatus: next })}
            >
              {STATUS_ACTION_TEXT[next].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
