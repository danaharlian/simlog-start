import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { ACCOUNT_ACTION_TEXT } from "@/features/auth/components/account-labels"
import { actionText } from "@/features/auth/components/account-row-actions"
import type { AccountAction } from "@/features/auth/components/account-row-actions"

type ConfirmAccountActionDialogProps = {
  readonly action: AccountAction
  readonly isPending: boolean
  readonly onConfirm: (action: AccountAction) => void
  readonly onDismiss: () => void
}

// Mounted only while an action waits for confirmation, so it is always open (spec section 8, step 3).
export function ConfirmAccountActionDialog({
  action,
  isPending,
  onConfirm,
  onDismiss,
}: ConfirmAccountActionDialogProps) {
  const text = actionText(action)
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !isPending) onDismiss()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {action.row.name} (@{action.row.username}). {text.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {ACCOUNT_ACTION_TEXT.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={text.destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={() => onConfirm(action)}
          >
            {isPending ? ACCOUNT_ACTION_TEXT.pending : text.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
