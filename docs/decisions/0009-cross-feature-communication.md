# 0009 Cross-feature communication: two public entry points and typed events

- Status: accepted (durable events: criteria only, nothing implemented)
- Date: 2026-10-30
- Deciders: owner
- Extends: ADR 0001 (feature-driven modular monolith)

## Context

The owner compared this repo with a Next.js reference pipeline that uses a `contract.ts` per feature (read-only getters), an event bus, and a transactional outbox, and asked how feature A should use feature B, whether an event bus should be the default for an enterprise application, and what would be correct in TanStack Start.

Our rule until now: a feature exposes only `index.ts`; other features import from it; events are allowed but undocumented in practice. Three gaps were open: when to call versus when to publish an event, whether one `index.ts` can mix client and server code, and where subscribers are registered.

Facts checked on 2026-10-30 in a test app (TanStack Start 1.169.4, Vite 8.3.5, eslint-plugin-boundaries 7.2.0, TypeScript 6.0.3, the owner's `eslint.config.js`, `tsconfig.json`, and `vite.config.ts`):

1. **A barrel that re-exports server code leaks it.** With a plain `b.service.ts` (importing `node:fs`) re-exported from `features/b/index.ts`, a route that imports only the component builds without leaking (unused exports are tree-shaken). A route that also calls the service function through the barrel **builds with exit code 0 and one warning** ("externalized for browser compatibility"), and the server code is in the client bundle.
2. **`*.server.*` files are denied in the client environment at build time** ("Import denied in client environment, denied by file pattern `**/*.server.*`"). If a barrel re-exports such a file, **every** client import of the barrel fails the build, even when the import is unused.
3. **Two entry points work.** `index.ts` (components, query options, types, event definitions, server function wrappers) and `index.server.ts` (service functions, listener registration). A server function in feature A importing `@/features/b/index.server` builds; the client bundle contained none of the markers. A client route importing `@/features/b/index.server` fails the build.
4. **Boundary lint can enforce the same split.** A new category `public-server` (`src/features/*/index.server.ts`) allowed only from `function`, `service`, and `listener` files: those pass; UI files and routes are rejected ("no policy allowing dependencies ... to file of category public-server"); a feature importing its own entry points is rejected.
5. **Typed events compile without casts.** An event is `{ name, schema }` (Zod). `publish(event, payload)` and `subscribe(event, handler)` infer the payload from the schema; a wrong payload fails `tsc`; the bus validates each delivery with `safeParse` instead of casting; it passes `pnpm lint` including the no-cast rules.
6. **Subscriber registration works from `src/start.ts`.** A request middleware whose `.server()` callback dynamically imports `./subscribers.server` and calls an idempotent `registerAllSubscribers()`. Calling the built server's `fetch` three times: subscribers were registered once (not per request), every request returned 200, and a deliberately throwing handler was counted but did not fail the request.
7. **The production server output is a `fetch` handler** (`createServerEntry({ fetch })`), not a standalone Node server. Running it on Node in a container still needs the hosting setup that `tanstack-start.md` lists as `TODO(verify)`.
8. **`src/start.ts` replaces the automatic CSRF middleware.** Per `tanstack-start.md`, defining `src/start.ts` means adding `createCsrfMiddleware` yourself.

## Decision

1. **Reading another feature's data:** call its public API. Client-safe things (components, query options, types, schemas, event definitions, server function wrappers) are exported from `index.ts`. **Server-only functions (services, listener registration) are exported from `index.server.ts`**, which only server code (`*.functions.ts`, `*.service.ts`, `*.listeners.ts`) may import. UI and routes never import it. Enforced by the bundler (item 2) and by lint (item 4).
2. **Changing another feature's data so that both succeed together:** call a service function exported through the other feature's `index.server.ts`, inside **one transaction**. The shape of the transaction handle that crosses features is `TODO(verify)` against Drizzle 1.0 before the first slice that needs it.
3. **Reactions and side effects (notify, audit, update a summary): typed in-process events, the default.** The owning feature defines events in `events.ts` (name and Zod payload schema; pure, client-safe) and exports them from `index.ts`. A generic bus lives in `shared/events/` (`define-event.ts` client-safe, `bus.server.ts` server-only; it knows nothing about any feature). A feature subscribes in `server/<name>.listeners.ts` and exports `register<Feature>Listeners` from `index.server.ts`. The one composition root `src/subscribers.server.ts` calls every feature's register function once; it is started from a request middleware in `src/start.ts`.
4. **Failure semantics:** events are best-effort. A handler that throws is logged once and never fails the publisher. The bus validates the payload with the schema before calling the handler. Handlers return nothing; they call the feature's service like a server function does.
5. **Durable events (transactional outbox) are not implemented.** Move to durable only when a reaction must not be lost (payment, external integration, mandatory audit) or must survive a restart or reach another instance; that needs its own ADR before any code. Minimum content of that ADR: the event row written in the same transaction as the change; a dispatcher with retries and back-off; idempotent consumers; failed deliveries visible to an operator; versioned payloads.
6. **Not adopted:** a `contract.ts` file name (the two entry points play that role); a central event map in `shared` (it would make `shared` know every feature); an event bus library; events for reads.

## Consequences

- `AGENTS.md`, `modular-monolith.md`, `folder-structure.md`, `tanstack-start.md`, the tech-spec template, `error-handling.md`, and the `new-feature`, `write-tech-spec`, and `code-review` skills changed with this ADR.
- `docs/examples/eslint.boundaries.js` gained categories `public-server`, `listener`, and `events` and one allow policy. Existing apps pick it up by running the installer again (a file the team edited is kept and reported).
- The tech spec lists, per event, its delivery class (best-effort in-process or durable) and where it is subscribed.
- Using `src/start.ts` brings the CSRF duty of item 8 into every app that registers subscribers this way.

## Not verified (do not treat as settled)

- Dev server with hot reload: module-level state may be re-created, so registration might happen twice. Guard before relying on it (a flag on `globalThis` is the candidate, untested).
- The registration middleware was exercised through a page request. Server function RPC calls from the browser and server routes were not.
- Several container instances: in-process events reach only the instance that published them. This is why anything that must not be lost needs the durable path.
- A server route (`src/routes` handler) that needs another feature's `index.server.ts`: the lint policy does not allow it yet. Decide when the first one appears.
- The Node hosting setup (item 7), the transaction handle across features (Decision 2), and the runtime cost of validating every delivery.

## Alternatives considered

- **Events for everything, including reads.** Events return nothing, so a dashboard asking an orders feature for a summary would need request/reply plumbing. Rejected.
- **Durable outbox from day one.** Needs a table, a dispatcher process, and monitoring, and the hosting setup is not settled. Rejected for now; criteria recorded above.
- **One `index.ts` with a naming convention only.** Fails silently (item 1). Rejected.
- **A `contract.ts` per feature, as in the reference.** Same idea as the two entry points, plus a central event type map that conflicts with "`shared` never imports features" and sample code that queries the database and casts. Not adopted as written.

## Verification

Re-run when Start, Vite, or `eslint-plugin-boundaries` changes major or minor: build a test app where (a) a client route imports a feature's `index.ts`, (b) a server function in another feature imports `index.server.ts`, and (c) a client route imports `index.server.ts`. Expected: (a) and (b) build with no server markers in `dist/client`; (c) fails with "Import denied in client environment"; lint rejects (c) and accepts (b). Then call the built server's `fetch` a few times and check that subscribers register once.
