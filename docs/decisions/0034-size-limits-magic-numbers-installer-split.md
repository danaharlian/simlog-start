# 0034 Lint for size limits and magic numbers, named principles, and an installer split by stage

- Status: accepted
- Date: 2026-11-06
- Deciders: owner, via chat: asked whether the repo applies readability, maintainability, DRY, KISS, YAGNI, single responsibility, separation of concerns, no magic numbers or strings, a tidy folder structure, comments, and unit tests; then, to the three gaps the agent reported, "kerjakan semuanya". The limits are the ones `design-principles.md` already stated; the exemptions, rule options, and module layout are the agent's and can be reversed by a new ADR
- Extends: ADR 0021 (code rules), ADR 0022 (gate tests), ADR 0023 (CI), ADR 0011 (component size)

## Context

A review of the repo against those principles on 2026-11-06 found each of them in the docs, and three gaps:

- **The complexity limits were review only.** `design-principles.md` listed function under 50 lines, nesting under 4, parameters under 5, file under 300, and said "No lint rule enforces these today". `components.md` and ADR 0032 named the reason: changing `eslint*.js` needs a human. Magic numbers outside Tailwind were also review only.
- **DRY, KISS, and YAGNI were never named.** The rules existed (one owner per piece of knowledge, the abstraction gate, the speculative generality smell), but a reader searching for the names found nothing.
- **The repo's own code broke its own limits.** `install.mjs` was 1,060 lines, with `moveShadcnFiles` at 59 lines and `patchComponentsJson` at 56. It repeated the number `12` three times in `verify()`, and had three directory walks (`walk`, `listFiles`, `filesImporting`). Its pure helpers (`parseJsonc`, `matchBracket`) had no unit test.

## Decision

1. **Lint enforces the size limits** in `src/**/*.{ts,tsx}` (`eslint.code-rules.js`): `max-lines-per-function` 50, and 200 in a `.tsx` file, so a component meets the "split over 200" line of `components.md`; `max-lines` 300; `max-depth` 3; `max-params` 4. Lines count code only (`skipBlankLines`, `skipComments`), so a why-comment never pushes a file over. "Under N" became "at most N-1" for nesting and parameters, and "at most N" for lines.
2. **Lint rejects magic numbers** with core `no-magic-numbers`: ignored are -1, 0, 1, array indexes, default values, enum members, numeric literal types, and type indexes; `enforceConst` is on; object property values are not checked (`detectObjects: false`). JSX props are always skipped by the rule.
3. **Exempt from 1 and 2:** tests (`__tests__/`, `*.test.ts(x)`) and generated primitives in `src/shared/ui/`. An `app-*` file there is our code and is checked, through a negated pattern in `ignores`.
4. **`check:gates` protects them:** for every covered file, each rule must be `error`, no limit may be raised, and `no-magic-numbers` must keep `enforceConst` and ignore nothing beyond -1, 0, 1.
5. **Named principles:** `coding-standards.md` gains a table from each principle (readability, maintainability, DRY, KISS, YAGNI, SRP, separation of concerns, magic values, folders, comments, tests) to the rule that holds it and the check that enforces it.
6. **The installer is split by stage** into `installer/` (`context`, `files`, `jsonc`, `manifest`, `copy-docs`, `quality-gates`, `patch-config`, `shadcn`, `pnpm`, `report`). `install.mjs` keeps the argument parsing and the order of stages. One `listFiles()` replaces the three walks, `FAILURE_LINES_SHOWN` names the `12`, and the long functions are split. The installer copies `installer/` into the app with `install.mjs`; `eslint.ai-docs.js` and `.prettierignore` ignore it. Behavior and output are unchanged.
7. **The check scripts keep their own `walk()`.** Each is installed into the app as one file with no shared module; a comment at each copy says so.
8. **`scripts/test-installer.mjs`** unit-tests `parseJsonc`, `matchBracket`, `indentOf`, and `listFiles`; CI runs it in the `docs` job.

Changed: `AGENTS.md`, `README.md`, `docs/03-standards/coding-standards.md`, `components.md`, `linting-and-formatting.md`, `docs/02-architecture/design-principles.md`, `docs/decisions/README.md`, `docs/examples/eslint.code-rules.js`, `check-lint-integrity.mjs`, `check-ui.mjs` (comment), `scripts/check-docs.mjs` (comment), `scripts/test-gates.mjs`, `.github/workflows/ci.yml`, `install.mjs`. Added: `installer/`, `scripts/test-installer.mjs`.

## Consequences

- **The limits are hard.** With zero suppressions, a 51-line function or a 301-line file cannot merge. "Generated files and tables of data are exempt" now holds for generated primitives only: a long data file is split, or its data moves to a migration (`database.md`, "Seeds").
- **Every number gets a name.** `z.string().max(200)` fails; `const NAME_MAX_LENGTH = 200` in `schemas.ts` passes, which is the owner the magic value smell already asked for. `setTimeout(fn, 1000)` and `price * 100` need a named constant too.
- **A file marked as our code in `shadcn-primitives.lock.json`** but not named `app-*` is not checked by these rules: ESLint cannot read the lock. Nothing limits this; review does.
- **A number in an object property or a JSX prop passes.** `linting-and-formatting.md` lists both as uncaught.
- **Apps installed before this ADR** get the rules on their next install and may fail `lint` until code is split. The first run of the new installer on such an app is not tested.
- **The installer is eleven files instead of one.** Copying it by hand means copying `installer/` too (`README.md`).

## Not verified

- That the limits fit a large real feature: **Unknown**. The real Start scaffold (shadcn 4.23.0) passes every gate; it holds little code of ours.
- `check-docs.mjs` (now 385 lines) is over the 300 the app lint sets. It is not app code and is copied into the app as one file; it was not split.
- The new installer tests were written after the code, not test-first: they pin behavior that existed.
- Windows paths for the new `listFiles()`: not run. It builds paths with `/`, as the replaced `listFiles` did; the replaced `walk` used `path.sep`.

## Alternatives considered

- **Warnings instead of errors.** `lint` runs with `--max-warnings 0`, so a warning fails the same way, and a separate warn-only run would be a new script nobody reads.
- **`@typescript-eslint/no-magic-numbers` and `@typescript-eslint/max-params`.** Core ESLint 10.13 already has the TypeScript options (`ignoreEnums`, `ignoreNumericLiteralTypes`, `ignoreTypeIndexes`, `countThis`), read from the installed rule schemas; one fewer plugin rule to keep in step.
- **`complexity` (cyclomatic).** No document sets a number for it; adding one would be a new limit, not the enforcement of an existing one.
- **Exempting files by a `.data.ts` suffix.** A new naming rule for one case nobody has met yet.
- **A shared module for the check scripts' `walk()`.** Each script would need a second file in the app and a change to every install; three ten-line copies cost less.

## Verification

Docs consulted (2026-11-06):

- eslint@10.13.0, installed in a scratch fixture: rule schemas of `max-lines`, `max-lines-per-function`, `max-depth`, `max-params`, `no-magic-numbers` read from `eslint/use-at-your-own-risk` `builtinRules`; none is deprecated. `no-magic-numbers` source, "Always allow radix arguments and JSX props".
- ESLint v10.5.0 docs through Context7 `/eslint/eslint/v10.5.0`: `no-magic-numbers` options (https://github.com/eslint/eslint/blob/v10.5.0/docs/src/rules/no-magic-numbers.md); negated patterns in a config object's `ignores` (https://github.com/eslint/eslint/blob/v10.5.0/docs/src/use/configure/configuration-files.md).
- typescript-eslint@8.72.1 and @tanstack/eslint-config@0.4.0: `calculateConfigForFile` showed that neither sets these rules.

Runs on macOS, Node 24.22.1, pnpm 12.16.1:

- Fixture: a 50-line function passes and 51 fails; a 200-line `.tsx` component passes and 201 fails; nesting 3 passes and 4 fails; 4 parameters pass and 5 fail; `z.max(200)`, `n / 2`, and `let x = 5` fail; `{ staleTime: 30_000 }`, `list[2]`, `at(-1)`, `page - 1`, a default value, a literal type, an enum, and `maxLength={40}` pass; a long test file and a generated primitive pass; `shared/ui/x/app-util.ts` is checked.
- `node --test scripts/test-gates.mjs`: 129 of 129 (121 before; the new tests cover each limit at its edge, the exemptions, and 8 ways of weakening the rules that `check:gates` must reject).
- `node --test scripts/test-installer.mjs`: 15 of 15. `node --test scripts/test-check-docs.mjs`: 75 of 75. `node scripts/check-docs.mjs`: 0 errors, the same 21 warnings as before (third-party skills over budget).
- `bash scripts/test-real-app.sh` with the split installer: exit 0; 8 of 8 gates PASS on each of the four runs (first install, second install, primitive flow, Drizzle flow); `build` passes; `preview` answers 200; the second install changes nothing. The installer copied the ten `installer/` files into the app.
- A run before the split, with the new lint rules and the old installer, also passed on the real app.
