import type { Result } from "@/shared/errors"
import type { AccountAction } from "@/features/auth/components/account-row-actions"
import { ACCOUNT_ACTION_TEXT } from "@/features/auth/components/account-labels"
import { AUTH_ERROR_TEXT } from "@/features/auth/components/auth-messages"
import type { AuthError } from "@/features/auth/errors"
import { useChangeAccountRole } from "@/features/auth/hooks/use-change-account-role"
import { useChangeAccountStatus } from "@/features/auth/hooks/use-change-account-status"
import type { AccountRow } from "@/features/auth/schemas"

type ActionState = {
  readonly isError: boolean
  readonly data: Result<AccountRow, AuthError> | undefined
}

// A failed action shows its text in a banner while the list reloads (spec section 8, step 4).
function bannerOf(state: ActionState): string | undefined {
  if (state.isError) return ACCOUNT_ACTION_TEXT.failed
  return state.data?.ok === false
    ? AUTH_ERROR_TEXT[state.data.error.code]
    : undefined
}

// Runs a confirmed row action with the matching mutation, and gives the view one banner and one
// running row for both kinds of change.
export function useAccountActions() {
  const changeStatus = useChangeAccountStatus()
  const changeRole = useChangeAccountRole()

  function runningUserId(): string | undefined {
    if (changeStatus.isPending) return changeStatus.variables.userId
    if (changeRole.isPending) return changeRole.variables.userId
    return undefined
  }

  function reset() {
    changeStatus.reset()
    changeRole.reset()
  }

  // Each change sends the value the superadmin saw, so a change made meanwhile is refused (EC14, EC16).
  function run(action: AccountAction, onSettled: () => void) {
    reset()
    if (action.kind === "status")
      changeStatus.mutate(
        {
          userId: action.row.id,
          expectedStatus: action.row.status,
          nextStatus: action.nextStatus,
        },
        { onSettled }
      )
    else
      changeRole.mutate(
        {
          userId: action.row.id,
          expectedRole: action.row.role,
          nextRole: action.nextRole,
        },
        { onSettled }
      )
  }

  return {
    isPending: changeStatus.isPending || changeRole.isPending,
    runningUserId: runningUserId(),
    banner: bannerOf(changeStatus) ?? bannerOf(changeRole),
    reset,
    run,
  }
}
