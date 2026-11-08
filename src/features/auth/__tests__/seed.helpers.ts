import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { users } from "@/features/auth/db/schema"
import type { SeedInput } from "@/features/auth/server/seed.service"
import { db } from "@/shared/db/client"

type Vars = Readonly<Record<string, string | undefined>>

// A superadmin and sample identities unique to this test, so runs on the shared test database
// never collide and the sample-creation path runs every time (review T7 S1).
export function seedInput(overrides: { env?: Vars; shell?: Vars } = {}) {
  const suffix = randomUUID().slice(0, 8)
  return {
    env: {
      SEED_SUPERADMIN_NAME: `Admin ${suffix}`,
      SEED_SUPERADMIN_USERNAME: `admin_${suffix}`,
      SEED_SUPERADMIN_EMAIL: `admin.${suffix}@contoh.id`,
      SEED_SUPERADMIN_PASSWORD: "rahasia-seed-123",
      SEED_SAMPLE_PASSWORD: "contoh-seed-456",
      ...overrides.env,
    },
    shell: { SEED_ALLOW: "true", ...overrides.shell },
    sampleTag: `_${suffix}`,
  } satisfies SeedInput
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
