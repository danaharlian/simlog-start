import { isAPIError } from "better-auth/api"
import { z } from "zod"
import { db } from "@/shared/db/client"
import { err, ok } from "@/shared/errors"
import type { Result } from "@/shared/errors"
import { passwordSchema, usernameSchema } from "@/features/auth/schemas"
import type { AccountStatus, StatusTarget } from "@/features/auth/schemas"
import {
  findAccountAccess,
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

// Dev seed (PRD R24, R25; spec section 1, "Seed"). scripts/seed.ts hands it the environment as
// plain records; it reads nothing else (environment.md, rules 1 and 3).

type SeedEnv = Readonly<Record<string, string | undefined>>

export type SeedInput = {
  // The environment after .env is loaded.
  readonly env: SeedEnv
  // The shell's own variables, read before .env is loaded (review T7 B1).
  readonly shell: SeedEnv
  // Test seam: makes the sample identities unique on the shared test database (review T7 S1).
  readonly sampleTag?: string
}

export type SeedOutcome = "created" | "existing"

export type SeedReport = {
  readonly superadmin: SeedOutcome
  // An existing sample is kept as it is, so the report shows its stored status (review T7 S3).
  readonly samples: Readonly<
    Record<
      AccountStatus,
      { readonly outcome: SeedOutcome; readonly status: AccountStatus }
    >
  >
}

export type SeedRefusal = {
  readonly reason:
    | "production"
    | "shell_database_url"
    | "not_allowed"
    | "invalid_config"
    | "sign_up_refused"
    | "superadmin_not_active"
  readonly detail: string
}

const seedConfigSchema = z.object({
  SEED_SUPERADMIN_NAME: z.string().trim().min(1),
  SEED_SUPERADMIN_USERNAME: usernameSchema,
  SEED_SUPERADMIN_EMAIL: z.email(),
  SEED_SUPERADMIN_PASSWORD: passwordSchema,
  // Its own password, so a sample login never reveals the superadmin's (T7 PR gate).
  SEED_SAMPLE_PASSWORD: passwordSchema,
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

export function sampleIdentity(status: AccountStatus, tag = "") {
  const username = `${SAMPLES[status].username}${tag}`
  return { username, email: `${username.replace("_", ".")}@simlog.test` }
}

// R25, EC20: decided before any parsing or writing. Tool code outside the app, so it reads
// NODE_ENV from the record it is handed (environment.md, rule 6 exception).
function guardRefusal(input: SeedInput): SeedRefusal | undefined {
  if (input.env.NODE_ENV === "production")
    return { reason: "production", detail: "NODE_ENV is production" }
  // The production migration runs with the URL in the shell (environment.md), so a shell URL is
  // never seeded: only the database in .env is.
  if (input.shell.DATABASE_URL !== undefined)
    return {
      reason: "shell_database_url",
      detail:
        "DATABASE_URL is set in the shell; the seed writes only to the database in .env",
    }
  if (input.shell.SEED_ALLOW !== "true")
    return {
      reason: "not_allowed",
      detail:
        "run SEED_ALLOW=true pnpm db:seed; a SEED_ALLOW in .env is ignored",
    }
  return undefined
}

type NewAccount = {
  readonly name: string
  readonly username: string
  readonly email: string
  readonly password: string
}

type CreatedOrFound = { readonly id: string; readonly outcome: SeedOutcome }

// Better Auth hashes the password and normalizes the username (02-research.md, option 4b A).
// Race: two seed runs → the unique email index (users_email_key) decides and the loser looks the
// account up; no read decides the write (spec section 4, drizzle-concurrency.md).
// Relies on sign-up throwing for a taken email, which holds while requireEmailVerification is off
// and autoSignIn is not false (better-auth 1.7.18, sign-up.mjs; review T7 N1).
async function createOrFind(
  account: NewAccount
): Promise<Result<CreatedOrFound, SeedRefusal>> {
  try {
    const { user } = await auth.api.signUpEmail({ body: account })
    return ok({ id: user.id, outcome: "created" })
  } catch (cause) {
    const id = await findAccountIdByEmail(db, account.email)
    if (id !== undefined) return ok({ id, outcome: "existing" })
    // Another email holds the username, for example. Better Auth's message holds no account data.
    if (isAPIError(cause))
      return err({
        reason: "sign_up_refused",
        detail: `@${account.username}: ${cause.message}`,
      })
    throw cause
  }
}

// The first superadmin has no one to activate it, so the seed writes its status and role directly.
async function ensureSuperadmin(
  config: SeedConfig
): Promise<Result<CreatedOrFound, SeedRefusal>> {
  const account = await createOrFind({
    name: config.SEED_SUPERADMIN_NAME,
    username: config.SEED_SUPERADMIN_USERNAME,
    email: config.SEED_SUPERADMIN_EMAIL,
    password: config.SEED_SUPERADMIN_PASSWORD,
  })
  if (account.ok && account.data.outcome === "created")
    await db.transaction(async (tx) => {
      await updateAccountStatus(tx, {
        id: account.data.id,
        status: "active",
        changedAt: new Date(),
      })
      await updateAccountRole(tx, { id: account.data.id, role: "superadmin" })
    })
  return account
}

type SampleResult = Result<SeedReport["samples"][AccountStatus], SeedRefusal>

async function seedSample(
  actor: ActiveSuperadmin,
  status: AccountStatus,
  config: SeedConfig,
  tag: string | undefined
): Promise<SampleResult> {
  const sample = SAMPLES[status]
  const account = await createOrFind({
    name: sample.name,
    ...sampleIdentity(status, tag),
    password: config.SEED_SAMPLE_PASSWORD,
  })
  if (!account.ok) return account
  if (account.data.outcome === "existing") {
    const stored = await findAccountAccess(db, account.data.id)
    return ok({ outcome: "existing", status: stored?.status ?? status })
  }
  let current: AccountStatus = "pending"
  for (const next of sample.path) {
    const result = await changeAccountStatus(actor, {
      userId: account.data.id,
      expectedStatus: current,
      nextStatus: next,
    })
    if (!result.ok)
      throw new Error(`seed: ${status} sample: ${result.error.code}`)
    current = next
  }
  return ok({ outcome: "created", status: current })
}

async function seedSamples(
  actor: ActiveSuperadmin,
  config: SeedConfig,
  tag: string | undefined
): Promise<Result<SeedReport["samples"], SeedRefusal>> {
  const pending = await seedSample(actor, "pending", config, tag)
  if (!pending.ok) return pending
  const active = await seedSample(actor, "active", config, tag)
  if (!active.ok) return active
  const rejected = await seedSample(actor, "rejected", config, tag)
  if (!rejected.ok) return rejected
  const inactive = await seedSample(actor, "inactive", config, tag)
  if (!inactive.ok) return inactive
  return ok({
    pending: pending.data,
    active: active.data,
    rejected: rejected.data,
    inactive: inactive.data,
  })
}

export async function seedAccounts(
  input: SeedInput
): Promise<Result<SeedReport, SeedRefusal>> {
  const refusal = guardRefusal(input)
  if (refusal !== undefined) return err(refusal)
  const config = seedConfigSchema.safeParse(input.env)
  if (!config.success)
    return err({
      reason: "invalid_config",
      // Names only: a value could be a password.
      detail: config.error.issues
        .map((issue) => issue.path.join("."))
        .join(", "),
    })

  const superadmin = await ensureSuperadmin(config.data)
  if (!superadmin.ok) return superadmin
  const actor = await authorizeActiveSuperadmin(superadmin.data.id)
  if (!actor.ok)
    return err({
      reason: "superadmin_not_active",
      detail: `@${config.data.SEED_SUPERADMIN_USERNAME} exists but is not an active superadmin`,
    })

  const samples = await seedSamples(actor.data, config.data, input.sampleTag)
  if (!samples.ok) return samples
  return ok({ superadmin: superadmin.data.outcome, samples: samples.data })
}
