# 0040 Better Auth schema on Drizzle 1.0 RC: tables without relations

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect), via chat, 2026-11-08: “05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted”

## Context

`docs/04-stack/better-auth.md` rule 5 says to run `auth generate`, place its output in `features/auth/db/schema.ts`, and never hand-edit it.

On 2026-11-07, `pnpm dlx auth@1.7.18 generate` wrote `import { relations } from "drizzle-orm"`, and `tsc` failed on `drizzle-orm` 1.0.0-rc.5 with `TS2724: '"drizzle-orm"' has no exported member named 'relations'`. With the relations block removed, `tsc` passed and `drizzle-kit generate` wrote the four tables (`specs/auth/03-prototype.md`).

The Better Auth docs offer `@better-auth/drizzle-adapter/relations-v2` for Drizzle relations v2. It is a direct dependency on `@better-auth/drizzle-adapter` and uses `defineRelationsPart` (https://better-auth.com/docs/adapters/drizzle#drizzle-relations-v2). ADR 0007 R chose the import `better-auth/adapters/drizzle`. Decision AA (ADR 0014) keeps `defineRelations` out of `shared/db/client.ts`. The docs say relations are needed for `advanced.database.joins`.

## Decision

1. Keep `drizzleAdapter` from `better-auth/adapters/drizzle` (ADR 0007 R). Do not enable `advanced.database.joins`.
2. `features/auth/db/schema.ts` holds the CLI's tables without its `relations` block.
3. Allowed edits to the generated tables are: removing the relations block, and constraints that Better Auth's own writes always satisfy (for example `NOT NULL` on a column Better Auth always fills, or a check constraint on `status`). The feature spec lists every edit, and `README.md` of the feature repeats the list, so a regeneration can be compared against it.
4. `better-auth.md` rule 5 is updated to say this.

## Consequences

- No new package, and decision AA holds.
- Better Auth reads a session and its user in separate queries instead of a join. The cost is Unknown and not measured.
- Every Better Auth upgrade regenerates the schema and compares it against the edit list.

## Not verified

The adapter's queries against real PostgreSQL with this schema. The first task proves it (ADR 0037).

## Alternatives considered

- **The relations-v2 adapter.** It gives joins and matches Drizzle v1. It was not chosen because it is a new direct dependency, it is against ADR 0007 R's import, and it needs `defineRelations` wiring that decision AA keeps out of `shared`.
- **Moving Drizzle back to 0.45.** That would make the CLI output compile as is, but it reverses ADR 0008.

## Verification

better-auth@1.7 docs: adapters/drizzle. Run 2026-11-07 on a throwaway branch: `auth@1.7.18 generate`, `tsc` 6.0, `drizzle-kit@1.0.0-rc.5 generate`.
