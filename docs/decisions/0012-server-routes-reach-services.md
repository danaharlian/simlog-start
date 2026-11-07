# 0012 Server routes reach services through `index.server.ts`

- Status: accepted
- Date: 2026-10-31
- Deciders: owner (approved option A of decision Y, including the change to `eslint.boundaries.js`)
- Extends: ADR 0009, ADR 0010

## Context

A webhook or cron call has no user session, so it needs a feature's service directly. ADR 0009 left this open and ADR 0010 recorded it as decision Y: a route that imported `index.server.ts` was bundle-safe, but the boundary lint rejected it.

Facts checked on 2026-10-31 in a scratch app set up with `install.sh` (Start 1.169.4, ESLint 10.13, eslint-plugin-boundaries 7.2.0, typescript-eslint 8.72.1, the `@tanstack/eslint-config` rules):

1. With the new category, `src/routes/api/webhooks/billing.ts` importing `index.server.ts` passes lint. Before it, the same import was an error.
2. Still errors: a route in `src/routes/api/` importing `server/*.service.ts`; a page route importing `index.server.ts`; a UI file importing `index.server.ts`.
3. `vite build` passes, and a marker string in the service is absent from `dist/client`.
4. On the built server: a valid signature returned 200 with no `Origin`; a repeated event id returned 200 and changed nothing; a bad, missing, or stale signature returned 401; a valid signature over a bad payload returned 400.
5. **A valid signature over malformed JSON returned 500**, because `JSON.parse` threw. Providers usually retry a 5xx (**Inferred**), so a service that wants a 400 must handle the parse failure.
6. All five gates passed: `lint`, `typecheck`, `check:suppressions`, `check:gates`, `check:docs`.

`check:gates` (`check-lint-integrity.mjs`) does not read the boundary rules, so passing it says nothing about this rule. Facts 1 and 2 are the evidence for the rule itself.

## Decision

1. Files under `src/routes/api/**` get the lint category `route-handler`, which may import another feature's `index.server.ts`. Nothing else about them changes: feature internals stay forbidden.
2. A route stays transport: it reads the raw body and the signature, calls one service function, and answers with the helpers in `api-conventions.md`.
3. The service verifies the signature over the raw body, parses with Zod, rejects duplicates by event id, saves in a transaction, and only then returns success. It receives strings, not a `Request`.
4. These routes run no server function middleware, so **each one authenticates its own requests**. Review checks this; lint cannot.
5. A route that serves our own logged-in UI still prefers a server function from `index.ts`, whose middleware handles the session.

## Consequences

- Page routes keep the old rule, because their code reaches the client bundle.
- The category covers all of `src/routes/api/**`, including the Better Auth route, which does not use it.
- Existing apps pick the rule up by running the installer again. A team-edited `eslint.boundaries.js` is kept and reported, so it needs the two lines by hand.
- Adapters for a vendor SDK are still decision S. A webhook verified with `node:crypto` needs none.

Also fixed while running the gates: the `AppError` and `Result` snippets in `error-handling.md` used type parameters `K`, `C`, and `E`, which fail `@typescript-eslint/naming-convention` in `@tanstack/eslint-config`. They are now `TKind`, `TCode`, and `TError`.

## Not verified

- A real provider's webhook, a real database transaction, and event ids that survive a restart: the test used an in-memory set.
- A file under `src/routes/api/` that also renders a component: lint would allow the import, and the bundler's result was not tested. Keep these files free of UI.

## Alternatives considered

- **Go through a server function from `index.ts`.** Passes lint today, but session middleware does not fit a signed request, and the raw body would have to cross a validator.
- **Put the logic in the route.** Breaks "routes are thin" and could not reach the feature's repository.
- **A narrower pattern, `src/routes/api/webhooks/**`.** Cron and public API routes need the same access.

## Verification

Docs consulted (2026-10-31): `@tanstack/react-start`: server-routes guide (tanstack.com/start/latest). `eslint-plugin-boundaries` 7.2.0: behavior from running it, as in `linting-and-formatting.md`. `node:crypto` `createHmac`, `timingSafeEqual`: run on Node 24.
