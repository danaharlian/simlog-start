import { z } from "zod"
import { db } from "@/shared/db/client"
import { err, ok } from "@/shared/errors"
import type { Result } from "@/shared/errors"
import { passwordSchema, usernameSchema } from "@/features/auth/schemas"
import type { AccountStatus, StatusTarget } from "@/features/auth/schemas"
import {
  findAccountIdByEmail,
  updateAccountRole,
  updateAccountStatus,
} from "@/features/auth/server/accounts.repository"
import {
  authorizeActiveSuperadmin,
  changeAccountStatus,
} from "@/features/auth/server/accounts.service"
import type { ActiveSuperadmin } from "@/features/auth/server/accounts.service"
import { auth } from "@/features/auth/server/auth.repository"

// Dev seed (PRD R24, R25; spec section 1, "Seed"). It receives the environment as a plain record
// from scripts/seed.ts and reads nothing else (environment.md, rules 1 and 3).

export type SeedOutcome = "created" | "existing"

export type SeedReport = {
  readonly superadmin: SeedOutcome
  readonly samples: Readonly<Record<AccountStatus, SeedOutcome>>
}

export type SeedRefusal = {
  readonly reason:
    "production" | "not_allowed" | "invalid_config" | "superadmin_not_active"
  readonly detail: string
}

type SeedEnv = Readonly<Record<string, string | undefined>>

const seedConfigSchema = z.object({
  SEED_SUPERADMIN_NAME: z.string().trim().min(1),
  SEED_SUPERADMIN_USERNAME: usernameSchema,
  SEED_SUPERADMIN_EMAIL: z.email(),
  SEED_SUPERADMIN_PASSWORD: passwordSchema,
})
type SeedConfig = z.infer<typeof seedConfigSchema>

type SampleAccount = {
  readonly name: string
  readonly username: string
  // The status changes that lead from pending to this status, through the T5 service.
  readonly path: ReadonlyArray<StatusTarget>
}

// One sample account per status (R24). Fake people on a reserved domain (RFC 2606), never real data.
const SAMPLES: Readonly<Record<AccountStatus, SampleAccount>> = {
  pending: { name: "Contoh Menunggu", username: "contoh_menunggu", path: [] },
  active: { name: "Contoh Aktif", username: "contoh_aktif", path: ["active"] },
  rejected: {
    name: "Contoh Ditolak",
    username: "contoh_ditolak",
    path: ["rejected"],
  },
  inactive: {
    name: "Contoh Nonaktif",
    username: "contoh_nonaktif",
    path: ["active", "inactive"],
  },
}

const sampleEmail = (status: AccountStatus) =>
  `${SAMPLES[status].username.replace("_", ".")}@simlog.test`

export const SEED_SAMPLE_EMAILS: Readonly<Record<AccountStatus, string>> = {
  pending: sampleEmail("pending"),
  active: sampleEmail("active"),
  rejected: sampleEmail("rejected"),
  inactive: sampleEmail("inactive"),
}

// R25, EC20: the decision comes before any parsing or writing.
function guardRefusal(env: SeedEnv): SeedRefusal | undefined {
  if (env.NODE_ENV === "production")
    return { reason: "production", detail: "NODE_ENV is production" }
  if (env.SEED_ALLOW !== "true")
    return { reason: "not_allowed", detail: 'SEED_ALLOW must be "true"' }
  return undefined
}

type NewAccount = {
  readonly name: string
  readonly username: string
  readonly email: string
  readonly password: string
}

// Better Auth hashes the password and normalizes the username (02-research.md, option 4b A).
// The unique email decides whether the account is new, not a read before the write
// (drizzle-concurrency.md): an account from an earlier or a parallel run is kept as it is.
async function createOrFind(
  account: NewAccount
): Promise<{ readonly id: string; readonly outcome: SeedOutcome }> {
  try {
    const { user } = await auth.api.signUpEmail({ body: account })
    return { id: user.id, outcome: "created" }
  } catch (cause) {
    const id = await findAccountIdByEmail(db, account.email)
    if (id === undefined) throw cause
    return { id, outcome: "existing" }
  }
}

// The first superadmin has no one to activate it, so the seed writes its status and role directly.
async function ensureSuperadmin(config: SeedConfig) {
  const account = await createOrFind({
    name: config.SEED_SUPERADMIN_NAME,
    username: config.SEED_SUPERADMIN_USERNAME,
    email: config.SEED_SUPERADMIN_EMAIL,
    password: config.SEED_SUPERADMIN_PASSWORD,
  })
  if (account.outcome === "created")
    await db.transaction(async (tx) => {
      await updateAccountStatus(tx, {
        id: account.id,
        status: "active",
        changedAt: new Date(),
      })
      await updateAccountRole(tx, { id: account.id, role: "superadmin" })
    })
  return account
}

async function seedSample(
  actor: ActiveSuperadmin,
  status: AccountStatus,
  password: string
): Promise<SeedOutcome> {
  const sample = SAMPLES[status]
  const account = await createOrFind({
    name: sample.name,
    username: sample.username,
    email: SEED_SAMPLE_EMAILS[status],
    password,
  })
  if (account.outcome === "existing") return "existing"
  let current: AccountStatus = "pending"
  for (const next of sample.path) {
    const result = await changeAccountStatus(actor, {
      userId: account.id,
      expectedStatus: current,
      nextStatus: next,
    })
    if (!result.ok)
      throw new Error(`seed: ${status} sample: ${result.error.code}`)
    current = next
  }
  return "created"
}

// Sample accounts share the superadmin's password from the environment, so no password is
// written in code (R24).
export async function seedAccounts(
  env: SeedEnv
): Promise<Result<SeedReport, SeedRefusal>> {
  const refusal = guardRefusal(env)
  if (refusal !== undefined) return err(refusal)
  const config = seedConfigSchema.safeParse(env)
  if (!config.success)
    return err({
      reason: "invalid_config",
      // Names only: a value could be the password.
      detail: config.error.issues
        .map((issue) => issue.path.join("."))
        .join(", "),
    })

  const superadmin = await ensureSuperadmin(config.data)
  const actor = await authorizeActiveSuperadmin(superadmin.id)
  if (!actor.ok)
    return err({
      reason: "superadmin_not_active",
      detail: `@${config.data.SEED_SUPERADMIN_USERNAME} exists but is not an active superadmin`,
    })

  const password = config.data.SEED_SUPERADMIN_PASSWORD
  const samples = {
    pending: await seedSample(actor.data, "pending", password),
    active: await seedSample(actor.data, "active", password),
    rejected: await seedSample(actor.data, "rejected", password),
    inactive: await seedSample(actor.data, "inactive", password),
  }
  return ok({ superadmin: superadmin.outcome, samples })
}
