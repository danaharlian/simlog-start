# 0013 Pure business rules may live in a linted `*.rules.ts` file

- Status: accepted
- Date: 2026-10-31
- Deciders: owner (approved the recommendation on decision Z, including the change to `eslint.boundaries.js`)
- Supersedes: ADR 0007, decision V
- Extends: ADR 0011

## Context

ADR 0007 kept pure business rules in `*.service.ts`, with no new lint category. ADR 0011 recorded the cost as open decision Z.

Facts checked on 2026-10-31 in a fixture (ESLint 10.13, eslint-plugin-boundaries 7.2.0, typescript-eslint 8.72.1, Vitest 5.0.5, TypeScript 6.0.3 strict), with the changed `eslint.boundaries.js` copied from this repo:

1. **A rule in a service cannot be tested without env,** given an env module that validates on import. With no `DATABASE_URL`, the test fails with a `ZodError` while loading service, repository, db client, and env. The same function in its own file passes.
2. **A rule in a service is not guaranteed pure.** A service may import a repository, so lint cannot tell a pure function from one that reads data.
3. **A `*.rules.ts` file without a category gets no layer rules.** Importing a repository or `db/`, and being imported by UI, raised no boundary error.
4. **Allowing all of `shared` would defeat the category:** every file may use `shared`, so a rule could import `@/shared/db/client`. Only `shared/lib` and `shared/errors` are allowed.
5. **The matrix passed.** All 21 files that should fail reported a boundary error and all 42 that should pass were clean:

| Case | Result |
|---|---|
| rules → service, repository, `db/` (also `import type` and dynamic `import()`), UI | error |
| rules → `@/shared/db/client`, `@/shared/config/env`, `@/shared/server/logger` | error |
| UI, hook, `queries.ts`, server function, listener, repository, `index.ts` → rules | error |
| another feature or a route under `src/routes/api/**` → a feature's `server/*.rules.ts` | error |
| rules → rules, `errors.ts`, `schemas.ts`, `@/shared/lib/*`, `@/shared/errors` | allowed |
| service, `index.server.ts`, `__tests__` → rules | allowed |
| another feature's service, or a route under `src/routes/api/**` → `index.server.ts` | allowed |
| Regression: UI → service; route → service; service → `db/` | error |
| Regression: service → shared db client | allowed |

`check:gates` does not read the boundary rules (ADR 0012), so these runs are the evidence for this rule. `check:gates` itself was not run for this change.

## Decision

1. A non-trivial rule **may** go in `features/<f>/server/<name>.rules.ts`. It is optional: a rule of a line or two stays in the service. Use the file when a rule has several branches or edge cases, or when its tests want many cases.
2. A rules file holds pure functions only: same input, same output, no side effects. Time, ids, and current data come in as arguments.
3. The lint category `rules` enforces the imports in the table above.
4. The service calls the rule and turns the answer into a `Result`. UI receives the answer from the server (`canPay: true`), so rules are not shipped to the browser.
5. Another feature reaches a rule only through `index.server.ts`, and only when it needs that rule today.

No `domain/` folder: a file in the existing `server/` folder keeps the feature layout predictable.

## Consequences

- Rule tests run with no database, env, or mocks.
- A service splits into deciding (`*.rules.ts`) and doing (`*.service.ts`) when that is worth it.
- New file categories: `rules`, `shared-pure`. A new folder under `shared/` is not available to rules until it is added to `shared-pure`.
- Existing apps pick the rule up by running the installer again. A team-edited `eslint.boundaries.js` is kept and reported, so it needs the changes by hand.

## Not verified

- **Lint does not check packages or `node:` modules** (plugin default), and cannot see `Date.now()`, `Math.random()`, or `fetch`. Review checks these.
- `schemas.ts` has no category, so lint does not stop it from importing server code; a rule importing a bad `schemas.ts` would inherit that.
- The rule in a real installed app; it was run in the fixture only.
- Fact 1 depends on an env module that validates on import. The app's env module does not exist yet.

## Alternatives considered

- **Keep rules in services and set env in tests.** Works, but a pure-looking function stays free to read data, and each rule test still loads the database modules.
- **`*.rules.ts` with no lint category.** Rejected: fact 3 means the name would promise purity that nothing enforces.
- **A `domain/` folder.** Same lint change, plus a new folder in every feature that wants one.
- **Allow UI to import rules,** so the client could reuse them. Rejected: it ships business rules to the browser and invites client-side enforcement. The server returns the answer.
- **Make the file mandatory.** Rejected: most CRUD rules are too small to justify it.

## Verification

Docs consulted (2026-10-31): `eslint-plugin-boundaries` 7.2.0: behavior from running it, as in `linting-and-formatting.md`. `vitest` 5.0.5: run in the fixture.
