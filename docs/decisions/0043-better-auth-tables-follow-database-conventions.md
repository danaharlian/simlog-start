# 0043 Better Auth tables follow the database conventions

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect, Tech Lead), via chat, 2026-11-08: “06-feature-spec auth: AH pakai vitest.config, ADR 0043 accepted, ssr-query pakai ADR, setujui 2 export tambahan di 05, section 8 sesuai; perbaiki 4 kelemahan lalu tulis 07-tasks”
- Extends: ADR 0040, point 3 (allowed edits to the CLI's tables)

## Context

`pnpm dlx auth@1.7.18 generate` wrote singular tables (`user`, `session`, `account`, `verification`), `text` ids, `timestamp` columns without a time zone, nullable `username`, `role`, and `status`, and index names such as `session_userId_idx` (`specs/auth/03-prototype.md`). `docs/03-standards/database.md` asks for plural table names, `uuid` primary keys (ADR 0007, H), `timestamp(..., { withTimezone: true })`, `.notNull()` by default, enums for fixed value lists, and `<table>_<columns>_idx` / `_key` names.

Better Auth 1.7.18 has options for two of these. The Drizzle adapter takes `usePlural` (`@better-auth/drizzle-adapter@1.7.18`, `DrizzleAdapterConfig`). `advanced.database.generateId: "uuid"` generates UUIDs, and on PostgreSQL it uses `gen_random_uuid()` (`@better-auth/core@1.7.18`, `dist/types/init-options.d.mts`). ADR 0040 allows only two kinds of edit: removing the relations block, and constraints that Better Auth's writes always satisfy.

## Decision

1. Set `usePlural: true` and `advanced.database.generateId: "uuid"`, then generate.
2. Besides ADR 0040's edits, the generated tables may also get these edits:
   - `withTimezone: true` on every timestamp;
   - index and unique names per `database.md`;
   - PostgreSQL enums `account_status` and `user_role` for `status` and `role`, with their values listed in `schemas.ts`;
   - `.notNull()` on `username`, `status`, and `role`;
   - `uuid` columns for the ids and foreign keys, if the CLI does not emit them.

   Property names, which Better Auth reads, never change.
3. `features/auth/README.md` lists every edit. A regenerated file is compared against that list.

## Consequences

- The auth tables look like every other table, and instants are stored with a zone.
- Each Better Auth upgrade needs the regenerate-and-compare step (already required by ADR 0040).

## Not verified

Run in T1 before anything else is built (ADR 0037):
- Whether Better Auth accepts these points against PostgreSQL:
  - writing `status` and `role` strings into enum columns;
  - `uuid` ids with `usePlural`;
  - reading `timestamptz` columns.
- What the CLI emits for ids when `generateId: "uuid"` is set.

If T1 fails on one of them, that edit is dropped through the spec's change log, and the column stays as the CLI wrote it.

## Alternatives considered

- **The CLI output as it is,** with a recorded deviation from `database.md`. This was not chosen because `timestamp` without a zone is read by `pg` as local server time, which is wrong when the server is not on UTC.
- **Hand-written tables with no CLI.** This was not chosen because it loses the regenerate-and-compare check against Better Auth's expected schema.

## Verification

`@better-auth/drizzle-adapter@1.7.18` `dist/index.d.mts`; `@better-auth/core@1.7.18` `dist/types/init-options.d.mts` (npm tarballs read 2026-11-08); `docs/03-standards/database.md`.
