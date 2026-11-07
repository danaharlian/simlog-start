# Decisions (ADRs)

**When to read:** before introducing a dependency, changing architecture, or when a document says "decision" / "ADR".

Use `docs/templates/adr.md`. Number sequentially `NNNN-title.md`. Status: `proposed` → `accepted` → `superseded by NNNN`.

## Accepted

- [0001 Feature-driven modular monolith](0001-feature-driven-modular-monolith.md)
- [0002 Verify-first agent documentation](0002-verify-first-agent-docs.md)
- [0003 Tooling baseline from the scaffold](0003-tooling-baseline.md)
- [0004 No suppression policy](0004-no-suppression-policy.md)
- [0005 Pipeline revision](0005-pipeline-revision.md)
- [0006 Error model: plain-object errors and `Result`](0006-error-model.md)
- [0007 Resolved open decisions](0007-open-decisions-resolved.md)
- [0008 React Table v9 and Drizzle 1.0 release candidate](0008-table-v9-and-drizzle-v1-rc.md)
- [0009 Cross-feature communication: two public entry points and typed events](0009-cross-feature-communication.md)
- [0010 Reference template comparison](0010-reference-template-comparison.md)
- [0011 Reference template comparison: coding standards, components, conventions](0011-coding-component-conventions-comparison.md)
- [0012 Server routes reach services through `index.server.ts`](0012-server-routes-reach-services.md)
- [0013 Pure business rules in a linted `*.rules.ts` file](0013-pure-business-rules-file.md)
- [0014 Reference template comparison: data fetching and database](0014-data-fetching-database-comparison.md)
- [0015 Reference template comparison: standards, tooling, and the master document](0015-standards-tooling-comparison.md)
- [0016 Reference template comparison: pipeline, templates, rules, and skills](0016-pipeline-templates-comparison.md)
- [0017 Pipeline order: research before the PRD, separate spec and task gates, staging before release](0017-pipeline-order.md)
- [0018 Approval modes, merged gates, language of specs, and a narrower ADR exception](0018-approval-and-gate-owners.md)
- [0019 Tier consistency, unknown artifact files, chat quotes, and a kept test for the check](0019-check-hardening.md)
- [0020 Decision authority per phase](0020-decision-authority.md)
- [0021 Reference template comparison: master document and the no-class ADR](0021-master-document-comparison.md)
- [0022 Gate holes after ADR 0021, and installer cleanup](0022-gate-holes-and-installer-cleanup.md)
- [0023 CI for the docs repo](0023-ci-for-the-docs-repo.md)
- [0024 shadcn skill composition and UI rules](0024-shadcn-skill-composition.md)
- [0025 `check:ui`: arbitrary values and changed primitives](0025-check-ui-gate.md)
- [0026 Primitive flow test and a hook for the UI lock](0026-primitive-flow-and-lock-hook.md)
- [0027 shadcn MCP server: find with MCP, read and add with the CLI](0027-shadcn-mcp.md)
- [0028 One MCP config: `.mcp.json` for Claude Code and VS Code](0028-one-mcp-config.md)
- [0029 Drizzle MCP server and skill](0029-drizzle-mcp-and-skill.md)
- [0030 Better Auth MCP server and skills](0030-better-auth-mcp-and-skills.md)
- [0031 QA and review check races and deprecation](0031-qa-concurrency-and-deprecation.md)
- [0032 Concurrency mechanisms, review smells, traceable comments, and fixed display format](0032-concurrency-mechanisms-smells-comments-format.md)
- [0033 Environment comparison: variables table, one env file, databases per environment, agent deny rules](0033-environment-comparison.md)
- [0034 Lint for size limits and magic numbers, named principles, and an installer split by stage](0034-size-limits-magic-numbers-installer-split.md)
- [0035 Fresh cross-feature queries after a mutation](0035-cross-feature-query-freshness.md)
- [0036 Format and lint each file an agent edits](0036-format-and-lint-hook.md)

## Resolved

Scaffold: `pnpm dlx shadcn@latest init -t start` (checked 2026-10-15 in the shadcn CLI docs). Package.json audited 2026-10-18.

| Decision | Value | Source |
|---|---|---|
| Package manager | **pnpm** | stated by the owner |
| Path alias | `@/*` → `src/*` | set by the TanStack CLI |
| ORM | **Drizzle** (the scaffold's Prisma packages are to be removed) | stated by the owner |
| Lint / format | **ESLint 10 + typescript-eslint + Prettier**, `lint` runs with `--max-warnings 0` | installed |
| Pipeline | 12 phases, 6 gates (PRD, Architecture, Spec, Tasks, PR, Release), tiers S/M/L (ADR 0017; replaces the order in ADR 0005) | owner approval |
| Deploy path | **`main` reaches staging automatically; production only by a human deploy, after the Release gate for tiers M and L** | owner decision; ADR 0017 |
| Approval | **`team`: the reviewer's edit or an official review; `personal`: an explicit chat message may be recorded by an agent; an agent never approves its own work** | owner decision; ADR 0018 |
| Tier and artifact files | **`01-idea.md` holds `Tier:` (M or L); every later `Tier:` line matches it; an unknown numbered file in `specs/<slug>/` is an error** | owner decision; ADR 0019 |
| Decision authority | **One role per decision, in `roles.md`; the script holds the same list and fails if they differ; Spec needs Product Owner and Tech Lead; QA needs QA Lead and Product Owner; six phases with no gate record `Decided by:`** | owner decision; ADR 0020 (replaces the gate owners in ADR 0018) |
| Language | **`docs/`, skills, templates in English; `specs/` text may be Indonesian; fields the checks read are not translated** | owner decision; ADR 0018 |
| Unit of delivery | **A task: one vertical cut, one PR; "slice" is no longer used** | owner decision; ADR 0017 |
| Suppressions | **Zero** inline suppressions, enforced by lint + scripts (ADR 0004) | owner request |
| Import boundaries | **eslint-plugin-boundaries** (replaces the dependency-cruiser suggestion) | installed |
| Authentication | **Better Auth** | installed |
| shadcn primitive base | **Base UI** | installed |
| Postgres driver | **`pg`** (node-postgres), explicit pool options | installed; ADR 0007 (G) |
| Logging | **pino** | installed |
| Zod | **v4 line** | installed |
| Table library major | **v9** (`^9.3.1`) | installed; ADR 0008 (replaces ADR 0007, Q) |
| Hosting runtime (F) | **Node in a container**; platform steps not written yet | ADR 0007 |
| Primary key (H) | **`uuid` with `defaultRandom()`** | ADR 0007 |
| Query defaults (K) | **`staleTime` 30 s**, library `retry` defaults | ADR 0007 |
| `routeTree.gen.ts` (L) | **committed** | ADR 0007 |
| TanStack Intent, CLI MCP (N) | **not adopted** (alpha) | ADR 0007; shadcn MCP adopted by ADR 0027; `drizzle-kit mcp` and `skills` by ADR 0029 |
| Vitest (O) | **5.0.5** | ADR 0007 |
| TypeScript (P) | **stay on `~6.0.x`** (typescript-eslint peer `<6.1.0`) | ADR 0007 |
| Better Auth scope (R) | **email and password only** | ADR 0007 |
| Drizzle versions | **1.0.0-rc.5** for drizzle-orm and drizzle-kit, same exact pin | installed; ADR 0008 (replaces ADR 0007) |
| Pure business rules (V, Z) | **Small rules stay in `*.service.ts`; non-trivial ones may use `server/<name>.rules.ts`, lint category `rules`; no `domain/` folder** | owner approval; ADR 0013 (replaces ADR 0007, V) |
| Accessibility level (W) | **each PRD sets its own** | ADR 0007 |
| Error model, code style, error code location (T, U) | **plain-object `AppError` + `Result`, no classes, codes in `features/<f>/errors.ts`** | ADR 0006 |
| Cross-feature communication | **`index.ts` (client-safe) + `index.server.ts` (server-only); typed in-process events by default; durable outbox only by a new ADR** | ADR 0009 |
| Server route responses | **`{ data }` or `{ error }` with the HTTP status; helpers in `shared/server/http-response.ts`** | ADR 0010 |
| Client state beyond Query, URL, and Form | **`useState`, `useReducer`, context; a store library needs an ADR** | ADR 0010 |
| Form composition | **`createFormHook` once in `shared/ui`; sections with `withFieldGroup`; one mapper for defaults and reset; field `listeners` for reactive logic** | ADR 0011 |
| Data table shell | **`useTable` is the default; `shared/ui/data-table.tsx` is created for the second table** | ADR 0011 |
| Component size | **Target 150 lines, split over 200 unless generated; checked in review. Lint rejects a function in a `.tsx` file over 200 lines of code** | ADR 0011; lint by ADR 0034 |
| Complexity limits | **Lint errors in `src/`: function 50 lines of code (200 in `.tsx`), file 300, nesting 3, parameters 4, no bare number other than -1, 0, 1; tests and generated primitives exempt** | owner request; ADR 0034 |
| Import order | **`import/order` from `@tanstack/eslint-config`; `simple-import-sort` not used** | owner decision; ADR 0011 |
| Server route to service (Y) | **Routes under `src/routes/api/**` may import `index.server.ts` and authenticate their own requests; lint category `route-handler`** | owner approval; ADR 0012 |
| Client-side reads | **Server function as `queryFn`; server routes only for callers outside our UI** | ADR 0014 |
| Enum columns | **`pgEnum` for small, stable sets; list in `schemas.ts`; lowercase values** | ADR 0014 |
| Expected failure after a write in a transaction | **`return tx.rollback()` and return the `Result` from the `catch`** | ADR 0014 |
| Logging a caught error | **pino's `err` key** | ADR 0014 |
| Schema across features (AA) | **No gate change; code holds only the id; FK by custom migration when chosen per relation; no `CASCADE` across features; no schema aggregate or relational queries** | owner decision; ADR 0014 |
| Env modules | **`shared/config/env.server.ts` and `env.ts`; `.env*` git-ignored except `.env.example`** | ADR 0015 |
| Logger path | **`shared/server/logger.server.ts`; JSON output; `pino-pretty` not installed** | ADR 0015 |
| Zod errors in a route response | **`zodErrorDetails`: `formErrors` plus `fieldErrors` keyed by dotted path; not `z.flattenError`** | ADR 0015 |
| Gate outcomes and QA failure | **Four verdicts, no `revision` status; a failed QA runs fix tasks** | ADR 0016 |
| Artifact checks (AE) | **`check-docs` rejects an unfilled placeholder in a final artifact, and an `approved` PRD, architecture review, feature spec, task breakdown, or release whose last Gate review round does not approve** | owner decision; ADR 0016 |
| What `AGENTS.md` lists as a rule | **Rules no gate catches, plus the class ban; everything else stays in `docs/`** | ADR 0021 |
| Code rules in lint (AF) | **Exhaustive `switch`, no default exports in `features/` and `shared/`, `process.env` only in the env modules, no `console.*` in server code, no `shared/db/` from client-reachable code or page routes; a feature file outside the boundary categories fails `check:gates`; `check-lint-integrity` guards them** | owner approval; ADR 0021, ADR 0022 |
| CI for this repo | **GitHub Actions: docs, gates, and a real-app run, on push, pull request, and weekly; actions pinned to a commit SHA; not copied into apps** | owner request; ADR 0023 |
| Installer cleanup and gates | **Removes what its manifest proves it wrote and no longer ships, and empty skill folders; reports edited files; runs `check`, `lint`, `typecheck`, `test`, and the three `check:*`** | owner approval; ADR 0022 |
| Generated primitives | **Linted like other files; a failing one gets a listed fix, never an ignore or a cast** | owner approval; ADR 0021 |
| Changing a primitive and arbitrary values | **No primitive change for one feature; a generic variant needs evaluation and human approval; no arbitrary value in a class name we write, not even `calc()`** | owner request; ADR 0024 |
| UI gate | **`check:ui`: AST scan for arbitrary values and palette colors; hash lock that classifies every file in `shared/ui`; baseline on first install** | owner approval; ADR 0025 |
| Recording a primitive change | **A person runs `--accept --reason` and `--forget`; a Claude Code hook blocks an agent from them and from writing the lock; `test-real-app.sh` runs the primitive flow** | owner request; ADR 0026 |
| shadcn MCP server | **In `.mcp.json`, pinned, through `pnpm dlx`; for finding components only; code and adding through the CLI** | owner request; ADR 0027, 0028 |
| MCP config files | **One file, `.mcp.json`, read by Claude Code and VS Code; no `.vscode/mcp.json`** | owner request; ADR 0028 |
| Third-party skill `shadcn` | **Installed as a copy with a local patch; our rules win; `migrate-radix-to-base` not installed** | owner request; ADR 0024 |
| Drizzle MCP server and skill | **`pnpm exec drizzle-kit mcp` in `.mcp.json`; skill copied from the pinned `drizzle-kit` with a local patch; our rules win; a hook blocks `push`, `fix_conflicts`, and `pull` with `init` for agents** | owner request; ADR 0029 |
| Better Auth MCP server and skills | **Remote server in `.mcp.json`, first source for Better Auth docs; all six skills copied with a local patch; our rules win; a plugin still needs its ADR** | owner request; ADR 0030 |
| Races and deprecation | **Each collision point from the spec is tested with concurrent writes against a real database, in the task and in QA; zero deprecated API usage and zero deprecation warnings in DoD, review, and QA (blocking)** | owner request; ADR 0031 |
| Concurrency mechanism | **Never check then write; per race: a constraint, a condition in the write, a `version` column for forms, `FOR UPDATE` or `FOR SHARE` in the writing transaction, or an idempotency key** | owner approval; ADR 0032 |
| Comments and smells | **A `Race:` comment per collision point; a follow-up `TODO` names a task or issue; review flags the smell table in `design-principles.md`** | owner approval; ADR 0032 |
| Display locale and time zone | **`id-ID` and `Asia/Jakarta`, through `shared/lib/format.ts` only; stored instants stay UTC** | owner decision; ADR 0032 |
| Env files and databases | **One file, `.env`; a separate database per environment, test included; `drizzle.config.ts` loads `.env` with `process.loadEnvFile` and picks the test database with `DB_TARGET=test`** | owner approval; ADR 0033 |
| Cross-feature query freshness | **A query that joins another feature's data declares `meta.dependsOn` with the owner's scope; mutation hooks invalidate with `invalidateFeature` from `shared/lib/query-scope.ts`, only when `data.ok`** | owner approval; ADR 0035 |
| Agents and `.env` | **The installer merges `Read` deny rules for `.env` and its local and mode variants into `.claude/settings.json`; `.env.example` stays readable** | owner approval; ADR 0033 |

## Open decisions

| # | Decision | Options / notes | Referenced in |
|---|---|---|---|
| S | Placement and naming of adapters for external services (email, payments, storage) | needs a `boundaries/files` category so layer rules apply | `design-principles.md` |
| X | Performance budgets and how to measure them | Page load, API latency, bundle size: default targets and tooling. The owner's QA template has rows for them; no tooling is installed | `testing.md`, `templates/qa.md` |
| AB | Seed runner | A TypeScript seed needs a runner with alias support; `tsx` would need an ADR | ADR 0014, `database.md` |
| AC | Content Security Policy for a real app | A nonce setup works on a bare page; allowed style, font, and image sources, and component-library inline styles, are not checked | ADR 0015, `tanstack-start.md` |
| AE | A check for a missing later artifact | Warn when a feature stops before `12-measure.md`; needs a rule for features paused on purpose | ADR 0016 |
| AG | What one stored minor unit of IDR is, and `formatMoney` | `Intl` shows IDR with 0 fraction digits; `typescript.md` rule 13 asks for integer minor units. Decide with the first money column | ADR 0032, `components.md` |
| AH | How a test reaches the test database | Lint rejects `process.env` under `src/`, and `serverEnv` reads `DATABASE_URL`. Options: Vitest's `test.env` set from `TEST_DATABASE_URL` in the config, a test-only env module, or a test script that sets `DATABASE_URL`. None verified on Vitest 5 | ADR 0033, `environment.md`, `testing.md` |
| AD | Env check before the container takes traffic | A request middleware fails at the first request; a startup check depends on the hosting setup (F) | ADR 0015, `environment.md` |
