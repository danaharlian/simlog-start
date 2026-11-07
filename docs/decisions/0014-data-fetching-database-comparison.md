# 0014 Reference template comparison: data fetching and database

- Status: accepted (decision AA closed by the owner on 2026-10-31; decision AB remains open)
- Date: 2026-10-31
- Deciders: owner asked for our own version and for missing items to be added; the choices below are the agent's and can be reversed by a new ADR
- Extends: ADR 0006, ADR 0007, ADR 0008, ADR 0009, ADR 0010
- Resolves: the Drizzle `TODO(verify)` items for the transaction API, the transaction handle type (ADR 0009), and the constraint error shape

## Context

The owner supplied `DATA_FETCHING.md` and `DATABASE.md` from a Next.js project (Server Actions, Server Components, Route Handlers, Prisma) as references, usable in part or in full.

Facts checked on 2026-10-31. **Database:** PostgreSQL 18.4 through `embedded-postgres` (fixture only, not adopted), Drizzle 1.0.0-rc.5, `pg` 8.23.1, pino 10.4.0, TypeScript 6.0.3 strict, and this repo's `eslint.boundaries.js` and `eslint.no-suppress.js` after `@tanstack/eslint-config` 0.4.0. **App:** Start 1.169.4, Router 1.170.46, Query 5.105.0, `@tanstack/react-router-ssr-query` 1.167.3, Vite 8.3.5, a production build served by `vite preview`, driven by Chromium through Playwright.

1. **The documented schema layout fails the lint gate.** `shared/db/schema.ts` importing feature tables breaks "shared never imports features", and one feature's `db/schema.ts` importing another's table is rejected too. `drizzle-postgres.md`, `folder-structure.md`, and skills `add-db-table` and `new-feature` all described that layout. Earlier checks covered a single schema file.
2. **`drizzle-kit generate` silently finds nothing if tables are not direct exports.** With `export const schema = {...}`, it exits 0 and later queries fail with "relation does not exist". A `schema` glob over `src/features/*/db/schema.ts` works, including the `@/` alias.
3. **Without the aggregate, the app still works:** `drizzle({ client })`, joins in repositories, and a cross-feature FK in a custom migration. The FK is enforced, and a later `generate` reports no changes.
4. **A returned `Result` does not roll back.** `return { ok: false }` after a write commits it. `return tx.rollback()` throws `TransactionRollbackError`. Without `return`, TypeScript does not narrow.
5. **After a caught query failure, the transaction stays aborted** (`25P02`). `onConflictDoNothing` avoids that. Using `db` inside a transaction takes a second connection; with `max: 1` it blocked until the pool timeout.
6. **Error shape:** `DrizzleQueryError` with `cause.code` and `cause.constraint`: `23505`, `23503`, `23514`, and `23001` for a restricted delete. `cause` is typed `Error`; Zod reads it without a cast.
7. **Our logging samples were wrong.** `logger.error({ operation, cause })` loses a plain error's message (`"cause":{}`) and, for a database error, writes `detail` with the email value. The `error` key loses the message too. Only pino's `err` key keeps the message and stack, and the unique violation's value did not appear there. Driver messages can still quote a value (invalid enum input did).
8. **Migrations:** one migration is atomic. `ADD COLUMN ... NOT NULL` on a table with rows fails at `migrate`. Removing an enum value still in use fails. A rename with no terminal exits 2 and asks for `--hints`. An older sibling migration with the same parent still applies; a folder sorting before its parent stops `migrate`.
9. **The reference's critical warning does not carry over.** Three server functions started within 1 ms in a real browser. A server function as `queryFn` is our default, not an anti-pattern.
10. **Other browser results** are tabled in `data-fetching.md`: first HTML, no refetch after hydration, streaming timings, waterfall versus loader, debounced search, `keepPreviousData`, infinite query, polling, `Date` round trip, and redirects.
11. **Redirects:** from a `queryFn` and a `mutationFn` they work through `setupRouterSsrQueryIntegration`, which handles them in both cache configs (package source read, and run). A bare call in an event handler rejects and stays on the page; `useServerFn` redirects.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| Decision flowchart, matrix, anti-patterns, checklist | Server function, server route, loader modes | `data-fetching.md` (new) |
| "When to use" for each strategy | One path for our UI; a table of how data loads | `data-fetching.md` |
| Debounced search, infinite scroll, polling as use cases | Tested samples | `data-fetching.md` |
| Naming tables, standard fields, field rules | `snake_case` SQL, `uuid`, `timestamps` helper | `database.md` (new) |
| Relation rules, explicit `onDelete`, FK naming | Kept; join table sample | `database.md` |
| Indexes, composite indexes | Kept; plus naming | `database.md` |
| Migration naming and workflow | `drizzle-kit`, plus what to look for in the SQL | `database.md`, skill `add-db-table` |
| Idempotent seeds, no real data | `onConflictDoUpdate` | `database.md` |
| Use generated types, do not duplicate | `$inferSelect`, `$inferInsert`, `Pick` | `database.md` |
| Explicit `select`, `Promise.all`, pagination in the query layer | Already present; offset and cursor samples added | `drizzle-postgres.md` |
| Handle driver errors at the query layer | Service translates; `readPgError` | `drizzle-postgres.md`, `error-handling.md` |

### Not adopted

| From the reference | Why |
|---|---|
| Server Components, `"use server"`, `revalidatePath`, `React.cache()`, `app/api/*` | Next.js; equivalents in `tanstack-start.md` |
| "Never use the action as `queryFn`; use `fetch` to a Route Handler" | Fact 9. It would add a server route and CSRF setup for nothing |
| "API route + Query" as a separate strategy | Same reason; server routes stay for external callers |
| "No Query for static page data" | Query still gives SSR (fact 10) and one cache. Route-only data may use loader data (`tanstack-router.md`, rule 5) |
| `useOptimistic` + action | `tanstack-query.md`; the data lives in Query |
| Prisma schema, CUID, `@@map`, PascalCase models, `UPPER_SNAKE` enum values | Drizzle; ADR 0007, H; values match our TypeScript unions |
| Implicit many-to-many | Drizzle has none; a join table is explicit |
| Prisma MCP for migrations | Not in the stack; `drizzle-kit` |
| `lib/db/queries`, `features/*/queries/`, `features/*/types/`, root `types/` | `*.repository.ts`, `schemas.ts`; ADR 0010 |
| `contract.ts` | ADR 0009 |
| `ActionResult`, `Success`/`Failure`, `details` | ADR 0006 |
| `globalThis` Prisma singleton | Module scope in a Node container; dev hot reload was not checked here |

## Consequences

- **Corrected:** the schema layout (fact 1), logging samples in `error-handling.md`, `api-conventions.md`, and `cross-feature-communication.md` (fact 7), and a stale "decision H is open" line in the tech spec template.
- **Given up (decision AA):** `db.query.*` and `.references()` across features.
- **New documented paths:** `shared/db/columns.ts` and `shared/db/errors.ts`; the app creates them when first needed.
- ADR 0008 and 0009 still mention the `TODO(verify)` items; as decision records they stay as written, and this ADR resolves them.

## Decision AA: schema across features (closed)

**Owner decision (2026-10-31): no gate change. Code holds only the id; a foreign key across features, when the table in `database.md` calls for one, is a custom migration; never `CASCADE` across features; no schema aggregate and no relational queries.** `eslint.boundaries.js` is unchanged. Reopening this needs a new ADR that deals with the two holes below. The rest of this section is the analysis behind the decision.

The owner's reviewer leaned toward approving a `db-aggregate` category, on conditions: an explicit scope, no weakening of existing rules, positive and negative fixtures, a documented reason, and human approval before the gate changes. Testing against those conditions changed the recommendation.

**The aggregate fails the "no weakening" condition.** With `defineRelations` on the shared client, `db.query.customers.findMany(...)` in another feature's service, repository, server function, and even a UI file passed `tsc` and the full lint config: no table import is involved, so the boundary rule sees nothing. Lint cannot stop this, because everyone may import `shared/`.

**The foreign key exception below also weakens the gate, so it was not applied.** The diff is kept for reference only.

**The hole:** the diff lets a table file re-export another feature's table (`export { customers } from ...`, `export *`, `export { customers }`, `export const others = customers`). A repository then imports its own `../db/schema`, which lint allows, and holds the other feature's table. Under the current gate the re-export is rejected. The 27-case matrix below did not cover this. A `no-restricted-syntax` guard on `src/features/*/db/schema.ts` rejected those four forms and allowed a real `.references()`, but it is a second gate change, was tried without `eslint.no-suppress.js` (a later block for the same rule replaces its selectors, so they would have to be merged), and cannot catch every form, such as a table wrapped in an object.

```diff
       { category: 'db', pattern: 'src/features/*/db/**' },
+      { category: 'db-schema', pattern: 'src/features/*/db/schema.ts' },
```

```diff
+          // A feature's table file may import another feature's table file, for .references() only.
+          {
+            from: { file: { categories: 'db-schema' } },
+            allow: { to: { element: { type: 'feature' }, file: { categories: 'db-schema' } } },
+          },
           // A feature must not import its own public entry points (barrel cycle).
```

Results on a fixture copy (2026-10-31):

- **Boundary matrix:** all 27 applicable cases matched (5 allowed, 22 rejected). The only result that changed from the current gate is the one intended: a table file importing another feature's table file. Still rejected: service, repository, server function, listener, UI, page route, API route, `*.rules.ts`, and `schemas.ts` importing a table; another file in `db/` importing a table; a table file importing another feature's `db/helpers`, repository, service, or `schemas.ts`; `shared/` importing a table. Still allowed: a service using `index.server.ts`, and an API route using it (ADR 0012).
- **End to end:** full lint and `tsc` clean; `generate`, `migrate`, and `check` passed; the SQL has the constraint; a missing parent fails with `23503`; a valid insert works.

An aggregate variant, with tighter rules than the first trial, also matched its import cases, including denying the aggregate to everything but the db client. It is still not recommended, because of `db.query`.

**Mapping the reviewer's table to this repo:** "domain" is `*.rules.ts` (there is no `domain/` folder, ADR 0013). "Application layer" and "public contract" are the service reached through `index.server.ts` (ADR 0009, 0012): a deep import of another feature's service stays rejected, and the public entry point stays allowed.

**Had it been approved, the exception would have covered:** only `.references()` in `db/schema.ts`, for a relation the database must enforce. It is not a way to read another feature's data, reuse its columns or enums, or join its table in a repository: those go through its public API. **Why it is acceptable:** the import is limited to a declaration the database enforces, the owner keeps its table and rules, and no query code gains access.

**What it does not stop:**

- A table file can still import another feature's `index.ts`. That is true today, and review checks it.
- A `db/schema.ts` can use the imported table for more than `.references()`. Lint sees the import, not how it is used. Review checks it.
- Two features referencing each other form an import cycle. Not tested; decide per case in the tech spec, as `cross-feature-communication.md` forbids cycles.
- UI and page routes may already import `shared/db/client.ts` (allowed today). They still cannot reach a table without importing one. **Not part of this change;** tightening it would be a separate gate change.

**The price of the decision:** one hand-written `ALTER TABLE` per cross-feature FK, and an FK that is not visible in `db/schema.ts`. The FK itself was run and enforced. The per-relation table and the "no `CASCADE`" rule reflect common practice as the agent understands it; they were not checked against sources in this session.

## Open decision AB: seed runner

A TypeScript seed needs a runner with alias support. `tsx` ran the fixture, but it is a new dependency and needs an ADR.

## Not verified

- Migrations under concurrent traffic, lock behavior on large tables, and the three-step `NOT NULL` sequence.
- `23001` on PostgreSQL older than 18.
- The `embedded-postgres` server against a production image; the version should match production.
- The route samples with this repo's lint gates: the app fixture was type-checked and built, and its code was not linted. It uses a plain `useEffect` debounce and relative imports.
- The 1000 ms switch to `pendingComponent`: the default comes from the installed types.
- A redirect from a loader: from the Start guide.
- Other crawlers' user agents; only Googlebot's was tried, on the built handler.

## Alternatives considered

- **Copy both files, renamed to the stack.** Rests on Prisma and on a warning that is false here. Rejected.
- **One long `drizzle-postgres.md`.** Over the 200-line budget. Conventions moved to `database.md`; rule numbers stay, because other docs cite them.
- **Add a server route for each client-side list,** as the reference does. Rejected (fact 9).
- **Apply the gate change now,** since the owner asked for missing items to be added automatically. Rejected: that request does not cover gates.

## Verification

Docs consulted (2026-10-31): `drizzle-orm` 1.0.0-rc.5: transactions, relations, indexes-constraints, and latest-releases pages (Context7 `/websites/orm_drizzle_team`), installed `errors.d.ts` and `node-postgres/session.d.ts`. `@tanstack/react-query` v5: polling guide, `UseSuspenseInfiniteQueryOptions`, `useSuspenseInfiniteQuery` (Context7 `/tanstack/query`). `@tanstack/react-start`: server-functions, tanstack-query, hosting guides (Context7 `/websites/tanstack_start_framework_react`). `@tanstack/router-core`: installed `router.d.ts`. `@tanstack/router-ssr-query-core`: installed source.
