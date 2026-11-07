# AGENTS.md

Entry point for AI coding agents. Keep this file short. Detail lives in `docs/` and is loaded only when the task needs it (progressive disclosure).

## Project

Enterprise web application: feature-driven modular monolith on TanStack Start.

Stack: TanStack Start / Router / Query / Form / Table (v9), Drizzle ORM (1.0 RC) + PostgreSQL, Better Auth, Tailwind CSS v4, shadcn/ui (Base UI), Zod 4, TypeScript (strict), Vitest, ESLint + Prettier.
Installed versions come from `package.json` + lockfile. Never from memory. See `docs/04-stack/versions.md`.

## Rule zero: do not guess

1. Never write a library API, option, import path, package name, CLI flag, or config key from memory. Training data is stale for this stack (example: `createServerFn().inputValidator()` existed in release candidates and was removed in Start 1.0 stable; the current API is `.validator()`).
2. Before touching a library, read `docs/04-stack/<library>.md` (our rules), then fetch official docs for the **installed version** through MCP. See `docs/05-agent-tooling/mcp.md`.
3. Cannot verify? Stop and ask, or leave `TODO(verify): <what>` and say so in your reply. Never fill a gap with a plausible guess.
4. `typecheck`, `lint`, and tests are the arbiter. Fix errors by reading docs. Never by `any`, casts, `@ts-*`, `eslint-disable`, skipped tests, or editing lint/TS config. Blocked? Stop and ask (`docs/03-standards/no-suppression.md`).
5. Every PR/commit description includes a `Docs consulted:` line listing sources used.

## Non-negotiables

- Code lives in `src/features/<feature>/`. `src/routes/` stays thin (compose features, no business logic).
- A feature exposes only `index.ts` (client-safe) and `index.server.ts` (server-only; imported only by server code). Never deep-import another feature's internals. Cross-feature calls and events: `docs/02-architecture/cross-feature-communication.md`.
- Dependency direction: `routes → features → shared`. `shared` never imports from `features`. Inside a feature: `UI → function → service → repository → db`.
- Server function = validate (Zod) + authorize (middleware) + call service. Nothing else.
- Every server function that touches private data has an auth check **in the function/middleware**, not only in `beforeLoad`.
- Server state lives in TanStack Query. Forms use TanStack Form with the feature's Zod schema. No server state in `useState`/global stores.
- TypeScript: zero suppressions. No `any`, no `!`, no narrowing `as` (`as unknown as` included), no `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, no `eslint-disable` in any form. No `class`: use functions, plain objects, and closures. Validate unknown input with Zod at every boundary.
- Lint also rejects: `export default` in `features/` and `shared/`, `process.env` outside the env modules, `console.*` in server-only code, a `switch` on a union with a missing case or catch-all `default`, a dynamic `import()` of a server function (`*.functions.ts`; import it statically), and importing `shared/db/` from anything that can reach the client (UI, page routes, `index.ts`, `shared/ui`). A file in a feature outside the standard folders fails `check:gates`. Size limits in `src/`: a function over 50 lines of code (200 in a `.tsx` file), a file over 300, nesting over 3, over 4 parameters; and a bare number other than -1, 0, 1 (`docs/02-architecture/design-principles.md`, "Complexity limits"). Split or name it.
- `check:ui` rejects a Tailwind arbitrary value such as `w-[350px]` or `bg-[#f8fafc]` and a palette color such as `text-gray-500` in code we write, a changed generated primitive in `shared/ui`, and a file there that is not classified. Never change a primitive for one feature: use its props and variants, or wrap it in a separate file. Recording a change in `shadcn-primitives.lock.json` needs a listed lint fix or a human's approval, and a person runs it (`docs/04-stack/tailwind-shadcn.md`, "Changing a primitive").
- Never weaken a gate: do not edit `eslint*.js`, `tsconfig*.json`, `scripts/check-*.mjs`, `shadcn-primitives.lock.json`, or CI to make a check pass. Those need a human.
- DB changes go through `drizzle-kit generate` migrations. Never edit a merged migration. Never use `push` outside local prototyping, and an agent never runs it: a person does (`docs/05-agent-tooling/mcp.md`, "Drizzle MCP protocol").
- No new dependency without an ADR in `docs/decisions/`.
- Never commit secrets, and never read `.env` by any route: deny rules block the usual ones, not a script (`docs/03-standards/environment.md`). Env vars are declared in `.env.example` and validated in the env modules (`shared/config/env.server.ts`, `env.ts`). One env file, `.env`; each environment has its own database.

## Rules no gate catches

No gate checks these, so a green run proves nothing about them. Follow them while writing; review checks them (`docs/03-standards/linting-and-formatting.md`).

- A `VITE_` variable is public: never put a secret in one. Read `import.meta.env` only in `shared/config/env.ts`.
- Server logging goes through pino (`shared/server/logger.server.ts`).
- A component or route also runs on the server, so what it logs holds no private data, and it displays dates and numbers only through `shared/lib/format.ts` (`docs/03-standards/components.md`).
- Never check then write: a read never decides a write on its own. A constraint, a condition in the write, a `version` column, or a row lock does (`docs/04-stack/drizzle-concurrency.md`).
- Conditional classes go through `cn()`, and responsive classes are mobile-first (`docs/04-stack/tailwind-shadcn.md`).
- shadcn primitives come from the CLI, never written by hand (skill `add-ui-component`).
- Commit messages follow Conventional Commits (`docs/03-standards/git-and-commits.md`).

## Where to read next (load only what the task needs)

| If the task involves… | Read |
|---|---|
| Starting any non-trivial work | `docs/01-workflow/sdlc-pipeline.md` |
| Who decides or approves a phase, or filling `Approved by:` or `Decided by:` | `docs/01-workflow/roles.md` |
| Principles (DRY, KISS, YAGNI, SRP), reuse vs duplicate, or where a topic is documented | `docs/03-standards/coding-standards.md` |
| Naming symbols, imports, comments | `docs/03-standards/conventions.md` |
| Writing a spec, ADR, PR description, or doc | `docs/03-standards/writing.md` |
| Creating or splitting a React component | `docs/03-standards/components.md` |
| Creating or moving code | `docs/02-architecture/modular-monolith.md`, `folder-structure.md` |
| One feature using another, or publishing/handling an event | `docs/02-architecture/cross-feature-communication.md` |
| Adding an abstraction (interface, base class, plugin point) or designing a service | `docs/02-architecture/design-principles.md` |
| Choosing how data is read or changed | `docs/02-architecture/data-fetching.md` |
| Server functions, API, endpoints | `docs/03-standards/api-conventions.md`, `docs/04-stack/tanstack-start.md` |
| Routes, loaders, search params | `docs/04-stack/tanstack-router.md` |
| Fetching/caching/mutations | `docs/04-stack/tanstack-query.md` |
| Where a piece of state belongs, or adding a store | `docs/02-architecture/state-management.md` |
| Forms and validation | `docs/04-stack/tanstack-form.md`, `docs/04-stack/zod.md` |
| Data tables / long lists | `docs/04-stack/tanstack-table.md` |
| Tables, migrations, seeds | `docs/03-standards/database.md` |
| Queries, transactions, DB errors | `docs/04-stack/drizzle-postgres.md` |
| A write two requests can make at once (status change, counter, edit form, double submit) | `docs/04-stack/drizzle-concurrency.md` |
| A `drizzle-kit` command, `missing_hints`, or a broken migrations folder | skill `drizzle`, `docs/05-agent-tooling/skills.md` (our rules win) |
| Sign-in, sessions, current user | `docs/04-stack/better-auth.md`, `docs/03-standards/security.md`, the Better Auth skills, `docs/05-agent-tooling/skills.md` (our rules win) |
| UI, styling, components | `docs/04-stack/tailwind-shadcn.md`, skill `shadcn` |
| Writing a log line or creating the logger | `docs/03-standards/logging.md` |
| Adding or reading an environment variable | `docs/03-standards/environment.md` |
| An unfamiliar term, or naming a business concept | `docs/03-standards/glossary.md` |
| Types, errors, tests, lint, git, security | `docs/03-standards/*.md` |
| An error you are tempted to suppress or cast away | `docs/03-standards/no-suppression.md` |
| Verifying a library API | skill `verify-library-docs` |
| Adding, upgrading, or removing a dependency | skill `change-dependency`, `docs/04-stack/versions.md` |
| Finishing work | `docs/01-workflow/definition-of-done.md` |

Full index: `docs/README.md`.

## Skills (procedures)

`.claude/skills/`: `run-pipeline` (start here to continue a feature), `verify-library-docs`, `write-idea`, `write-research`, `write-prototype`, `write-prd`, `write-architecture-review`, `write-feature-spec`, `write-tasks`, `build-task`, `new-feature`, `add-server-function`, `add-server-route`, `add-route`, `add-db-table`, `drizzle` (third-party; our rules win: `skills.md`), `add-ui-component`, `change-dependency`, `shadcn` (third-party; our rules win: `tailwind-shadcn.md`), `better-auth-best-practices`, `email-and-password-best-practices`, `better-auth-security-best-practices`, `create-auth`, `two-factor-authentication-best-practices`, `organization-best-practices` (third-party; our rules win, and a plugin needs its ADR: `skills.md`), `add-tests`, `fix-bug`, `refactor`, `code-review`, `run-qa`, `prepare-release`, `measure-feature`, `close-out`. Use the matching skill instead of improvising the procedure; the phase-to-skill map is in `docs/05-agent-tooling/skills.md`.

## Commands

Package manager: **pnpm** (never npm/yarn; never edit the lockfile by hand). Use the scripts in `package.json`. Do not invent script names. In the scaffold: `dev`, `build`, `preview`, `lint`, `format`, `check` (prettier --check). `install.sh` adds `typecheck`, `test`, `check:suppressions`, `check:gates`, `check:ui`, `check:docs`. Still to add by hand: `db:generate`, `db:migrate`, `db:migrate:test` for Drizzle (see `versions.md`). If one is missing, say so.
Path alias: `@/*` → `src/*`.

## When unsure

Ask. A short question is cheaper than a wrong abstraction. Label claims as **Verified** (checked against docs/types this session), **Inferred** (reasoned, not checked), or **Unknown**.
