# 0010 Reference template comparison: what we took from the Next.js API and architecture docs

- Status: accepted (decision Y resolved by ADR 0012)
- Date: 2026-10-31
- Deciders: owner asked for the comparison and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0006, ADR 0009

## Context

The owner supplied `API.md` and `ARCHITECTURE.md` from a Next.js project (Server Actions, Prisma, React Server Components, Zustand) as references, usable in part or in full, and asked that anything worth keeping be added to the right file here.

Facts checked on 2026-10-31 in a test app (Start 1.169.4, Router 1.170.46, Query 5.105.0, Zod 4.6.7, Vite 8.3.5, TypeScript 6.0.3 strict; `tsc` clean, `vite build` clean, built server called through `fetch`):

1. **`z.string().min(1).trim()` accepts blank input.** Checks run in order, so `"   "` passes and parses to `""`. `z.string().trim().min(1)` rejects it.
2. **`createSchema.partial()` applies the create schema's defaults.** With `currency: z.string().default('IDR')`, parsing `{ name: 'x' }` returns `{ name: 'x', currency: 'IDR' }`, so an update would overwrite stored values with defaults. A base schema without defaults, extended for create and made partial for update, returns `{ name: 'x' }`.
3. **`z.coerce.boolean()` turns `"false"` into `true`;** `z.stringbool()` returns `false`. `z.coerce.number()` turns `""` into `0`.
4. **A server route may import `index.server.ts` as far as the bundler goes.** A file with `server.handlers` statically importing a feature's `index.server.ts` builds, and the marker string in its service is absent from `dist/client`. The boundary lint policy still rejects the import.
5. **A server route can call a server function exported from `index.ts`.** Function middleware reads the original request's headers through `getRequestHeader`.
6. **The route helpers behave as written.** 200, 201, 400 (with `fieldErrors`), 404, and 500 were observed; on a thrown error the internal message did not reach the response.
7. **The optimistic hook type-checks against Query 5.105.0.** Callbacks are `onMutate(variables, context)`, `onError(error, variables, onMutateResult, context)`, `onSuccess(data, variables, onMutateResult, context)`, and `onSettled(data, error, variables, onMutateResult, context)`. `context.client` is the query client.
8. **CSRF does not cover server routes by default, and `src/start.ts` can silently remove it from server functions.** Results per setup are in `tanstack-start.md`. A `src/start.ts` without the middleware builds cleanly and server functions answer a cross-site request with 200. `createCsrfMiddleware()` on a route rejects cross-site, same-site, direct-visit, and headerless requests with a plain-text 403. A route that calls a server function does not trigger that function's check.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| Server Action vs Route Handler matrix | Server function vs server route | `api-conventions.md` |
| Numbered order of steps in a mutation | Table of who does what, per layer | `api-conventions.md` |
| "Never call an action from an action" | Same rule for server functions | `api-conventions.md`, skills `add-server-function`, `code-review` |
| Route Handler rules, status code table | Server route rules, statuses mapped to `AppError` kinds | `api-conventions.md` |
| `handleApiError` | `errorResponse`, `resultResponse`, `invalidInputResponse`, `withRouteBoundary`; `satisfies Record` in place of a type guard | `api-conventions.md`, `error-handling.md` |
| Pagination defaults and shared schema | Defaults kept (20, max 100); cursor stays the default for unbounded lists | `api-conventions.md`, `folder-structure.md` |
| Create, update, and query schema conventions | Kept, corrected per facts 1 to 3 | `zod.md` |
| Selective optimistic updates | Query `variables` or cache; rollback also for `ok: false` | `tanstack-query.md`, tech spec template |
| Layer diagram, "what is a feature" table | As is, with this repo's folders | `modular-monolith.md` |
| "Create when" table for feature folders | Limited to folders the boundary lint covers | `folder-structure.md` |
| Thin page pattern | Thin route; file conventions | `tanstack-router.md` |
| Allowed and prohibited surface of `contract.ts` | Same idea for the two entry points | `cross-feature-communication.md` |
| Event payloads carry no secrets or PII | Added as an event rule | `cross-feature-communication.md` |
| Durable outbox requirements | More complete criteria for the future ADR; nothing implemented | `cross-feature-communication.md` |
| Complexity limits, when to split a feature | Kept as review guidelines; no lint rule added | `design-principles.md` |
| State types table, caching strategy | Query, search params, Form; no store library | `state-management.md` (new) |
| Next.js conventions | A table of habits that do not apply here | `tanstack-start.md` |

### Not adopted

| From the reference | Why |
|---|---|
| Server Actions, `"use server"`, Server Components, `"use client"`, `React.cache()`, `revalidatePath`, `proxy.ts`, `instrumentation.ts`, `useOptimistic` as the default | Next.js or RSC mechanisms; equivalents are in the `tanstack-start.md` table |
| `contract.ts` per feature, `@consumer` tags, a global `AppEventMap` | ADR 0009, decision 6. The tech spec's cross-feature table records consumers |
| `domain/` folder | ADR 0007, decision V; it would also need a new lint category |
| `stores/`, `constants/`, and `types/` folders inside a feature | A folder outside `boundaries/files` gets no layer rules. No store library is installed |
| Zustand, nuqs, Prisma | Not in the stack. A new dependency needs an ADR; search params and Drizzle already cover these needs |
| `{ success: true, data }` envelope | Duplicates the HTTP status. `{ data }` or `{ error }` instead |
| `ActionResult`, `_tag`, `details` | ADR 0006 and `typescript.md` rule 16: `Result`, `kind`, `fieldErrors` |
| Sample event bus with `handler as EventHandler<never>` | Casts are banned; ADR 0009's bus compiles without any |
| `Number(searchParams.get('page'))`, a `catch` that returns an error without logging | The first skips validation; the second loses the cause. Both contradict the reference's own rules |

## Consequences

- New decision **Y**: how a server route reaches a service. Changing `eslint.boundaries.js` needs a human (`AGENTS.md`), so this ADR left the gate as it was. The owner later approved the change: see ADR 0012.
- `shared/server/http-response.ts` and `shared/lib/pagination.ts` are documented paths; the app must create them with its first server route or paginated list.
- The limits in `design-principles.md` are not enforced by a tool.

## Not verified

- CSRF with a real browser (fact 8 used crafted headers on the built server), the `origin` option behind a proxy, and the Better Auth route through a real browser (headers were checked on `auth.handler`: `better-auth.md`, rule 9).
- Uploads and streaming in a real app; `FormData` is taken from the Start docs and was not run.
- The optimistic hook at runtime: type-checked only, no component test was run.
- The route example with the boundary lint in this fixture: the lint-allowed import comes from the policy tested for ADR 0009, and was not re-run here.

## Alternatives considered

- **Copy both files in as they are, renamed to the stack.** They would exceed the 200-line budget, repeat `error-handling.md` and `cross-feature-communication.md`, and load everything for every task. Rejected (`progressive-disclosure.md`).
- **Leave our docs unchanged.** Rejected: the matrix, status table, route helpers, optimistic guidance, complexity limits, and state table were real gaps.

## Verification

Docs consulted (2026-10-31): `@tanstack/react-start`: server-routes, server-functions, middleware, execution-model guides (tanstack.com/start/latest). `@tanstack/react-query`: optimistic-updates guide. `@tanstack/react-router`: file-naming-conventions, data-loading guides. `zod`: zod.dev/v4/changelog. Installed type definitions through the `tsc` run above.
