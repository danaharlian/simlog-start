import { asc, count, desc, eq, inArray } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import type { DbOrTx } from "@/shared/db/client"
import { users } from "@/features/auth/db/schema"
import type { AccountStatus } from "@/features/auth/schemas"

export async function findCurrentUser(executor: DbOrTx, userId: string) {
  const [row] = await executor
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      status: users.status,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row
}

export async function findAccountAccess(executor: DbOrTx, userId: string) {
  const [row] = await executor
    .select({ id: users.id, status: users.status, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row
}

type ListAccountsQuery = {
  readonly status: AccountStatus | undefined
  readonly sort: "pendingFirst" | "createdAtDesc"
  readonly limit: number
  readonly offset: number
}

// Every list query has a limit and a unique tie-breaker (drizzle-postgres.md, rule 16).
function orderFor(sort: ListAccountsQuery["sort"]): ReadonlyArray<SQL> {
  const newestFirst = [desc(users.createdAt), asc(users.id)]
  if (sort === "createdAtDesc") return newestFirst
  return [desc(eq(users.status, "pending")), ...newestFirst]
}

export async function listAccounts(executor: DbOrTx, query: ListAccountsQuery) {
  const where: SQL | undefined =
    query.status === undefined ? undefined : eq(users.status, query.status)
  // Two pool connections, so the page and the total can come from different snapshots; fine for an admin list.
  const [rows, totals] = await Promise.all([
    executor
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        status: users.status,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(...orderFor(query.sort))
      .limit(query.limit)
      .offset(query.offset),
    executor.select({ total: count() }).from(users).where(where),
  ])
  return { rows, total: totals[0]?.total ?? 0 }
}

// Locks the actor's and the target's rows until the transaction ends, always in id order so two
// transactions never wait on each other in opposite order (drizzle-concurrency.md, rules 1 and 3).
export async function lockAccountsForChange(
  tx: DbOrTx,
  ids: ReadonlyArray<string>
) {
  return tx
    .select({ id: users.id, status: users.status, role: users.role })
    .from(users)
    .where(inArray(users.id, [...ids]))
    .orderBy(asc(users.id))
    .for("update")
}

export async function updateAccountStatus(
  tx: DbOrTx,
  input: {
    readonly id: string
    readonly status: AccountStatus
    readonly changedAt: Date
  }
) {
  const [row] = await tx
    .update(users)
    .set({ status: input.status, statusChangedAt: input.changedAt })
    .where(eq(users.id, input.id))
    .returning({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
    })
  return row
}
