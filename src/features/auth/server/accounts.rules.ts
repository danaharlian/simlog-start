import type { AccountStatus } from "@/features/auth/schemas"

// Which status a superadmin may move an account to (PRD R17, R18). A lookup table, so a new status
// fails typecheck here until its transitions are written (coding-standards.md, ADR 0013).
const STATUS_TRANSITIONS = {
  pending: ["active", "rejected"],
  active: ["inactive"],
  rejected: ["active"],
  inactive: ["active"],
} as const satisfies Record<AccountStatus, ReadonlyArray<AccountStatus>>

export type StatusChangeDecision =
  | { readonly kind: "apply" }
  | {
      readonly kind: "reject"
      readonly reason: "self" | "changed" | "invalid_transition"
    }

type StatusChangeFacts = {
  readonly actorId: string
  readonly targetId: string
  readonly currentStatus: AccountStatus
  readonly expectedStatus: AccountStatus
  readonly nextStatus: AccountStatus
}

// Pure: the service reads `currentStatus` from the row it locked, then writes only on "apply".
export function decideStatusChange(
  facts: StatusChangeFacts
): StatusChangeDecision {
  if (facts.actorId === facts.targetId)
    return { kind: "reject", reason: "self" }
  if (facts.currentStatus !== facts.expectedStatus)
    return { kind: "reject", reason: "changed" }
  const allowed: ReadonlyArray<AccountStatus> =
    STATUS_TRANSITIONS[facts.currentStatus]
  return allowed.includes(facts.nextStatus)
    ? { kind: "apply" }
    : { kind: "reject", reason: "invalid_transition" }
}
