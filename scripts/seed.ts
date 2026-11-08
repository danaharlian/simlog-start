// Dev seed runner (ADR 0042): `pnpm db:seed`. Tool code outside the app, so it may read
// process.env (environment.md, rule 3). It imports only the auth feature's server entry;
// eslint-plugin-boundaries does not check scripts/, so review does (05-architecture-review.md, section 3).
import { seedAccounts } from "@/features/auth/index.server"

const result = await seedAccounts(process.env)

if (!result.ok) {
  console.error(
    `Seed stopped before writing (${result.error.reason}): ${result.error.detail}`
  )
  process.exit(1)
}

const { superadmin, samples } = result.data
console.log(`Superadmin: ${superadmin}`)
for (const [status, outcome] of Object.entries(samples))
  console.log(`Sample account (${status}): ${outcome}`)
// The database pool would keep the process alive.
process.exit(0)
