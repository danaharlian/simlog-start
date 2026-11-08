import { db } from "@/shared/db/client"
import type { Tx } from "@/shared/db/client"
import { appError, err, ok } from "@/shared/errors"
import type { Result } from "@/shared/errors"
import { ACCOUNTS_PAGE_SIZE } from "@/features/auth/schemas"
import type {
  AccountRow,
  AccountsPage,
  ChangeAccountStatusInput,
  CurrentUser,
  ListAccountsInput,
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
  updateAccountStatus,
} from "@/features/auth/server/accounts.repository"
import { decideStatusChange } from "@/features/auth/server/accounts.rules"

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

const STATUS_REJECTIONS = {
  self: () =>
    appError.forbidden(
      AUTH_ERROR.CANNOT_CHANGE_SELF,
      "a superadmin cannot change their own status"
    ),
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

// Runs inside the transaction: lock, decide on the committed rows, then write.
async function applyStatusChange(
  tx: Tx,
  actor: ActiveSuperadmin,
  input: ChangeAccountStatusInput
): Promise<Result<AccountRow, AuthError>> {
  // Race: two superadmins change one account, or demote each other, at once → both rows are locked
  // and the decision is made on what is committed (spec section 4, AC20).
  const locked = await lockAccountsForChange(tx, [actor.actorId, input.userId])
  const actorRow = locked.find((row) => row.id === actor.actorId)
  if (actorRow?.status !== "active" || actorRow.role !== "superadmin")
    return err(
      appError.forbidden(
        AUTH_ERROR.NOT_ACTIVE_SUPERADMIN,
        `user ${actor.actorId} is no longer an active superadmin`
      )
    )
  const target = locked.find((row) => row.id === input.userId)
  if (target === undefined)
    return err(
      appError.notFound(
        AUTH_ERROR.ACCOUNT_NOT_FOUND,
        `account ${input.userId} not found`
      )
    )

  const decision = decideStatusChange({
    actorId: actor.actorId,
    targetId: target.id,
    currentStatus: target.status,
    expectedStatus: input.expectedStatus,
    nextStatus: input.nextStatus,
  })
  if (decision.kind === "reject")
    return err(STATUS_REJECTIONS[decision.reason]())

  const updated = await updateAccountStatus(tx, {
    id: target.id,
    status: input.nextStatus,
    changedAt: new Date(),
  })
  if (updated === undefined)
    return err(
      appError.notFound(
        AUTH_ERROR.ACCOUNT_NOT_FOUND,
        `account ${input.userId} not found`
      )
    )
  return ok({ ...updated, createdAt: updated.createdAt.toISOString() })
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
  if (result.ok) {
    // Audit: ids and statuses only (spec section 10, security.md rule 13).
    logger.info(
      {
        operation: "auth.account_status_changed",
        actorId: actor.actorId,
        targetId: input.userId,
        from: input.expectedStatus,
        to: input.nextStatus,
      },
      "account status changed"
    )
  } else {
    // Refusals decided on the locked rows (EC14, EC15, EC17); same shape as the middleware's warn.
    logger.warn(
      {
        operation: "auth.account_status_refused",
        actorId: actor.actorId,
        targetId: input.userId,
        code: result.error.code,
      },
      "account status change refused"
    )
  }
  return result
}
