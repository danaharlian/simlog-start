# No Suppression Policy

**When to read:** when a type or lint error blocks you, before adding any comment or cast to get past it, and when changing lint, TypeScript, or CI config.

## Policy

Zero suppressions. Fix the cause. These are forbidden in source code:

| Forbidden | Examples |
|---|---|
| ESLint directive comments | `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, `/* eslint rule: "off" */` |
| TypeScript directives | `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` |
| Escape-hatch types and casts | `any` (explicit or leaked from `JSON.parse`, `catch`, untyped libs), `!`, `as unknown as T`, `<T>x`, narrowing `as`, `{} as T` |
| Coverage and test shortcuts | `istanbul ignore`, `c8 ignore`, `v8 ignore`, `.only`, `.skip`, `xit`, `xdescribe` |
| Weakening the gates | turning a rule off, adding to ESLint `ignores`, `strict: false`, excluding files from `tsconfig`, dropping `--max-warnings 0` |

Allowed: `as const`, `satisfies`, upcasts, `import type`, and generated files excluded by **config** (`src/routeTree.gen.ts` ships with `/* eslint-disable */` and `// @ts-nocheck` by default; TanStack's docs say to ignore it in the linter and formatter).

## Why mechanical, not just a rule

The scaffold's standard `recommended` config lets almost all of this through (tested 2026-10-24, ESLint 10.13, typescript-eslint 8.72): every `eslint-disable` form, `@ts-expect-error` with a description, `as unknown as`, `!`, object-literal assertions, `JSON.parse` result used as `any`, and `@deprecated` calls passed with no error. An agent blocked by an error takes the cheapest exit. A written rule alone does not stop that, so each exit is closed by a check.

## What to do instead

| The error is caused by | Do this |
|---|---|
| A library symbol, option, or signature that does not exist | You guessed. Re-read the installed `.d.ts` and the docs for the installed version (`verify-library-docs`). |
| Data of unknown shape (JSON, request, env, search params, form values, external API) | Parse with Zod, or write a type guard. Infer the type with `z.infer`. |
| `catch (e)` | Type as `unknown` and narrow with `instanceof Error` (built-ins only; our own errors are plain objects, see `error-handling.md`). |
| Value might be `null`/`undefined` | Handle it: `?.`, `??`, early return, or return `err(appError.notFound(...))` from a service. Never `!`. |
| A library type that is wrong or missing | Write a small typed adapter or a `.d.ts` declaration with a test. If you cannot, stop and ask. Do not cast. |
| A test needs invalid input | Declare the parameter as `unknown`, or call `schema.safeParse`. No casts. |
| A generated file | Exclude the path in config (`ignores`), never with a comment. |
| A rule that is wrong for a whole category of code | Not your call. Propose a config change with an ADR (see Exceptions). |

## Enforcement layers

| # | Layer | File (in `docs/examples/`) | Catches | Status |
|---|---|---|---|---|
| 1 | ESLint config | `eslint.no-suppress.js` | `noInlineConfig` makes directives inert; `no-use` errors on them; `ban-ts-comment` bans all three `@ts-*`; `no-explicit-any`, `no-unsafe-*`, `no-non-null-assertion`, `no-unsafe-type-assertion`, `consistent-type-assertions`, double and angle-bracket assertions, `no-deprecated`, plus the `class` ban (ADR 0006) | **Verified**: 19 fixture forms flagged (class ban: declaration and expression flagged, 2026-10-27), clean file passes, generated file ignored |
| 2 | Text backstop | `check-suppressions.mjs` | Directive comments, coverage ignores, `.only`/`.skip`, even if ESLint config is broken. `--diff <range>` checks added lines only | **Verified** in a temp git repo |
| 3 | Gate integrity | `check-lint-integrity.mjs` | Per-path rule overrides, new `ignores`, `strict` or any strict flag off, files left out of `tsconfig`, missing `--max-warnings 0`, `noInlineConfig` off, selectors removed by a later config, the rules in `eslint.code-rules.js` turned off or loosened | **Verified**: 7 deliberate weakenings all caught; 6 more for the code rules (ADR 0021) |
| 4 | Agent hook (Claude Code only) | `no-suppress.hook.mjs` + `claude-settings.hooks.json` | After each `Edit`/`Write`, exits 2 with the findings so the agent fixes them in the same turn | Config shape and exit-2 behavior from the Claude Code docs; script tested with mock input; **not yet run in a live session** |
| 5 | Human ownership | `CODEOWNERS.example` | Changes to the gate files need an owner's review | Needs "Require review from Code Owners" turned on by a human; **not verified here** |
| 6 | Review | skill `code-review` | Any suppression or gate weakening is blocking | Procedure |
| 7 | Learning | pipeline phase 11 | A repeated shortcut becomes a new check | Procedure |

Layers 1 to 3 are agent-agnostic and run in CI. Layer 4 only helps Claude Code; other agents rely on 1 to 3.

## Wiring in the app

Run `bash /path/to/ai-coding-docs/install.sh` from the app root (see the root `README.md`). It does all of the following, and the `--verify` option re-checks them:

- Generates `eslint.ai-docs.js` (ignores `docs/**` and `src/routeTree.gen.ts`, then the boundary, code-rule, and no-suppression configs) and imports it **last** in `eslint.config.js`. Typed linting needs the app's `tsconfig.json` to include every source file.
- Copies `check-suppressions.mjs`, `check-lint-integrity.mjs`, and `check-ui.mjs` to `scripts/`, the hooks to `.claude/hooks/` (`no-suppress.mjs`, `format-and-lint.mjs`, `protect-ui-lock.mjs`, `protect-migrations.mjs`), and merges the hook settings into `.claude/settings.json`.
- Adds the scripts `check:suppressions`, `check:gates`, `check:ui`, `check:docs`, `typecheck`, and `test`. `lint` must stay `eslint . --max-warnings 0`.
- Adds to `tsconfig.json` the flags `check-lint-integrity.mjs` requires: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules` (see `typescript.md`).
- Creates `.github/CODEOWNERS` from `CODEOWNERS.example` (`--owner` sets the owner).

Still manual: CI runs `lint`, `typecheck`, `check:suppressions`, `check:gates`, `check:ui`, and on pull requests `node scripts/check-suppressions.mjs --diff origin/<base>...HEAD` (needs full git history); and turn on the branch protection setting "Require review from Code Owners".

If the installer cannot patch a config (an unusual `eslint.config.js` or `tsconfig.json`), it says so and prints the exact lines to add. Do the same by hand, then run the installer with `--verify`.

## When you are blocked (agent protocol)

1. Read the error. Identify the cause using the table above.
2. Fix the cause. If you needed more than two attempts, re-verify the API against the docs (rule zero).
3. Still blocked, or the cause is a library bug? **Stop and ask the human.** State the error, what you verified, and the options.
4. Never: add a directive, cast through `unknown`/`any`, rename or disguise a directive to dodge the text check, edit gate config or scripts, or skip or delete a failing test. Doing so is a rule-zero violation even if CI would pass.
5. If a suppression already exists in code you were asked to change, do not copy it. Report it and fix it if it is in scope.

## Exceptions

There is no inline exception. A legitimate exception is a **config change reviewed by a human**: an ADR stating the path, the rule, the reason, and the expiry; a per-path override in `eslint.config.js`; and the matching allowance in `check-lint-integrity.mjs`. Agents do not make these changes unprompted.

## Known limits

- `check-suppressions.mjs` is a text scan: a string literal that contains `// eslint-disable...` is flagged. Rewrite the string.
- Layer 1 depends on rule names and options of the installed typescript-eslint and eslint-comments versions. Re-verify after upgrading either: a renamed or removed rule makes ESLint fail to load the config, and the integrity script fails if a required rule or option changes.
- `no-unsafe-type-assertion` rejects narrowing casts such as `event.target as HTMLInputElement`. Use type guards or `instanceof`. It may flag existing scaffold code: run `pnpm lint` in the real app and fix, do not suppress. **Not yet run in the real app.**
- Nothing here can stop a human from merging a weakened gate if branch protection is off.
