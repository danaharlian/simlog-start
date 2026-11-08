import {
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

// Pure helpers for the row actions; the menu, the dialog, and useAccountActions share them
// (components.md: pure helpers below hooks and components; review T6 S1).

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

// A stable identity for a choice, independent of its text (review T6 N3).
export function actionKey(action: AccountAction): string {
  return action.kind === "status"
    ? `status:${action.nextStatus}`
    : `role:${action.nextRole}`
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
export function choicesFor(
  row: AccountRow,
  isSelf: boolean
): ReadonlyArray<AccountAction> {
  const statusChoices: AccountAction[] = OFFERED_STATUSES[row.status]
    .filter((next) => !(isSelf && next === "inactive"))
    .map((next) => ({ kind: "status", row, nextStatus: next }))
  if (row.status !== "active" || isSelf) return statusChoices
  const nextRole: Role = row.role === "user" ? "superadmin" : "user"
  return [...statusChoices, { kind: "role", row, nextRole }]
}
