import { db } from "@/shared/db/client"
import type { CurrentUser } from "@/features/auth/schemas"
import { findCurrentUser } from "@/features/auth/server/accounts.repository"

// Reads the row on every call, so a status change applies on the user's next request (R21, D10).
export async function getCurrentUserDto(
  userId: string
): Promise<CurrentUser | null> {
  const row = await findCurrentUser(db, userId)
  return row ?? null
}
