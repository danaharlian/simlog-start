import type { AccountStatus, Role } from "@/features/auth/schemas"

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

export type RoleChangeDecision =
  | { readonly kind: "apply" }
  | {
      readonly kind: "reject"
      readonly reason: "self" | "changed" | "target_not_active"
    }

type RoleChangeFacts = {
  readonly actorId: string
  readonly targetId: string
  readonly targetStatus: AccountStatus
  readonly currentRole: Role
  readonly expectedRole: Role
  readonly nextRole: Role
}

// Pure: the service reads the target's role and status from the rows it locked (spec section 4).
// The actor stays an active superadmin and never acts on themselves, so the last active
// superadmin cannot be removed (R20).
export function decideRoleChange(facts: RoleChangeFacts): RoleChangeDecision {
  if (facts.actorId === facts.targetId)
    return { kind: "reject", reason: "self" }
  // The schema refuses nextRole === expectedRole; a caller that skipped it is treated as stale.
  if (
    facts.currentRole !== facts.expectedRole ||
    facts.nextRole === facts.currentRole
  )
    return { kind: "reject", reason: "changed" }
  if (facts.nextRole === "superadmin" && facts.targetStatus !== "active")
    return { kind: "reject", reason: "target_not_active" }
  return { kind: "apply" }
}
