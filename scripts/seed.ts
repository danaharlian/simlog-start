// Dev seed runner (ADR 0042): `SEED_ALLOW=true pnpm db:seed`. Tool code outside the app, so it may
// read process.env (environment.md, rule 3). It imports only the auth feature's server entry;
// eslint-plugin-boundaries does not check scripts/, so review does (05-architecture-review.md, section 3).
import { existsSync } from "node:fs"

// The shell's own variables, before .env adds to them: the seed refuses a DATABASE_URL from the
// shell and accepts SEED_ALLOW only from the shell (review T7 B1, decided at the T7 PR gate).
const shell = { ...process.env }
// Like drizzle.config.ts: a variable already set in the shell wins over .env.
if (existsSync(".env")) process.loadEnvFile(".env")

// Imported after .env is loaded, because the server env is parsed when the module loads.
const { seedAccounts } = await import("@/features/auth/index.server")

try {
  const result = await seedAccounts({ shell, env: process.env })
  if (!result.ok) {
    console.error(
      `Seed stopped (${result.error.reason}): ${result.error.detail}`
    )
    process.exit(1)
  }
  const { superadmin, samples } = result.data
  console.log(`Superadmin: ${superadmin}`)
  for (const [status, sample] of Object.entries(samples))
    console.log(
      `Sample account (${status}): ${sample.outcome}, status ${sample.status}`
    )
} catch (cause) {
  // Only the name: a database error message can hold query parameters (review T7).
  console.error(
    `Seed failed: ${cause instanceof Error ? cause.name : "unknown error"}`
  )
  process.exit(1)
}
// The database pool would keep the process alive.
process.exit(0)
