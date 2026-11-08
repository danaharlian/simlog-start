import { db } from "@/shared/db/client"
import { appError, err, ok } from "@/shared/errors"
import type { Result } from "@/shared/errors"
import { ACCOUNTS_PAGE_SIZE } from "@/features/auth/schemas"
import type {
  AccountsPage,
  CurrentUser,
  ListAccountsInput,
} from "@/features/auth/schemas"
import { z } from "zod"
import { AUTH_ERROR } from "@/features/auth/errors"
import type { AuthError } from "@/features/auth/errors"
import {
  findAccountAccess,
  findCurrentUser,
  listAccounts,
} from "@/features/auth/server/accounts.repository"

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
