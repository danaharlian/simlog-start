# 0015 Reference template comparison: standards, tooling, and the master document

- Status: accepted (open decisions AC and AD remain)
- Date: 2026-10-31
- Deciders: owner asked for our own version and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0006, ADR 0007, ADR 0010, ADR 0011, ADR 0014

## Context

The owner supplied `ENVIRONMENT.md`, `ERROR_HANDLING.md`, `GIT.md`, `GLOSSARY.md`, `LINTING.md`, `MCP.md`, `SECURITY.md`, `STANDARD.md`, `TANSTACK_QUERY.md`, `TECHSTACK.md`, `TESTING.md`, `TYPESCRIPT.md`, and `WORKFLOWS.md` from a Next.js project (Server Actions, Prisma, Server Components, react-hook-form) as references, usable in part or in full.

Facts checked on 2026-10-31 in a fixture: Start 1.169.4, Router 1.170.46, Vite 8.3.5, Zod 4.6.7, pino 10.4.0, Drizzle 1.0.0-rc.5, TypeScript 6.0.3 strict, Vitest 5.0.5, user-event 14.6.8, `@tanstack/eslint-config` 0.4.0, and this repo's `eslint.boundaries.js` and `eslint.no-suppress.js`. Final snippets: `tsc` clean, `eslint --max-warnings 0` clean. Browser results: a production build served through its `fetch` handler, driven by Chromium through Playwright (fixture only, not adopted).

1. **Our `invalidInputResponse` had a bug.** `z.flattenError(error).fieldErrors` dropped a cross-field error with no path, so the caller got `{}`, and collapsed `nested.c` to `nested` and `items.0.sku` to `items`. The reference's "empty path" warning found it. `zodErrorDetails` keeps both; a test covers root and nested paths.
2. **`issue.path.join('.')`, as the reference writes it, throws on a symbol path.** `map(String)` does not.
3. **"Fails fast at startup" in our `environment.md` was false.** With a missing variable the server started, the page answered 200, and its server function answered 500. A dynamic import in a request middleware gives 500 on every request, and no variable names in `dist/client`. A failed parse printed no rejected value.
4. **The built server does not read `.env` files.** With `.env` present and nothing in the shell, `process.env` had none of its values. `VITE_` values are fixed at build time; `.env.production.local` won over the others.
5. **`VITE_` separation holds:** an unprefixed variable is `undefined` in client code, a database password was absent from `dist/client`, and a client import of `*.server.*` fails the build.
6. **Lint does not catch `process.env`** in application code, nor does it catch a `shared` file importing `env.server.ts`.
7. **The reference's `redact` list covers less than it looks.** Top level and one level down are redacted. Two levels down, arrays, and message strings are written in clear.
8. **`logger.server.ts` stays out of the client:** used through `withErrorBoundary` by a server function that the UI calls, neither `pino` nor `redact` appeared in `dist/client`.
9. **A strict CSP without a nonce gives status 200 and a blank page.** The content does not appear and the build passes. A nonce generated in request middleware and passed through `createRouter({ ssr: { nonce } })` renders and hydrates with no violation, and a server function answers.
10. **Headers set in request middleware** appeared on a page, a server route, a 404, and a server function.
11. **`sql.raw()` puts input in the query text unescaped;** the `sql` tag sends it as `$1`.
12. **`user-event`:** a click on a disabled button did not fire its handler. `interface` passes lint. `exhaustiveCheck`, `assertDefined`, `isRole`, `getProperty`, and overloads pass `tsc` and lint.
13. **`error.flatten()` and `error.format()` are `@deprecated`** in the installed Zod types. `z.flattenError` is not, which is why fact 1 had to be found by running it.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| `.env` hierarchy, prefix rule, naming, `.env.example` template | `VITE_`, Vite's order, not committed; two modules | `environment.md` |
| Runtime logging matrix, `lib/logger.ts`, levels, logging rules | Isomorphic code; `logger.server.ts`; limits of `redact` stated | `logging.md` (new) |
| Root-error handling, `formatZodError` | `zodErrorDetails` (facts 1, 2) | `zod.md`, `api-conventions.md`, `error-handling.md` |
| When to create a feature error | Code versus kind | `error-handling.md` |
| Glossary, domain-to-code table | This repo's terms; empty business table | `glossary.md` (new) |
| Commit type table, summary rules, examples, branch types, no `--no-verify` | Kept `<type>/<slug>` | `git-and-commits.md` |
| MCP availability and non-destructive fallbacks; "used, unavailable, failed"; when not to use Context7; adding a server | Our tools | `mcp.md` |
| Data classification, XSS, input limits, raw SQL warning, security headers | Drizzle `sql.raw`; request middleware and nonce | `security.md`, `tanstack-start.md` |
| Prohibited libraries, dependency checks, frozen lockfile, `pnpm outdated` | This stack's alternatives | `versions.md` |
| Test file placement, what not to test, `user-event`, dependency injection over module mocks | `__tests__/`, because of the boundary rules | `testing.md`, `folder-structure.md` |
| Priority matrix, pattern catalog, order of fixes for a type error | One table and five tested snippets | `typescript.md` |
| Custom hook for mutations | Mutations only; reads use shared `queryOptions` | `tanstack-query.md` |
| Routing rules | Our skills | `skills.md` |
| Documentation update table | Our files | `definition-of-done.md` |
| Record low-risk assumptions | Never for library facts | `anti-hallucination.md` |
| Next.js settings | Four more rows in the habits table | `tanstack-start.md` |

### Not adopted

| From the reference | Why |
|---|---|
| `STANDARD.md` as a master document, `TECHSTACK.md`, `WORKFLOWS.md` as separate files | `AGENTS.md`, `versions.md`, and `skills.md` hold these; a second index would drift |
| `.env.development`, `.env.production`, and `.env` committed | Fact 4 shows they do not reach the built server, and an ignored file cannot leak a secret |
| `NEXT_PUBLIC_`, `next.config.ts`, `compiler.removeConsole`, `proxy.ts`, `error.tsx`, `useActionState` | Next.js; equivalents are in `tanstack-start.md` |
| "`console.*` allowed in client components" | No such split here: the same component also runs during SSR |
| `requireAuth` calling `headers()`, thrown auth guards | Next.js; our middleware returns `AppError` (ADR 0006) |
| `requireRole` in a shared auth module | Permissions are decided per feature (`better-auth.md`, rule 7) |
| Prisma error handling and mocks, `queries/`, `actions/`, `domain/`, `contract.ts`, Prisma MCP | ADR 0007, 0009, 0010, 0013, 0014; repository tests use a real database |
| `Success`, `Failure`, `ActionResult`, `_tag`, `details` | ADR 0006 |
| Event bus with `as never` and "permitted assertion" exceptions | ADR 0004, ADR 0009: no exceptions, and our bus compiles without them |
| `@ts-expect-error` allowed with a description; `eslint-comments/no-restricted-disable` | ADR 0004 is stricter |
| `simple-import-sort`, Prettier values, `.mjs` lint config, `format:check` | ADR 0003, ADR 0011: lint and `.prettierrc` decide; our script is `check` |
| `eslint` MCP, shadcn MCP | Not adopted (ADR 0007, N); `pnpm lint` and the CLI |
| Query Route Handlers rule, `getQueryClient()`, `environmentManager`, `HydrationBoundary`, `shouldRedactErrors`, devtools provider | ADR 0014 fact 9; Start's integration handles the rest |
| `interface` as the default; `should …` test names | The repo uses `type` (ADR 0011) and behavior names (`testing.md`) |
| Pinned versions from the reference (TypeScript 7, better-auth 1.1, React Table v8) | `versions.md`; TypeScript stays on `~6.0.x` (ADR 0007, P) |
| `pino-pretty`, `date-fns`, `sonner`, `msw` | New dependencies need an ADR; none is needed by these docs |
| Pre-push hook as a requirement | The hook manager stays a team choice (`linting-and-formatting.md`) |

## Consequences

- **Corrected:** `invalidInputResponse` (fact 1) and its response shape, which now adds `formErrors`; the startup claim (fact 3); `SESSION_SECRET` replaced by Better Auth's names; the one-file env module split in two; the `TODO(verify)` on the logger path closed.
- **Moved:** the logging detail in `error-handling.md`, rule 11, to `logging.md`.
- **No gate changed.** Facts 3 and 6 are left to review and to a smoke test. A lint rule for `process.env` would be a gate change and needs a human.
- **New documented paths:** `shared/config/env.server.ts`, `shared/config/env.ts`, `shared/server/logger.server.ts`, `shared/server/security-headers.ts`, `shared/errors/zod-errors.ts`, `shared/lib/exhaustive-check.ts`, and `e2e/`. The app creates them when first needed.
- `AGENTS.md` gained three rows. ADRs 0006 and 0010 still mention the older shapes; as decision records they stay as written.

## Not verified

- The dev server: the one attempt did not render, and the cause was not investigated, so `.env` loading in development rests on the Start guide.
- CSP with real styles, fonts, images, or component libraries (decision AC), and security headers behind a proxy.
- The nonce pair `ssr.nonce` and `getGlobalStartContext`: read from installed types and exports, and run. No docs page describing them together was found.
- Better Auth variable names on the installed version: from docs through Context7, whose index stops at 1.6.x.
- pino's redaction docs: the page could not be fetched as content, so its limits here are observed behavior only.
- The new response shape with a real client, and `pnpm audit` in a CI run.
- The security headers, env, logger, and helpers in a real app with the installer's full setup; the fixture copied the gate configs by hand.

## Alternatives considered

- **Copy the files in, renamed to the stack.** `TYPESCRIPT.md` alone is over 800 lines against a 200-line budget, much of it general TypeScript, and several files rest on Next.js. Rejected.
- **Keep logging inside `error-handling.md`.** It would pass the budget, and it is a separate task. A new file.
- **Add a lint rule for `process.env` and server `console.*`.** A gate change: left to a human. The owner's request to add missing items does not cover gates (ADR 0014).

## Verification

Docs consulted (2026-10-31): `@tanstack/react-start`: environment-variables, server-functions, middleware, server-entry-point guides (Context7 `/websites/tanstack_start_framework_react`). `@tanstack/react-router`: document-head-management (Context7 `/websites/tanstack_router`); `router-core` installed `router.d.ts`. `better-auth`: installation (Context7 `/websites/better-auth`). `vite`: vite.dev/guide/env-and-mode. `@testing-library/user-event`: testing-library.com/docs/user-event/intro. `zod` 4.6.7: installed `errors.d.ts`. `pnpm` 12.16.1: `--help` for `install`, `outdated`, `audit`.
