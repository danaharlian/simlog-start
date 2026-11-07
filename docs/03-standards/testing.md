# Testing Standards

**When to read:** before writing tests, changing test config, or reporting test results.

Test runner: **Vitest** 5.0.5. `install.sh` adds it and the script `test`, `vitest run --passWithNoTests` (ADR 0007, O; the shadcn Start scaffold of 2026-10-31 had neither). That flag makes a run with no tests exit 0, so **read the test count before calling a run green.** Testing Library, a DOM environment, and Playwright are **not installed yet**: add them via `verify-library-docs` when the first UI or e2e test is written. The rules below are tool-neutral.

## Pyramid

| Level | Scope | Dependencies | Volume |
|---|---|---|---|
| Unit | Pure functions, Zod schemas, services with fakes | None | Many |
| Integration | Service + repository against **real PostgreSQL** | Test database | Medium |
| Component | UI behavior via user-facing queries (roles/labels) | Mocked server functions at the network edge | Medium |
| E2E | Critical user journeys in a real browser | Full app + test DB | Few |

When time is short, test in this order: business rules (`*.rules.ts` and services), Zod schemas, authorization and server functions, form mappers and other pure helpers, component behavior, end-to-end flows. The first three are mandatory for any change that touches them. Which other levels a feature gets depends on its risk; record the choice in the QA report.

## Rules

1. **Real database for data tests.** Repository and service integration tests run against PostgreSQL (container or compose), not mocks of Drizzle. Isolate per test with a transaction rolled back, or truncate between tests. That database is the **test database** (`TEST_DATABASE_URL`, migrated with `pnpm db:migrate:test`), never the dev or production one (`environment.md`, "Databases per environment"). A test reaches it through `serverEnv.DATABASE_URL`: `vitest.config.ts` sets `test.env.DATABASE_URL` from `TEST_DATABASE_URL`, refuses a missing value or the dev URL, and provides it to tests as `inject('testDatabaseUrl')` (ADR 0044). A test never reads `process.env` (lint rejects it).
1b. **Concurrency tests** (ADR 0031) need committed rows and one connection per caller, so the rolled-back transaction of rule 1 cannot hold them: truncate afterward, and give the pool a `max` above the number of callers. Start the colliding calls together with `Promise.all`, several at once (for example 10 calls where one may win), and assert on the stored rows as well as on each `Result`. The expected result per race is in `docs/04-stack/drizzle-concurrency.md`. **Inferred, not run:** a race depends on timing, so check-then-write code can still pass one run. Review reads the mechanism (`code-review`, pass 4); the test shows it holds.
2. **Mock only at boundaries you do not own** (third-party HTTP, email, payment). Never mock the module under test or the repository when testing a service's persistence behavior.
3. **Arrange-Act-Assert**, one behavior per test, names state behavior: `rejects payment when invoice is already paid`.
4. **Test behavior, not implementation.** Components: query by role/label/text; no testing of internal state or class names. No large DOM snapshots.
5. **Every bug fix** ships with a regression test that fails before the fix.
5b. **Tests first for logic.** For schemas, services, and server functions, write the tests from the acceptance criteria before the code, run them, and confirm they fail on an assertion (not a missing import). Note it in the PR. Exempt: layout and styling, config, docs. Tests written after the code and passing at once are fine, but do not call them test-first.
6. **Every server function** has tests for: valid input, invalid input (validation error), unauthenticated, unauthorized, not found. **Every server route** has the same, asserting the status and JSON shape from `api-conventions.md`, plus a bad signature for webhooks. The built server's `fetch` handler can be called directly with a `Request`.
7. **Every Zod schema** with non-trivial rules has tests for boundary values.
8. **Deterministic**: no real clocks, random values, or network in unit tests. Inject time and ids.
9. **Coverage** is a smoke alarm, not a goal. Default gate: services ≥ 80% lines. Do not write assertion-free tests to hit numbers.
10. **E2E** covers sign-in, the top revenue/critical flows, and permission boundaries. Keep them stable: prefer role/label locators and avoid fixed sleeps.
11. **Simulate users with `user-event`,** not `fireEvent`. Call `userEvent.setup()` inside the test, before rendering, and use its methods (Testing Library docs). It runs real checks: a click on a disabled button did not fire its handler (run on 2026-10-31 with user-event 14.6.8, a version not pinned yet: `versions.md`, action item 4). Use `fireEvent` only for an interaction `user-event` does not support.
12. **Mocks:** prefer passing a dependency as an argument over mocking a module. When a module mock is needed, clear mocks between tests. Mock Service Worker is not installed; adding it needs an ADR.

## Where tests go

| Test | File | Location |
|---|---|---|
| Unit, integration, component | `<source-name>.test.ts(x)` | The feature's `__tests__/` |
| Pure helper in `shared/` | `<source-name>.test.ts` | Beside the source |
| End-to-end | `<flow-name>.spec.ts` | `e2e/` at the repo root |

Do not put a test beside a component: a `*.test.tsx` under `components/` counts as UI for the boundary rules, so it cannot import a service or repository (`linting-and-formatting.md`).

## What not to test

- shadcn primitives and third-party library behavior.
- Pass-through components with no logic, and styling or class names.
- Internal state or which private function was called.

## Performance and bundle size

No repo-wide budget or measuring tool is decided (decision X in `docs/decisions/README.md`). A feature's targets are the PRD's performance NFRs, verified in QA (`docs/templates/qa.md`). Without a tool or target, the result is **Unknown**, never an estimate.

## Reporting

When finishing a task, the agent MUST state exactly which commands were run (`typecheck`, `lint`, `test`) and their result. If something was not run, say "not run" and why. Never claim green without running.

## Test data

Factories in `shared/testing/`. No shared mutable fixtures between tests. Never use production data.
