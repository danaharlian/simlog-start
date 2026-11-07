# 0044 Integration tests reach the test database through the Vitest config (closes open decision AH)

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Tech Lead), via chat, 2026-11-08: “06-feature-spec auth: AH pakai vitest.config, ADR 0043 accepted, ssr-query pakai ADR, setujui 2 export tambahan di 05, section 8 sesuai; perbaiki 4 kelemahan lalu tulis 07-tasks”

## Context

Open decision AH (ADR 0033): integration tests must run against the test database (`TEST_DATABASE_URL`), but lint rejects `process.env` under `src/`, and `serverEnv` reads `DATABASE_URL`. `docs/03-standards/testing.md` forbids pointing `DATABASE_URL` at the test database by hand until AH is decided. The auth feature is the first with integration tests (`specs/auth/06-feature-spec.md`, section 11).

## Decision

1. `vitest.config.ts` (project root, outside `src/`) loads `.env` the same way `drizzle.config.ts` does, and sets `test.env.DATABASE_URL` to `TEST_DATABASE_URL`.
2. The config throws before any test runs when `TEST_DATABASE_URL` is missing, or when it equals `DATABASE_URL`.
3. Code under `src/` keeps reading `serverEnv.DATABASE_URL`, and no test reads `process.env`.
4. The test database is migrated with `pnpm db:migrate:test` before the suite runs. Isolation is per test: each test creates its own rows with unique values. Truncation, if a task needs it, runs only against the test database.

## Consequences

- Tests and the app share one env module, and no test-only branch appears in `src/`.
- A developer without `TEST_DATABASE_URL` cannot run integration tests. That failure is intended.
- Follow-up: `environment.md` (table row for `TEST_DATABASE_URL`) and `testing.md` rule 1 name this ADR. Both are updated in the task that adds `vitest.config.ts` (`specs/auth/07-tasks.md`, T1).

## Not verified

Two things are proven by the first auth task:
- Whether Vitest 5.0.5 `test.env` is applied before `src/shared/config/env.server.ts` is imported.
- Whether the TanStack Start Vite plugin in `vite.config.ts` interferes with a separate `vitest.config.ts`.

## Alternatives considered

- **A test-only env module.** It adds a second source of truth for the database URL inside `src/`.
- **A test script that sets `DATABASE_URL` on the shell.** It works only through the script, and a plain `pnpm vitest` would then run against the dev database.

## Verification

ADR 0033, `docs/03-standards/environment.md`, `docs/03-standards/testing.md`. Read 2026-11-08. Vitest `test.env` behavior: to be verified against Vitest 5.0.5 docs in T1 (`verify-library-docs`).
