# 0021 Reference template comparison: master document and the no-class ADR

- Status: accepted (decision AF applied by the owner's approval on 2026-10-31)
- Date: 2026-10-31
- Deciders: owner asked for our own version and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0006, ADR 0014, ADR 0015, ADR 0016

## Context

The owner supplied `AGENTS.md`, `CLAUDE.md`, and `002-functional-style-no-classes.md` from a Next.js project (Server Actions, Prisma, `_tag`) as references, usable in part or in full. Earlier comparisons had absorbed most of their content, so this one looked for what was still missing and tested what our documents claim is enforced.

Facts checked on 2026-10-31 in a fixture: TypeScript 6.0.3 strict, ESLint 10.13.0, typescript-eslint 8.72.1, `@tanstack/eslint-config` 0.4.0, `eslint-plugin-boundaries` 7.2.0, and this repo's `eslint.boundaries.js` and `eslint.no-suppress.js`. A control case (UI importing a service, declaring a class) was rejected, so the gates were active.

1. **`linting-and-formatting.md` was wrong.** It listed "exhaustive switch" as linted, while `design-principles.md` said the rule was not configured. A `switch` with a missing case in a `void` function, and one with a catch-all `default`, pass both `lint` and `tsc`. With a missing case in a function returning a value, `tsc` fails (TS2366) and lint passes.
2. **UI and page routes can reach the database client.** A component, a hook, and a page route importing `shared/db/client` all pass lint. ADR 0014 noted this for imports and left it; the reference makes the opposite a critical rule.
3. **Other habits pass every gate:** `export default` in a feature, `process.env` in a service, `console.log` in a service. ADR 0011 and 0015 found these one at a time. `AGENTS.md`, the one file always loaded, named none of them, so an agent learned them only after opening the right document.
4. **The class ban has no easy way around.** A class declaration fails lint. A constructor function fails on `new`: `tsc` TS7009 and `no-unsafe-assignment`. A closure factory passes both.
5. **`typescript.md` said "the first group" and "the second"** above a table with no groups, so the reader could not tell which features were expected.
6. **Our docs never said an `AppError` has no stack trace,** the main cost the reference's ADR records for this design.
7. **`llms.txt` exists for most of the stack.** 200: `tanstack.com`, `orm.drizzle.team`, `zod.dev`, `www.better-auth.com`, `ui.shadcn.com`, `base-ui.com`. 404: `tailwindcss.com`.
8. **Rule zero's own example still holds.** The Start server functions guide (fetched as `.md`) has `.validator(` 7 times and `inputValidator` 0 times.
9. **Our ADRs outgrew their template.** ADRs 0009 to 0020 each add a "Not verified" section that `adr.md` does not have, though `writing.md`, rule 5, asks for that content.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| Critical rules, always loaded | Only rules no gate catches, in a new section; one line naming what lint now rejects (decision AF) | `AGENTS.md` |
| "NEVER use `class`" | One clause | `AGENTS.md`, non-negotiables |
| Layer rule for the presentation layer | Direction inside a feature; `shared/db/` rule | `AGENTS.md`, skill `code-review` |
| "Mandatory" and "Standard" priority column | "Required" and "When useful", fixing fact 5 | `typescript.md` |
| ADR-002 table: what replaces a class | The same table, plus a tested closure factory | `typescript.md` |
| ADR-002: no stack traces on `AppError` | Table row, and what to do instead | `error-handling.md` |
| `llms.txt` references | A way to find a page when Context7 fails; no copies | `mcp.md` |
| ADR format: risks, reason per alternative | Risks, "Not verified", and a reason per alternative | `templates/adr.md` |

**Corrected, found by this comparison:** fact 1 in `linting-and-formatting.md`, with new tables of the code rules and of what the gates do not catch; `design-principles.md`; pass 5 and 9 of skill `code-review`.

**Already present, checked and unchanged:** the five rules and priority order (`coding-standards.md`); durable events (`cross-feature-communication.md`); risk-based checks (`testing.md`, `templates/qa.md`); product readiness (`templates/prd.md`, "Gate readiness"); tool availability (`mcp.md`); form and table rules (`tanstack-form.md`, `tanstack-table.md`); Tailwind tokens (`tailwind-shadcn.md`).

### Not adopted

| From the reference | Why |
|---|---|
| Two full copies of the master file, `AGENTS.md` and `CLAUDE.md` | They drift. Our `CLAUDE.md` imports `AGENTS.md` |
| Guardrail matrix with pinned versions in the master file | Versions come from `package.json` and `versions.md`. A number here goes stale |
| 21 critical rules and the TypeScript table in the master file | Most are enforced by a gate or live in one document. Tier 0 has a 120-line limit, and a rule repeated in two places drifts |
| `_tag`; `success`, `Success`, `Failure`, `ActionResult` | ADR 0006: `kind` and `ok` |
| Server Components, Server Actions, `"use client"`, `NEXT_PUBLIC_`, Prisma | Next.js and Prisma; equivalents in `tanstack-start.md` |
| `console.*` allowed in client components | ADR 0015: the same component also runs during SSR |
| Pages "< 30 LOC" | `tanstack-router.md` already aims for about 20 lines, and neither number is a gate |
| "Never" arbitrary values, with no exception | ADR 0011 |
| `.agents/rules/` constitution files | ADR 0016 |
| `docs/references/` with offline `llms.txt` copies | Conflicts with reading the installed version. A copy goes stale; `README.md` states this repo stores rules, not library docs |
| eslint MCP, Prisma MCP, shadcn MCP | `pnpm lint`, `drizzle-kit`, and the CLI; ADR 0007, N |
| ADR-002: `new Error()` counted as a class | `new` on a library class stays allowed (`typescript.md`, rule 15). `withErrorBoundary` needs a thrown `Error` |
| ADR-002: `ERROR_STATUS_MAP` falling back to 500 | Our status lookup is keyed by `kind` with `satisfies Record`, so a missing entry fails typecheck |
| ADR "Parent Index" and "References" sections | `decisions/README.md` is the index; `Extends` and the text link the rest |

## Consequences

- `AGENTS.md` stays under its limit of 120 lines. Its new section lists only what no gate checks.
- `templates/adr.md` adds a section. Existing ADRs stay as written.
- **Effect on existing apps:** code that already breaks the code rules below fails `lint` once the installer updates the gates. A team-edited `eslint.ai-docs.js` is kept and reported, and then `check:gates` fails until it adds `codeRulesConfig`.

## Decision AF: enforce these rules in lint (applied)

**Owner decision (2026-10-31): approve all five, and every script must pass afterward.** This reverses the "no gate change" part of this ADR's first version. Rules are in `docs/examples/eslint.code-rules.js`; the `shared-db` category and three policies are in `eslint.boundaries.js`; `check-lint-integrity.mjs` guards them; the installer copies and wires the new file. All five make the gates stricter.

### Run in a real app

A Start app from `pnpm dlx shadcn@latest init -t start -b base -p nova` (shadcn 4.23.0, Start 1.169.4), set up by the changed `install.sh`, with ESLint and the installer's pinned versions.

| Script | Scaffold only | Scaffold, a feature, and 14 primitives after the fixes below |
|---|---|---|
| `lint` | pass | pass (42 files, 0 problems) |
| `typecheck` | pass | pass |
| `test` | pass (no tests) | pass (1 test) |
| `check:suppressions`, `check:gates`, `check:docs` | pass | pass |
| `build` | pass | pass |
| `preview` | `/` 200 | `/` and `/invoices` 200; `/api/health` 200 JSON; `/api/invoices` 404 with `{ error }` |

The feature followed our documents: `errors.ts`, `schemas.ts`, `*.rules.ts`, repository, service, a `createServerFn` with `.validator`, both entry points, a component, a page route, two server routes, env modules, logger, `withErrorBoundary`, and `createRateLimiter`. `pino` and the invoice message were absent from `dist/client`.

| Must fail | Result |
|---|---|
| `switch` on a union: missing case in a `void` function; catch-all `default` | `switch-exhaustiveness-check` |
| `export default` in a service | `import/no-default-export` |
| `process.env.X`; `const { env } = process` | `no-restricted-properties` |
| `console.log` in a service | `no-console` |
| Component, hook, or page route importing `shared/db/client` | `boundaries/dependencies` |

| Must pass | Result |
|---|---|
| `switch` listing every variant, with a `never` check and with none; `switch` on a `string` with `default` (fixture) | Clean |
| `process.env` in `env.server.ts`; `import.meta.env` in `env.ts`; `export default` in `src/server.ts` (fixture) | Clean |
| Repository and a route under `src/routes/api/` importing `shared/db/client` | Clean |

**`check:gates` failed on all 6 weakenings:** the switch rule off; its `considerDefaultExhaustiveForUnions` set to true; `no-default-export`, `no-console`, and `no-restricted-properties` off for `src/features/**`; `no-restricted-properties` pointed at another property.

**`check` (Prettier):** passed on the scaffold. With the feature and primitives added it failed on 26 files, 6 of them generated primitives, and passed after `pnpm format`; every script above passed again after that.

**A team-edited `eslint.ai-docs.js`:** with `codeRulesConfig` removed, the installer kept the file and reported it, and `check:gates` failed.

**Upgrade:** an app installed from a copy of this repo without these changes, then updated by the changed installer, created `eslint.code-rules.js`, updated `eslint.ai-docs.js` and the integrity script, and passed all five installer gates. A second dry run on an up-to-date app reported 130 files unchanged.

### Found while running it

`field.tsx` and `sidebar.tsx`, generated by shadcn 4.23.0, fail lint with 8 errors. None comes from the five new rules: they are the existing `no-unnecessary-condition`, `no-shadow`, `consistent-type-assertions`, and `no-unsafe-type-assertion`. So this was already true, and `tailwind-shadcn.md` had recorded it as **Unknown**. The other 12 primitives tried pass as generated.

The fix uses a `declare module 'react'` for CSS variables and no cast or suppression (`tailwind-shadcn.md`). Ignoring `shared/ui` was rejected: `ALLOWED_IGNORED` would have to change, and generated code would then escape every gate. The installer does not patch these files, because they exist only after `shadcn add`.

**Known limits:** `import.meta.env` has no rule, because the selector would have to be merged with `eslint.no-suppress.js` and given an exception in `env.ts`. `no-console` covers only `server/` and `shared/server/`. The first trial of the page route policy, with a `noneOf` filter on file categories, did not reject the import; the form now in the gate does.

## Not verified

- A real database: `shared/db/client` in the app above is a stub, so no Drizzle code ran under the new rules. `db/schema.ts` files are not `shared-db` and are not affected.
- The sidebar in a browser, after the fixes. `preview` was requested with `curl`; no page was rendered in a browser, and no generated primitive was on a page except `button`.
- A CI run. Scripts ran locally on Node 24 with pnpm 12.16.
- Whether a framework file inside `src/features/` or `src/shared/` needs a default export: none appeared, and none was searched for further.
- Whether each `llms.txt` describes the installed version. Only the HTTP status and first line were read.
- `createRateLimiter` at runtime: type-checked, linted, and built, with no test run.
- A rule in `AGENTS.md` changing what an agent writes. The new section was read, not run against an agent.

## Alternatives considered

- **Copy the reference's master file, renamed to the stack.** It would exceed the 120-line limit on its own and repeat most of `docs/`. Rejected.
- **List every rule in `AGENTS.md`, as the reference does.** A rule a gate enforces reports itself when broken, so it adds length and no protection. Only rules with no gate were added, plus the class ban, which changes how code is first written.
- **Keep the rules in documents only.** Review misses what a tool would catch, and facts 1 to 3 show it had. Rejected once the owner approved decision AF.
- **Put the code rules in `eslint.no-suppress.js`.** That file is about suppression, and a later `no-restricted-syntax` block would replace its selectors. A separate file keeps both clear.

## Verification

Docs consulted (2026-10-31): `@tanstack/react-start`: server-functions guide (tanstack.com/start/latest, `.md` page). `llms.txt` at the six sites named in fact 7: status and first line. typescript-eslint 8.72.1, `@tanstack/eslint-config` 0.4.0, and `eslint-plugin-boundaries` 7.2.0: behavior through the runs above; their docs were not read. Context7 was not needed and not used.
