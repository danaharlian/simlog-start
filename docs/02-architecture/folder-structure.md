# Folder Structure and Naming

**When to read:** before creating any file or folder.

Route-file naming and generated files follow TanStack Router/Start conventions: verify against the current docs (`docs/04-stack/tanstack-router.md`) before changing them.

```
.
├── AGENTS.md  CLAUDE.md  .mcp.json
├── docs/                     # this documentation
├── specs/<feature-slug>/     # per-feature pipeline artifacts (phases 1–12)
├── drizzle/                  # generated SQL migrations (never hand-edit once merged)
├── e2e/                      # end-to-end tests, <flow>.spec.ts
├── drizzle.config.ts
├── vite.config.ts
└── src/
    ├── router.tsx            # exports getRouter() (required by Start)
    ├── start.ts              # global middleware (CSRF, auth context, starts event subscribers)
    ├── subscribers.server.ts # composition root: registers every feature's listeners once
    ├── routeTree.gen.ts      # GENERATED. Never edit.
    ├── routes/               # thin route files (TanStack Router file-based)
    │   ├── __root.tsx
    │   ├── index.tsx
    │   ├── <feature>/…       # compose feature components, loaders call queryOptions
    │   └── api/v1/…          # server routes: webhooks, public API (`api-conventions.md`)
    ├── features/
    │   └── <feature>/        # kebab-case
    │       ├── index.ts      # PUBLIC API, client-safe (components, query options, types, event definitions)
    │       ├── index.server.ts  # PUBLIC API, server-only (service functions, listener registration); only if needed
    │       ├── events.ts     # events this feature publishes (name + Zod payload; pure, client-safe)
    │       ├── README.md     # purpose, public API, owned tables, events
    │       ├── schemas.ts    # Zod schemas + inferred types (client-safe)
    │       ├── errors.ts     # this feature's error codes and types (pure; no server, db, or UI imports)
    │       ├── queries.ts    # queryOptions factories + query key factory
    │       ├── components/   # feature UI (uses shared/ui primitives); sections/ for parts of a large form or page
    │       ├── hooks/        # feature hooks (mutations, derived UI state)
    │       ├── server/
    │       │   ├── <name>.functions.ts   # createServerFn wrappers (safe to import anywhere)
    │       │   ├── <name>.service.ts     # business logic (server only)
    │       │   ├── <name>.rules.ts       # optional: pure business rules, no I/O (server only)
    │       │   ├── <name>.listeners.ts   # subscribes to other features' events; calls its own service
    │       │   └── <name>.repository.ts  # Drizzle queries (server only)
    │       ├── db/
    │       │   └── schema.ts # tables owned by this feature
    │       └── __tests__/
    └── shared/
        ├── ui/               # shadcn/ui primitives + app-level composed components
        ├── hooks/            # generic React hooks used by 2+ features (shadcn alias target)
        ├── lib/              # pure utilities (cn(), formatting, dates, pagination schema, query-scope.ts)
        ├── config/           # env.server.ts (server only), env.ts (VITE_ variables only), constants
        ├── db/               # db client and DbOrTx type (client.ts), timestamps (columns.ts), readPgError (errors.ts)
        ├── errors/           # AppError type, appError factories, Result, toFormErrors, zodErrorDetails
        ├── events/           # generic event bus: define-event.ts (client-safe), bus.server.ts (server-only); knows no feature
        ├── server/           # shared middleware (auth, security headers), logger.server.ts, session helpers, withErrorBoundary, route response helpers
        └── testing/          # test utilities, factories
```

## Which files a feature needs

Create a file or folder when the feature needs it, not in advance.

| File or folder | Create when |
|---|---|
| `index.ts`, `README.md` | Always |
| `__tests__/` | Always, with the first logic |
| `schemas.ts`, `queries.ts`, `server/*.functions.ts`, `server/*.service.ts` | The feature takes input, reads, or writes through the server |
| `server/*.repository.ts`, `db/schema.ts` | The feature owns tables |
| `server/*.rules.ts` | A business rule has several branches or edge cases (`docs/03-standards/coding-standards.md`) |
| `components/`, `hooks/` | The feature has UI |
| `errors.ts` | The feature has an expected failure |
| `index.server.ts` | Another feature needs a service function, or this feature has listeners |
| `events.ts` | The feature publishes an event |
| `server/*.listeners.ts` | The feature reacts to another feature's event |

**Do not add other folders** (`constants/`, `stores/`, `types/`, `domain/`) inside a feature: a file that matches no category in `eslint.boundaries.js` gets no layer rules, so `check:gates` rejects it (`docs/03-standards/linting-and-formatting.md`). Types go in `schemas.ts` (inferred), constants next to the code that uses them.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `invoice-list.tsx` |
| React components | PascalCase export, one main component per file | `InvoiceList` |
| Hooks | `use` prefix | `useCreateInvoice` |
| Server function wrappers | `*.functions.ts`, export verbs | `createInvoice`, `getInvoice`, `listInvoices` |
| Server-only code | `*.server.ts` or under `server/` with `.service.ts` / `.rules.ts` / `.repository.ts` | |
| Zod schemas | `<thing>Schema`; inferred type `<Thing>` | `createInvoiceSchema`, `CreateInvoice` |
| Query keys | via key factory, never inline arrays | `invoiceKeys.detail(id)` |
| DB tables | plural snake_case in SQL, camelCase export in TS | `invoices` |
| Tests | `*.test.ts(x)` next to code or in `__tests__/` | |
| ADRs | `NNNN-title.md` | `0005-session-library.md` |

## Where does it go?

| I am writing… | Put it in |
|---|---|
| A page for URL `/invoices/$id` | `src/routes/invoices/$id.tsx` (thin) using `features/invoices` |
| A reusable button/input | `shared/ui` |
| A component used by one feature | that feature's `components/` |
| A component used by 2+ features | `shared/ui` if generic; otherwise rethink the feature boundary |
| A part of a large form or page | the feature's `components/sections/` (`docs/03-standards/components.md`) |
| A pure mapper between an entity and form values | the feature's `components/<entity>-form-values.ts` (`docs/04-stack/tanstack-form.md`) |
| The app's form hook and field wrappers | `shared/ui/app-form.ts`, `shared/ui/app-<name>.tsx` |
| A data table | columns and table in the feature's `components/`; `shared/ui/data-table.tsx` once a second table exists (`docs/04-stack/tanstack-table.md`) |
| A date formatter, a shared pagination schema | `shared/lib` |
| A generic hook used by 2+ features | `shared/hooks` |
| A Zod schema for a form | the feature's `schemas.ts` |
| An endpoint called by the app | server function in the feature |
| A webhook or public API | server route (see `docs/04-stack/tanstack-start.md`) |
| A DB table | owning feature's `db/schema.ts`, exported directly; `drizzle.config.ts` finds it with a glob (`docs/03-standards/database.md`) |
| A migration | `drizzle/`, generated (`docs/03-standards/database.md`) |
| A fact other features may react to (an event) | the owner's `events.ts`, exported from its `index.ts`; the reaction in the listener's `server/<name>.listeners.ts` (`cross-feature-communication.md`) |
| A complex business rule worth testing on its own, without the database | the feature's `server/<name>.rules.ts`; a `domain/` folder is not used (ADR 0013) |

## Imports

- Use the `@/*` path alias (set up by the TanStack CLI during `shadcn init -t start`; confirm in `tsconfig.json`). No `../../../` chains beyond one level.
- Import another feature only via `@/features/<name>` (its `index.ts`), or via `@/features/<name>/index.server` from server code (`*.functions.ts`, `*.service.ts`, `*.listeners.ts`, and server routes under `src/routes/api/**`). Never the other way around: UI and page routes do not import `index.server.ts`.
- Server-only modules MUST NOT be imported from client code except through `*.functions.ts` wrappers. Static imports of server function wrappers are safe; never dynamic `import()` them (per Start docs; lint rejects it: `docs/04-stack/tanstack-start.md`, rule 2).
