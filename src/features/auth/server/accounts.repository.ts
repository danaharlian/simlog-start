import { eq } from "drizzle-orm"
import type { DbOrTx } from "@/shared/db/client"
import { users } from "@/features/auth/db/schema"

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
