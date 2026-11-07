---
name: add-server-function
description: Add a TanStack Start server function end to end (Zod schema, validated and authorized handler, service call, query options or mutation hook, tests). Use when exposing any new read or write operation from the server to the app.
---

# Add a server function

Read `docs/02-architecture/data-fetching.md`, `docs/03-standards/api-conventions.md`, `docs/04-stack/tanstack-start.md`, `docs/03-standards/security.md`. Run `verify-library-docs` for Start (server function + middleware APIs) **before** writing: the validator method name changed between RC and 1.0 stable. If it creates or changes the auth middleware, or calls `auth.api`, also read `docs/04-stack/better-auth.md` and skill `better-auth-best-practices`.

## Steps

1. **Schema:** add input (and DTO) Zod schemas to the feature's `schemas.ts`. Infer types; no hand-written duplicates.
2. **Service:** implement the business rule in `server/<name>.service.ts`, or as a pure function in `server/<name>.rules.ts` if it has several branches or edge cases (`docs/03-standards/coding-standards.md`); return `Result` with `appError.*` for every expected failure (codes live in the feature's `errors.ts`); throw only for unexpected failures. Own the transaction boundary for multi-writes. A write two requests can make at once (status change, counter, edit form, double submit) never decides from a plain read: put the condition in the write, or lock the row in the writing transaction, per `docs/04-stack/drizzle-concurrency.md`, and name the race in a `Race:` comment (`docs/03-standards/conventions.md`).
3. **Repository:** add Drizzle queries in `server/<name>.repository.ts` (tenant/owner scoped). Return DTO-mappable data.
4. **Server function:** in `server/<name>.functions.ts`: `createServerFn({ method })` (`GET` reads, `POST` writes) with authentication/authorization middleware, the schema validator, and a handler that only calls the service, wrapped in `withErrorBoundary`. Verb name (`getX`, `createX`). Logic two functions share goes in a service function: a server function never calls another one to reuse logic. An external caller (webhook, public API) needs a server route instead: follow `api-conventions.md`.
5. **Client access:**
   - Read: add a `queryOptions` factory and key to `queries.ts`; the route loader prefetches with `context.queryClient.query({ ...options, staleTime: 'static' })` (`ensureQueryData` is deprecated: see `docs/04-stack/tanstack-query.md`); components use `useSuspenseQuery` with the same options.
   - A read whose result joins another feature's data (through its `index.server.ts`) declares `meta: { dependsOn: [<owner scope>] }` in its `queryOptions` and gets a row in spec section 7 (`tanstack-query.md`, rule 12).
   - Write: add a `useMutation` hook in `hooks/` that invalidates with `invalidateFeature(context.client, <own scope>)` **only when `data.ok`**; forms reuse the same Zod schema and map `validation` errors with `toFormErrors`. Add the user-facing text for every new code to the feature's exhaustive message map. Optimistic only for cheap, rarely failing changes, never for payments or forms (`docs/04-stack/tanstack-query.md`).
6. **Events:** if other features should react, publish from the service after the write is saved, with the delivery class from the spec (`docs/02-architecture/cross-feature-communication.md`). Define it in `events.ts`, export it from `index.ts`, document it in the feature `README.md`.
7. **Cache headers:** set deliberately; never `public` for identity-dependent data.
8. **Tests:** valid input; invalid input is rejected by the validator; each service rule failure returns the expected `kind` and `code`; unauthenticated; unauthorized/cross-tenant; not found; service persistence against a real test DB; for each collision point, the colliding calls run together and the stored data is checked (`docs/03-standards/testing.md`, rule 1b).
9. **Verify:** `typecheck`, `lint`, tests. Record `Docs consulted`.

## Checklist

- [ ] Auth enforced in function/middleware, not only in `beforeLoad`
- [ ] Input validated; output is a DTO (no secrets/internal fields)
- [ ] No Drizzle imports in the handler or UI
- [ ] No check then write: every concurrent write has its mechanism from `drizzle-concurrency.md` and a concurrent test
- [ ] Error codes stable, in `errors.ts`, tested on the `Result`, and have UI text; no class, no `instanceof` on our errors
- [ ] The server function wrapper is exported through `index.ts` only if other features or routes need it; a plain service function other features call goes through `index.server.ts`, never `index.ts`
