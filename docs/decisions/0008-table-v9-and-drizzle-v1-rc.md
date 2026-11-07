# 0008 React Table v9 and Drizzle 1.0 release candidate

- Status: accepted
- Date: 2026-10-28
- Deciders: owner
- Supersedes in part: ADR 0007 (rows Q "React Table" and "Drizzle versions")

## Context

ADR 0007 chose React Table v8 and stable Drizzle (0.45.4 / 0.31.11). The owner's real `package.json` (attached 2026-10-27) declares `@tanstack/react-table` `^9.3.1` and `drizzle-orm` / `drizzle-kit` `1.0.0-rc.5`. When asked which one applies, the owner chose the installed versions: **v9** and **the 1.0 release candidate**.

Facts checked on 2026-10-27 (installed packages in a test app that used that `package.json`):

- npm `latest` for `@tanstack/react-table` is 9.3.1, so v9 is now the stable line, not an alpha. v9 changes the API a lot (`useTable`, `tableFeatures`, row-model slots, two-parameter column helper). The package ships version-matched docs in `skills/`.
- npm `latest` for Drizzle is still 0.45.4; 1.0.0-rc.5 is the `rc` tag. Better Auth 1.7.14 lists `drizzle-orm ^0.45.2 || >=1.0.0-rc.1 <2` as a peer, so the RC is within its range (npm metadata).
- A schema with `uuid().primaryKey().defaultRandom()`, `defineRelations`, `drizzle({ client: pool, relations })`, and `defineConfig` compiled under TypeScript 6.0.3 strict, and `drizzle-kit generate` ran offline and wrote the v1 folder layout.

## Decision

1. **React Table v9** (`^9.3.1`). `docs/04-stack/tanstack-table.md` was rewritten from the installed package. v8 patterns are listed there as traps.
2. **Drizzle `1.0.0-rc.5`**, `drizzle-orm` and `drizzle-kit` pinned together at the **same exact version** (no caret). This is a pre-release accepted on purpose (the rule "RC needs an ADR" is met by this record). `docs/04-stack/drizzle-postgres.md` was rewritten for v1: `defineRelations` (relational queries v2), per-migration folders, no `journal.json`.
3. Upgrades of either library follow `versions.md` rule 1: a branch, the official migration notes, and a re-run of the checks. Moving the Drizzle pins to the 1.0 final release is a normal upgrade; moving back to 0.x is a migration and needs a new ADR.

## Consequences

- Risk: an RC can change between releases. Mitigation: exact pins, upgrade only by branch, and the first database slice must prove `migrate` and real queries (not run so far: no PostgreSQL was available).
- Model memory and most web examples describe v8 and Drizzle 0.x. The stack docs list the traps; `AGENTS.md` rule zero already requires reading the installed version's docs.
- Not verified: Table v9 filtering and selection features, `createTableHook`, binding Router search params to controlled table state (see `tanstack-table.md`); Drizzle v1 transaction API and the PostgreSQL error shape for constraint violations (marked `TODO(verify)` in `drizzle-postgres.md`).

## Alternatives considered

- Follow ADR 0007 and downgrade to v8 and Drizzle 0.45.4: stable, but the owner's app already uses the newer lines and v8 is the line that will stop receiving features.
- Use v9 `alpha` or Drizzle `beta` tags: not considered; v9 is `latest`, and `rc` is the closest to a release.

## Verification

Installed `@tanstack/react-table` 9.3.1 and `@tanstack/table-core` 9.3.1 types and shipped skills; compile test of a v9 table; installed `drizzle-orm` and `drizzle-kit` 1.0.0-rc.5 (types, CLI help, an offline `generate` run); Drizzle docs "v0-v1-changes" and "relations v1 to v2" via Context7 (`/websites/orm_drizzle_team`); npm dist-tags and peer metadata queried 2026-10-27.
