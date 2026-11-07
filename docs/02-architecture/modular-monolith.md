# Feature-Driven Modular Monolith

**When to read:** before creating a feature, moving code between folders, or adding a cross-feature call.

One deployable app (TanStack Start). Internally split into **feature modules** with explicit public APIs, so features can be reasoned about, tested, and later extracted independently.

```
┌───────────────────────────────────────────────────────────┐
│ src/routes/  thin: URLs, loaders, composition             │
├───────────────────────────────────────────────────────────┤
│ src/features/  business capabilities                      │
│  ┌───────────┐  public API  ┌───────────┐                 │
│  │ invoices  │ ───────────▶ │ customers │  ...            │
│  │ index.ts  │              │ index.ts  │                 │
│  │ index.    │ ◀── events ──│ index.    │                 │
│  │  server.ts│              │  server.ts│                 │
│  └───────────┘              └───────────┘                 │
├───────────────────────────────────────────────────────────┤
│ src/shared/  UI kit, db client, env, errors, event bus    │
└───────────────────────────────────────────────────────────┘
```

## What is a feature

A feature is a business capability with its own language and data. Name it after the business, not after a technical layer.

| A feature | Not a feature |
|---|---|
| `invoices`, `billing`, `customers` | `utils`, `helpers`: `shared/lib`, named by concept |
| `notifications` (the alert system) | `ui`, `layout`: `shared/ui` |
| `settings` (user preferences) | `database`: `shared/db` |
| `auth` flows and screens | `middleware`: `shared/server` |

Too big? `design-principles.md` has the limits and how to split.

## Principles

1. **A feature is the unit of change.** UI, queries, server functions, services, repositories, schemas, and tests for one business capability live together.
2. **Public API only.** A feature has two entry points: `index.ts` (client-safe) and `index.server.ts` (server-only). Other code imports from `@/features/<name>` (or `@/features/<name>/index.server` from server code) and nothing deeper. See [`cross-feature-communication.md`](cross-feature-communication.md).
3. **Data ownership.** Each table is owned by exactly one feature. Only the owner's repository reads or writes it.
4. **Routes are composition.** `src/routes/**` wires URLs to feature components and loaders. No business logic.
5. **`shared` is infrastructure and primitives.** UI kit, db client, env, errors, utilities. It knows nothing about features.

## Dependency rules

| From → To | `routes` | `features/*` (public API) | `features/*` (internals) | `shared` |
|---|---|---|---|---|
| `routes` | n/a | allowed to `index.ts`; to `index.server.ts` **only from `src/routes/api/**`** (ADR 0012) | **forbidden** | allowed |
| `features/A` | forbidden | allowed to B's `index.ts`; to B's `index.server.ts` **only from A's functions, services, and listeners** | only its own | allowed |
| `shared` | forbidden | **forbidden** | **forbidden** | allowed |

No import cycles between features. If A and B need each other, extract the shared concept into a third feature or into `shared`, or invert with an interface. Enforce with `eslint-plugin-boundaries` (installed) using the verified config in [`docs/examples/eslint.boundaries.js`](../examples/eslint.boundaries.js) (see `docs/03-standards/linting-and-formatting.md`), so a violation fails `pnpm lint` in CI. This also enforces the layers inside a feature (UI → functions → service → repository).

## Layers inside a feature

```
UI (components, hooks)
  → queries.ts (queryOptions + key factory)
    → server/*.functions.ts   transport: validate (Zod) + authorize (middleware) + call service
      → server/*.service.ts   business rules, orchestration, transactions
        → server/*.rules.ts        optional: pure rules the service calls; no I/O
        → server/*.repository.ts   Drizzle queries only
          → db/schema.ts           tables owned by this feature
```

- UI never imports `*.server.ts`, `*.service.ts`, `*.repository.ts`.
- Services contain business rules and return a `Result` with a typed `AppError` for expected failures (`docs/03-standards/error-handling.md`). They do not know about HTTP or React. They reach data only through repositories: no import of the feature's `db/` tables (lint-enforced). The shared db client is allowed, for transactions.
- Repositories contain Drizzle queries and map rows to domain objects/DTOs. No business rules.
- `schemas.ts` (Zod) is client-safe and shared by forms and server-function validators: one schema, two uses.

## Request lifecycle (read path)

```
Route loader ─queryClient.query({...queryOptions, staleTime:'static'})→ queryFn → serverFn (validate+auth)
   → service → repository → PostgreSQL
Component ─useSuspenseQuery(same queryOptions)→ reads cache
```

Write path: form submit (TanStack Form + Zod) → `useMutation` → server function → service (transaction, then publish events) → invalidate keys from the feature's key factory when `data.ok`. Step by step: `docs/03-standards/api-conventions.md`.

Route loaders are isomorphic: they run on the server during SSR and on the client during navigation. A loader therefore calls query options, which call a server function; it never touches the database. State that is not server data: [`state-management.md`](state-management.md).

## Cross-feature interaction

Full guide: [`cross-feature-communication.md`](cross-feature-communication.md) (ADR 0009). In short:

| Situation | Use |
|---|---|
| A needs B's data | B's public API: query options from `index.ts`, or a service function from `index.server.ts` |
| A changes B's data and both must succeed together | B's service function from `index.server.ts`, in one transaction |
| Something happened and others may react; their failure must not fail A | Typed in-process event (the default for reactions) |
| A reaction must not be lost | Durable event: not implemented, needs its own ADR |

- Never query another feature's tables.
- **DB foreign keys** to another feature's table are allowed at schema level only; joins across ownership boundaries go through the owner's API unless an ADR approves a read-model.
- Events never carry reads. Handlers are best-effort and never fail the publisher. Introducing a bus library requires an ADR.

## Creating a feature

Use skill `new-feature`. Minimum: `index.ts` (plus `index.server.ts` once another feature needs a service function or listens), `schemas.ts`, `queries.ts`, `server/`, `db/schema.ts` (if it owns data), `__tests__/`, `README.md` (purpose, public API, owned tables).

## Design principles

SOLID mapped to these layers, with what lint checks and what only review can judge: [`design-principles.md`](design-principles.md).

## Anti-patterns

- Business logic in route files or components.
- A `utils/` or `common/` dumping ground inside features. Name the concept.
- Importing another feature's repository or schema table to "save a call".
- Exporting a service function from `index.ts`, or importing `index.server.ts` from UI or a route (server code ends up in the client bundle).
- A central event map or registry in `shared` (it would make `shared` know every feature).
- Using an event where the caller needs an answer.
- One mega-feature (`app`, `core`, `main`). Split by business capability.
- Passing Drizzle row types to the client. Map to DTOs.
