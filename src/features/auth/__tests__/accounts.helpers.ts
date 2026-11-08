import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { users } from "@/features/auth/db/schema"
import type { AccountStatus, Role } from "@/features/auth/schemas"
import { auth } from "@/features/auth/server/auth.repository"
import { authorizeActiveSuperadmin } from "@/features/auth/server/accounts.service"
import type { ActiveSuperadmin } from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"

// Shared setup for the account tests; it lives in __tests__ so it is never part of the app.
export async function createAccount(
  status: AccountStatus,
  role: Role = "user"
): Promise<string> {
  const suffix = randomUUID().slice(0, 8)
  const { user } = await auth.api.signUpEmail({
    body: {
      name: `Kirana ${suffix}`,
      email: `kirana.${suffix}@contoh.id`,
      username: `kirana_${suffix}`,
      password: "rahasia-123",
    },
  })
  await db.update(users).set({ status, role }).where(eq(users.id, user.id))
  return user.id
}

export async function superadminActor(
  userId?: string
): Promise<ActiveSuperadmin> {
  const result = await authorizeActiveSuperadmin(
    userId ?? (await createAccount("active", "superadmin"))
  )
  if (!result.ok)
    throw new Error(`authorizeActiveSuperadmin failed: ${result.error.code}`)
  return result.data
}

export async function storedAccount(userId: string) {
  const [row] = await db
    .select({
      status: users.status,
      role: users.role,
      statusChangedAt: users.statusChangedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
  return row
}
