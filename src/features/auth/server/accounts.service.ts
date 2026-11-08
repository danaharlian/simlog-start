import { db } from "@/shared/db/client"
import type { Tx } from "@/shared/db/client"
import { appError, err, ok } from "@/shared/errors"
import type { Result } from "@/shared/errors"
import { ACCOUNTS_PAGE_SIZE } from "@/features/auth/schemas"
import type {
  AccountRow,
  AccountStatus,
  AccountsPage,
  ChangeAccountRoleInput,
  ChangeAccountStatusInput,
  CurrentUser,
  ListAccountsInput,
  Role,
} from "@/features/auth/schemas"
import { z } from "zod"
import { logger } from "@/shared/server/logger.server"
import { AUTH_ERROR } from "@/features/auth/errors"
import type { AuthError } from "@/features/auth/errors"
import {
  findAccountAccess,
  findCurrentUser,
  listAccounts,
  lockAccountsForChange,
  updateAccountRole,
  updateAccountStatus,
} from "@/features/auth/server/accounts.repository"
import {
  decideRoleChange,
  decideStatusChange,
} from "@/features/auth/server/accounts.rules"

// Reads the row on every call, so a status change applies on the user's next request (R21, D10).
export async function getCurrentUserDto(
  userId: string
): Promise<CurrentUser | null> {
  const row = await findCurrentUser(db, userId)
  return row ?? null
}

// The proof that authorization passed. Only `authorizeActiveSuperadmin` can make one (a Zod brand,
// no cast), and every superadmin service takes it, so a handler that skips the check does not
// type-check (review T4 S1).
const activeSuperadminSchema = z
  .object({ actorId: z.uuid() })
  .brand<"ActiveSuperadmin">()
export type ActiveSuperadmin = z.infer<typeof activeSuperadminSchema>

// Authorization for every superadmin action (R22, NFR3). The actor's row is read on each call,
// so a demoted or deactivated superadmin is refused on the next request (R21).
export async function authorizeActiveSuperadmin(
  userId: string | null
): Promise<Result<ActiveSuperadmin, AuthError>> {
  const actor =
    userId === null ? undefined : await findAccountAccess(db, userId)
  if (actor === undefined)
    return err(
      appError.unauthorized(AUTH_ERROR.SESSION_REQUIRED, "no valid session")
    )
  if (actor.status !== "active" || actor.role !== "superadmin")
    return err(
      appError.forbidden(
        AUTH_ERROR.NOT_ACTIVE_SUPERADMIN,
        `user ${actor.id} is not an active superadmin`
      )
    )
  return ok(activeSuperadminSchema.parse({ actorId: actor.id }))
}

export async function listAccountsForAdmin(
  _actor: ActiveSuperadmin,
  input: ListAccountsInput
): Promise<Result<AccountsPage, AuthError>> {
  const { rows, total } = await listAccounts(db, {
    status: input.status,
    sort: input.sort,
    limit: ACCOUNTS_PAGE_SIZE,
    offset: (input.page - 1) * ACCOUNTS_PAGE_SIZE,
  })
  const items = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }))
  return ok({ items, page: input.page, pageSize: ACCOUNTS_PAGE_SIZE, total })
}

const SELF_REJECTION = () =>
  appError.forbidden(
    AUTH_ERROR.CANNOT_CHANGE_SELF,
    "a superadmin cannot change their own account"
  )

const STATUS_REJECTIONS = {
  self: SELF_REJECTION,
  changed: () =>
    appError.conflict(
      AUTH_ERROR.ACCOUNT_STATUS_CHANGED,
      "the status changed since it was read"
    ),
  invalid_transition: () =>
    appError.conflict(
      AUTH_ERROR.INVALID_STATUS_TRANSITION,
      "this status change is not allowed"
    ),
} as const

const ROLE_REJECTIONS = {
  self: SELF_REJECTION,
  changed: () =>
    appError.conflict(
      AUTH_ERROR.ACCOUNT_ROLE_CHANGED,
      "the role changed since it was read"
    ),
  target_not_active: () =>
    appError.conflict(
      AUTH_ERROR.TARGET_NOT_ACTIVE,
      "only an active account can become a superadmin"
    ),
} as const

type LockedTarget = {
  readonly id: string
  readonly status: AccountStatus
  readonly role: Role
}

const accountNotFound = (userId: string) =>
  appError.notFound(AUTH_ERROR.ACCOUNT_NOT_FOUND, `account ${userId} not found`)

// Runs first in every change transaction. Race: two superadmins change one account, or demote each
// other, at once → both rows are locked in id order and every decision is made on what is
// committed (spec section 4, AC20, EC16, EC17).
async function lockActorAndTarget(
  tx: Tx,
  actor: ActiveSuperadmin,
  targetId: string
): Promise<Result<LockedTarget, AuthError>> {
  const locked = await lockAccountsForChange(tx, [actor.actorId, targetId])
  const actorRow = locked.find((row) => row.id === actor.actorId)
  if (actorRow?.status !== "active" || actorRow.role !== "superadmin")
    return err(
      appError.forbidden(
        AUTH_ERROR.NOT_ACTIVE_SUPERADMIN,
        `user ${actor.actorId} is no longer an active superadmin`
      )
    )
  const target = locked.find((row) => row.id === targetId)
  return target === undefined ? err(accountNotFound(targetId)) : ok(target)
}

type ChangedRow = Omit<AccountRow, "createdAt"> & { readonly createdAt: Date }

function toAccountRow(
  userId: string,
  updated: ChangedRow | undefined
): Result<AccountRow, AuthError> {
  return updated === undefined
    ? err(accountNotFound(userId))
    : ok({ ...updated, createdAt: updated.createdAt.toISOString() })
}

async function applyStatusChange(
  tx: Tx,
  actor: ActiveSuperadmin,
  input: ChangeAccountStatusInput
): Promise<Result<AccountRow, AuthError>> {
  const target = await lockActorAndTarget(tx, actor, input.userId)
  if (!target.ok) return target
  const decision = decideStatusChange({
    actorId: actor.actorId,
    targetId: target.data.id,
    currentStatus: target.data.status,
    expectedStatus: input.expectedStatus,
    nextStatus: input.nextStatus,
  })
  if (decision.kind === "reject")
    return err(STATUS_REJECTIONS[decision.reason]())
  const updated = await updateAccountStatus(tx, {
    id: target.data.id,
    status: input.nextStatus,
    changedAt: new Date(),
  })
  return toAccountRow(input.userId, updated)
}

async function applyRoleChange(
  tx: Tx,
  actor: ActiveSuperadmin,
  input: ChangeAccountRoleInput
): Promise<Result<AccountRow, AuthError>> {
  const target = await lockActorAndTarget(tx, actor, input.userId)
  if (!target.ok) return target
  const decision = decideRoleChange({
    actorId: actor.actorId,
    targetId: target.data.id,
    targetStatus: target.data.status,
    currentRole: target.data.role,
    expectedRole: input.expectedRole,
    nextRole: input.nextRole,
  })
  if (decision.kind === "reject") return err(ROLE_REJECTIONS[decision.reason]())
  const updated = await updateAccountRole(tx, {
    id: target.data.id,
    role: input.nextRole,
  })
  return toAccountRow(input.userId, updated)
}

type ChangeAudit = {
  readonly subject: "status" | "role"
  readonly actor: ActiveSuperadmin
  readonly targetId: string
  readonly from: string
  readonly to: string
}

// Audit: ids, values, and codes only (spec section 10, security.md rule 13). A refusal decided on
// the locked rows is a warn, like the middleware's (review T5 N5).
function logChange(
  audit: ChangeAudit,
  result: Result<AccountRow, AuthError>
): void {
  const ids = { actorId: audit.actor.actorId, targetId: audit.targetId }
  if (result.ok)
    logger.info(
      {
        operation: `auth.account_${audit.subject}_changed`,
        ...ids,
        from: audit.from,
        to: audit.to,
      },
      `account ${audit.subject} changed`
    )
  else
    logger.warn(
      {
        operation: `auth.account_${audit.subject}_refused`,
        ...ids,
        code: result.error.code,
      },
      `account ${audit.subject} change refused`
    )
}

// Activate, reject, deactivate, reactivate (R17, R18). Every failure returns before the write, so
// nothing needs a rollback (drizzle-postgres.md, "Transactions").
export async function changeAccountStatus(
  actor: ActiveSuperadmin,
  input: ChangeAccountStatusInput
): Promise<Result<AccountRow, AuthError>> {
  const result = await db.transaction((tx) =>
    applyStatusChange(tx, actor, input)
  )
  logChange(
    {
      subject: "status",
      actor,
      targetId: input.userId,
      from: input.expectedStatus,
      to: input.nextStatus,
    },
    result
  )
  return result
}

// Promote and revoke superadmins (R19, R20), in the same kind of transaction.
export async function changeAccountRole(
  actor: ActiveSuperadmin,
  input: ChangeAccountRoleInput
): Promise<Result<AccountRow, AuthError>> {
  const result = await db.transaction((tx) => applyRoleChange(tx, actor, input))
  logChange(
    {
      subject: "role",
      actor,
      targetId: input.userId,
      from: input.expectedRole,
      to: input.nextRole,
    },
    result
  )
  return result
}
