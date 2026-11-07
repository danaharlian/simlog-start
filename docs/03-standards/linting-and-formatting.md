# Linting and Formatting

**When to read:** before changing lint/format config, adding an inline disable, or setting up CI.

Toolchain (decided, ADR 0003; suppression policy ADR 0004): **ESLint 10 flat config** with typescript-eslint, `@tanstack/eslint-config`, `eslint-plugin-boundaries`, and `@eslint-community/eslint-plugin-eslint-comments`, plus **Prettier** (with `prettier-plugin-tailwindcss`). Scripts: `lint` (`eslint . --max-warnings 0`), `format`, `check` (`prettier --check`), `typecheck`. Do not add a second linter or formatter.

**Import order uses `import/order`** and `sort-imports` from `@tanstack/eslint-config` 0.4.0 (owner decision, ADR 0011; read from its source; applied by `eslint --fix` on a fixture). Do not add `simple-import-sort`.

**Run gates in this order, cheapest first:** `check`, `lint` (includes the boundary rules), `typecheck`, `test`, then `build`, `check:suppressions`, `check:gates`, `check:ui`, and `check:docs`. `install.sh` runs all of these except `build`.

## Requirements

1. **CI gates (blocking):** `typecheck` (zero errors), `lint` (zero errors, zero warnings), `check:suppressions`, `check:gates`, `check:ui`, format check, tests, `build`, docs check (`node scripts/check-docs.mjs`). The first two `check:*` scripts are defined in [`no-suppression.md`](no-suppression.md), and `check:ui` in [`tailwind-shadcn.md`](../04-stack/tailwind-shadcn.md).
2. **Type-aware linting** for TypeScript, including: no floating promises, no misused promises, no unnecessary type assertions, consistent type imports, exhaustive `switch` on a union (`eslint.code-rules.js`), and **no use of `@deprecated` APIs** (typescript-eslint `no-deprecated`; confirm the rule name and options in its docs). Deprecated library methods still compile, so this rule is the only automatic guard (example: `ensureQueryData`, see `docs/04-stack/tanstack-query.md`).
3. **TanStack rules:** add and enable `@tanstack/eslint-plugin-query` and `@tanstack/eslint-plugin-router` (both exist on npm; neither is installed by the scaffold, and `@tanstack/eslint-config` does not pull them in). Confirm rule names in their docs before configuring.
4. **Boundary rule:** enforce the dependency matrix from `docs/02-architecture/modular-monolith.md` with `eslint-plugin-boundaries` (installed and wired by `install.sh`). The verified config is [`docs/examples/eslint.boundaries.js`](../examples/eslint.boundaries.js) (details below). A violation fails CI.
5. **No unused code:** unused imports, variables, exports flagged. Dead feature code is deleted, not commented out.
6. **Format on save and in pre-commit** (staged files only). One formatter, no per-developer overrides committed.
7. **Generated files** (`routeTree.gen.ts`, `drizzle/` SQL, shadcn primitives if you choose to ignore them) are excluded from lint and format by config, not by inline comments.

## Code rules

[`docs/examples/eslint.code-rules.js`](../examples/eslint.code-rules.js) and the boundary config enforce these (owner approved, ADR 0021 and ADR 0034). `check-lint-integrity.mjs` fails if a rule is turned off, a size limit is raised, `no-magic-numbers` ignores more numbers or drops `enforceConst`, or `boundaries/dependencies` loses `default: 'disallow'`, `checkInternals`, or its `shared-db` rules; it cannot see a policy loosened inside `eslint.boundaries.js`, which code owners review. `node --test scripts/test-gates.mjs` holds every row below as a test (ADR 0022).

| Rejected | Scope | Allowed |
|---|---|---|
| `switch` on a union with a missing case or a catch-all `default` | `src/` | Every variant listed, with or without a `never` check; `default` on a plain `string` |
| `export default` | `src/features/`, `src/shared/` | `src/server.ts` |
| `process.env`, also through `const { env } = process` | `src/` | `shared/config/env.server.ts`, `shared/config/env.ts` |
| `console.*` | `features/*/server/`, `shared/server/`, `routes/api/`, `*.server.ts(x)` | Files that run on both sides (`logging.md`) |
| A function over 50 lines of code (200 in a `.tsx` file), a file over 300, nesting over 3 levels, over 4 parameters (ADR 0034) | `src/`, except tests and generated primitives in `shared/ui` | Blank lines and comments, which do not count; an `app-*` file in `shared/ui` is checked |
| A bare number other than -1, 0, 1, and a number in a `let` (`no-magic-numbers`, ADR 0034) | Same | A named `const`; array indexes, default values, numeric literal types, enum members, object property values, JSX props |
| Importing `shared/db/` | UI, hooks, `queries.ts`, page routes, `index.ts`, `schemas.ts`, `errors.ts`, `events.ts`, `shared/ui`, `shared/lib`, `shared/hooks` | Repository, service, routes under `src/routes/api/` |
| A dynamic `import()` of a `*.functions.ts` file, with a literal path (a `no-restricted-syntax` selector in `eslint.no-suppress.js`, because a later block would replace its selectors; `check-lint-integrity.mjs` checks it is still there) | Every TypeScript file | A static import of it; `import()` of any other module |
| A file in a feature matching no boundary category, such as `utils/x.ts` or `server/helper.ts` (`check:gates`) | `src/features/` | The folders in `folder-structure.md` |
| A Tailwind arbitrary value or palette color in any string (`check:ui`) | `src/`, except generated primitives, tests, and server code | Semantic tokens, `w-(--name)`, variants such as `data-[state=open]:` |
| A changed generated primitive, or a file in `shared/ui` that is not classified (`check:ui`) | `src/shared/ui/` | Recorded in `shadcn-primitives.lock.json`; `app-*` needs no entry |

## What the gates do not catch

No tool checks these, so review does. Run on 2026-10-31 unless marked.

| Code | Why |
|---|---|
| `import.meta.env` outside the env modules | `no-restricted-syntax` would need its exception merged with `eslint.no-suppress.js`; not tried |
| A dynamic `import()` of a server function whose path is built at run time (template literal, variable) | The selector reads a literal path only. Not run |
| A secret under a `VITE_` name | The name is legal; only its value is wrong. Not run |
| `console.*` in a component, hook, or route | The same file also runs in the browser (`logging.md`). Not run |
| A class built by concatenating strings, such as `'w-[' + n + 'px]'` | `check:ui` reads each string on its own. Not run |
| A commit message outside Conventional Commits | No commit hook is installed (hook manager: below). Not run |
| A hand-written shadcn primitive | Lint cannot tell who wrote a file. Not run |
| A check-then-write: a read whose answer decides a later write, with no lock and no condition in the write | Correct code and a race look the same to lint and types; a concurrent test can pass by timing (`testing.md`, rule 1b). Not run |
| `toLocaleString()` or a new `Intl` formatter in markup | Legal calls; the wrong output shows only on a server in another time zone (`components.md`, "Dates and numbers in markup"). Not run |
| A repeated string literal (an error code, a status, a role) written at each use | No core rule finds a repeated string, and most strings are text. Not run |
| A number as an object property value or a JSX prop (`{ staleTime: 30_000 }`, `maxLength={40}`) | `no-magic-numbers` skips both: the first by its `detectObjects: false` default, the second always (read in the rule source, ESLint 10.13, ADR 0034). Run |
| A feature with over 30 files or 5,000 lines | No rule counts a folder. Not run |
| A change recorded in the lock with a false reason | `check:ui` sees the hash, not the reason. A Claude Code hook stops an agent from running it (ADR 0026), and the lock's diff goes to the code owner. Run |

## Inline disables: none

Inline disables and TypeScript directives are **forbidden**, not "allowed with a reason". `eslint.no-suppress.js` makes them inert (`noInlineConfig`) and an error, and `check-suppressions.mjs` backs it up. Full policy, alternatives, enforcement layers, and the agent protocol: [`no-suppression.md`](no-suppression.md). Add `...noSuppressConfig` **last** in `eslint.config.js`, so a later config object cannot re-enable what it turns off (`check-lint-integrity.mjs` fails if it does).

## Pre-commit

Run formatter + lint on staged files; `typecheck` and tests run in CI (and locally before PR). Hook manager (lefthook, husky, etc.) is a team choice.

## After each agent edit (Claude Code)

The `format-and-lint` hook (ADR 0036, installed by `install.sh`) runs after every `Edit` and `Write` on the edited file only:

1. `prettier --write`, so `check` does not fail on formatting later.
2. `eslint --fix --max-warnings 0` on `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.jsx`, and `.tsx` files. In `src/shared/ui/` it runs without `--fix`: an automatic fix there would change a generated primitive (`tailwind-shadcn.md`, "Changing a primitive").
3. Errors that remain reach the agent at once (exit 2). Fix the cause in the same turn, as for any lint error; never suppress it (`no-suppression.md`).

It uses the app's own Prettier and ESLint, so `.prettierignore` and the ESLint ignores decide what it skips, the same as `check` and `lint`. It is a fast loop for one file, not a gate: it cannot see another file the edit broke, and it does not run `typecheck` or tests. Run the gates before a PR as usual. Only Claude Code runs hooks; other agents get the same feedback from `lint` and CI.

## Boundary rules (verified 2026-10-24)

Config: [`docs/examples/eslint.boundaries.js`](../examples/eslint.boundaries.js). `install.sh` copies it to the app root, installs `eslint-import-resolver-typescript` (resolves the `@/*` alias), and wires `boundariesConfig` into `eslint.config.js` (through `eslint.ai-docs.js`). Do not wire it by hand.

Verified (2026-10-24) with ESLint 10.13, eslint-plugin-boundaries 7.2.0, typescript-eslint 8.72, TypeScript 6.0.3 on a fixture project: all 21 deliberate violations were reported and valid files produced no boundary errors. The service → db rule was added after a design-principles review found that gap. **Not yet run in the real app** (with the scaffold's own ESLint config); run it there and fix any mismatch in folder patterns.

| Case | Result |
|---|---|
| routes → feature internals (service, db schema) | error |
| feature A → feature B internals (alias import, relative path, dynamic `import()`) | error |
| feature → `routes/`; `shared` → any feature | error |
| UI → service / repository / db (also `import type`, re-export, dynamic import) | error |
| server function → repository / db / UI | error |
| service or repository → UI; repository → service or function | error |
| service → the feature's `db/` tables (also `import type` and dynamic import); service → server function | error |
| service → repository, service → `shared` db client (for transactions) | allowed |
| UI, hooks, `queries.ts`, a page route, `index.ts`, `schemas.ts`, `errors.ts`, `events.ts`, `shared/ui`, `shared/lib`, or `shared/hooks` → `shared/db/` | error (ADR 0021, ADR 0022, checked 2026-10-31) |
| repository or a route under `src/routes/api/` → `shared/db/` | allowed |
| feature importing its own `index.ts` | error |
| a feature's `errors.ts` → service, repository, server function, `db/`, UI, or its own `index.ts` (it stays pure) | error |
| another feature importing `errors.ts` directly (it goes through `index.ts`) | error |
| UI or page routes → another feature's `index.server.ts` | error (server code would reach the client bundle; the bundler also fails the build) |
| a route under `src/routes/api/**` → a feature's internals (`server/*.service.ts`) | error (ADR 0012, checked 2026-10-31) |
| UI → a listener; service or repository → a listener; listener → repository, `db/`, or UI | error |
| a feature's `events.ts` → service, repository, server function, listener, `db/`, UI, or an entry point (it stays pure) | error |
| a feature importing its own `index.server.ts` | error |
| a `*.rules.ts` file → service, repository, `db/`, UI, an entry point, or `shared` other than `shared/lib` and `shared/errors` | error (ADR 0013, checked 2026-10-31) |
| UI, `queries.ts`, server function, listener, repository, `index.ts`, or another feature → a `*.rules.ts` file | error (ADR 0013) |
| service, `index.server.ts`, or `__tests__` → a `*.rules.ts` file | allowed |
| server function, service, or listener → another feature's `index.server.ts`; a route under `src/routes/api/**` → a feature's `index.server.ts` | allowed |
| routes or feature → another feature's `index.ts`; anyone → `shared`; `__tests__` → service/repository | allowed |
| external packages and `node:` modules | not checked (plugin default `checkAllOrigins: false`) |

Behavior that is not obvious from the plugin README (read from the plugin source and confirmed by running it):
- Imports **inside the same element are not checked unless `checkInternals: true`**. Every layer rule depends on it.
- Policies are evaluated in order and a **later matching policy overrides an earlier one**; `default: 'disallow'` rejects anything unmatched.
- Files outside any element (`src/router.tsx`, `src/start.ts`, generated route tree) are not checked (`checkUnknownLocals` defaults to false).
- A file inside a feature that matches no category (for example a new `src/features/x/utils/` folder) gets **no layer rules** from this plugin, so `check:gates` rejects it (ADR 0022). A new folder needs a change to `boundaries/files` and to `FEATURE_FILE` in `check-lint-integrity.mjs`, reviewed by a human.
- A colocated `*.test.tsx` under `components/` counts as both `ui` and `test` and therefore cannot import service/repository. Put such tests in `__tests__/`.
- `boundaries/element-types`, `entry-point`, and `no-private` are marked deprecated in the package source in favor of `boundaries/dependencies`. Do not use the old names.
- The plugin's documentation site (jsboundaries.dev) was not reachable when this was written. Option names come from the installed package and the run above. Re-check them when upgrading the plugin.
