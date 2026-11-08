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
  actionKey,
  actionText,
  choicesFor,
} from "@/features/auth/components/account-actions"
import type { AccountAction } from "@/features/auth/components/account-actions"
import { ACCOUNT_ACTION_TEXT } from "@/features/auth/components/account-labels"
import type { AccountRow } from "@/features/auth/schemas"

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
                key={actionKey(choice)}
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
