import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { users } from "@/features/auth/db/schema"
import { db } from "@/shared/db/client"

// A superadmin config unique to this test, so runs on the shared test database never collide.
export function seedEnv(
  overrides: Readonly<Record<string, string | undefined>> = {}
) {
  const suffix = randomUUID().slice(0, 8)
  return {
    SEED_ALLOW: "true",
    SEED_SUPERADMIN_NAME: `Admin ${suffix}`,
    SEED_SUPERADMIN_USERNAME: `admin_${suffix}`,
    SEED_SUPERADMIN_EMAIL: `admin.${suffix}@contoh.id`,
    SEED_SUPERADMIN_PASSWORD: "rahasia-seed-123",
    ...overrides,
  }
}

export async function accountsWithEmail(email: string) {
  return db
    .select({
      id: users.id,
      username: users.username,
      status: users.status,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
}
