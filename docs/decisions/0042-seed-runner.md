# 0042 Seed runner: tsx (closes open decision AB)

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect), via chat, 2026-11-08: “05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted”

## Context

Open decision AB (ADR 0014) says a TypeScript seed needs a runner with `@/` alias support, and `tsx` would be a new dependency. The auth PRD needs a seed (R24, R25) that creates accounts with Better Auth's own hashing and username normalization (`specs/auth/02-research.md`, option 4b A). That means it imports the auth feature's server code, which uses the `@/` alias. ADR 0014 records that `tsx` ran a seed fixture. Node on the owner's machine is 24.22.1.

## Decision

**Option A: `tsx` as a dev dependency, run by a `db:seed` script.** It is added through skill `change-dependency` (exact pin, `versions.md` row, `allowBuilds` decision if it has an install script). The seed refuses to run with a production configuration (`specs/auth/04-prd.md`, R25).

Options considered:

| Option | What it gives | Cost |
|---|---|---|
| A. `tsx` as a dev dependency, script `db:seed` | Runs TypeScript with tsconfig paths; ADR 0014 saw it run a fixture | New dependency (this ADR covers it); install scripts per `versions.md` rule 6 Unknown |
| B. Node 24's own TypeScript type stripping | No dependency | `@/` aliases are not resolved by Node. **Inferred**, not run. Seed and everything it imports would need relative imports, against `conventions.md` |
| C. Seed as a server route or server function called in dev | Runs inside the app, which resolves aliases | Puts a data-writing endpoint in the app, which then has to be kept out of production |


## Consequences

- `versions.md` gains `tsx`, and `database.md` "Seeds" names the runner. Both are updated in the task that adds the seed.
- The seed script lives outside `src/`, so `eslint-plugin-boundaries` does not check its imports; review checks that it imports only `@/features/auth/index.server` (`specs/auth/05-architecture-review.md`, section 3).

## Not verified

Option A with Drizzle 1.0.0-rc.5 and Better Auth 1.7.18 imports. Option B entirely.

## Alternatives considered

B and C in the table under Decision: B leaves `@/` unresolved, C puts a data-writing endpoint in the app.

## Verification

ADR 0014 (decision AB), `docs/03-standards/database.md` "Seeds", `node --version` (24.22.1). Read 2026-11-07.
