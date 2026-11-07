---
applies_to: "@tanstack/react-start >= 1.169 (1.0 stable)"
last_verified: 2026-10-31
verified_against: "tanstack.com/start/latest docs: server-functions, server-routes, middleware, execution-model, migrate-from-release-candidate, routing; Context7; the skills shipped in @tanstack/react-start 1.169.4; builds and a run of the built server in a test app with Start 1.169.4 and Vite 8.3.5 (2026-10-30 and 2026-10-31)"
---

# TanStack Start

**When to read:** before touching `vite.config.ts`, `src/router.tsx`, `src/start.ts`, server functions, server routes, middleware, hosting, or SSR behavior.

Official docs are available as Markdown by appending `.md` to a page URL (e.g. `https://tanstack.com/start/latest/docs/framework/react/guide/server-functions.md`). Use them for exact APIs.

## Verified facts

- Start 1.0 stable declared 2026-10-13. **Requires Vite 8** when building with Vite.
- Vite plugin is `tanstackStart()` from `@tanstack/react-start/plugin/vite`; the React plugin (`viteReact()`) MUST come after it.
- `src/router.tsx` MUST export `getRouter()` that returns a **new router per call** (required for SSR isolation). Create the `QueryClient` inside it.
- Server function validation is **`.validator(...)`**. `.inputValidator()` existed in RCs and was **removed** in 1.0. Both functions and middleware.
- Removed/changed in 1.0 vs RCs (per migration guide): `@tanstack/nitro-v2-vite-plugin` → `nitro()` from `nitro/vite`; built-in `useSession` removed (use a session library; existing session cookies are not readable by the replacement); uncaught errors produce a generic JSON body with a status 400 to 599; a server function call rejects with whatever was thrown.
- Server functions are **same-origin RPC**. CSRF middleware is auto-installed **for server functions** unless you define `src/start.ts`; if you do, add `createCsrfMiddleware` yourself (see "CSRF" below).
- Input/output of server functions must be serializable (strict mode by default).
- **Code is isomorphic by default** (Start's shipped skill): server-only logic belongs in `createServerFn`, `createServerOnlyFn`, or `*.server.*` files. **Checked 2026-10-30:** a plain service function re-exported from a barrel and used by client code builds with exit code 0 and one warning ("externalized for browser compatibility"), and its code is in the client bundle. Unused exports are tree-shaken, so the leak only appears when the client uses the export.
- **`*.server.*` files are denied in the client build** ("Import denied in client environment, denied by file pattern `**/*.server.*`", with the import trace). A barrel that re-exports a `*.server.*` file makes **every** client import of the barrel fail, used or not. Static imports of server function wrappers from client code are safe (the client gets RPC stubs; the handler body and its imports are removed).
- **The production server output is a `fetch` handler** (`createServerEntry({ fetch })`), not a standalone Node server: it can be called directly (`server.fetch(new Request(url))`) in tests, but running it in a container needs the hosting setup (rule 11).
- A request middleware in `src/start.ts` (`requestMiddleware: [...]`) whose `.server()` callback dynamically imports a `*.server.ts` module builds and runs; module state persists across requests in the same process. Defining `src/start.ts` removes the automatic CSRF middleware (above). Not checked: dev server with hot reload, server function RPC calls from the browser.
- **Server functions run in parallel from the browser** (three started within 1 ms), so they are the default `queryFn`. A `GET` carries its input in the URL as `?payload=...`. A thrown `redirect()` is followed from a `queryFn` or `mutationFn` and through `useServerFn`, but not from a bare call in an event handler. Checked in Chromium, 2026-10-31 (ADR 0014; `docs/02-architecture/data-fetching.md`).
- **Server routes** are files in `src/routes/` with `server: { handlers: { GET: ({ request, params, context }) => ... } }` on `createFileRoute`. **Checked 2026-10-31 on the built server:** `Response.json` works; a handler can call a server function, whose middleware reads the original request's headers; a route that statically imports `index.server.ts` leaves no server code in `dist/client` (lint allows this only under `src/routes/api/**`: ADR 0012).

## Rules

1. **File organization** for server code (adapted from the official guide): `*.functions.ts` = `createServerFn` wrappers (safe to import anywhere); `*.server.ts` / `server/*.service.ts` / `*.repository.ts` = server-only, imported only from handlers; plain `.ts` = client-safe (schemas, types). See `docs/02-architecture/folder-structure.md`.
2. **Static imports** of server function wrappers are safe in client code: the client build replaces the handler with an RPC stub. **Do not dynamic-import** them (`await import('…/x.functions')`): the official guide warns that it "can cause bundler issues" (Server Functions guide, "File Organization"; Start's shipped skill `start-core/server-functions`; checked 2026-11-06). Lint rejects it when the path is a literal (`docs/03-standards/linting-and-formatting.md`, "Code rules"); a path built at run time is left to review.
3. A server function = `createServerFn({ method })` + optional `.middleware([...])` + `.validator(schema)` + `.handler(...)`. Keep handlers thin (`docs/03-standards/api-conventions.md`).
4. Authenticate/authorize in middleware or the handler for every function touching private data. `beforeLoad` is not a data boundary.
5. For external consumers (webhooks, public API) use **server routes**, not server functions.
6. Response caching: set `Cache-Control` deliberately; `public` only for non-personalized data. Identity-dependent data: `private` or `no-store`.
7. Throw `redirect()` / `notFound()` (from `@tanstack/react-router`) for routing semantics; other errors follow `docs/03-standards/error-handling.md`.
8. Do not set `strict: false` on server functions without an ADR.
9. **Features expose server-only code through `index.server.ts`, never through `index.ts`**, so a client import fails at build time instead of leaking (`docs/02-architecture/cross-feature-communication.md`, ADR 0009).
10. **Do not use** features marked experimental in the docs (e.g. custom `generateFunctionId`) without an ADR. React Server Components support: status not verified here; do not adopt without an ADR.
11. Runtime: **Node in a container** (ADR 0007, F). **TODO(verify):** which Nitro preset or server output the installed Start version needs for Node, and the container steps. Follow the "Hosting" and "Production Checklist" guides for the Node target; do not write deploy commands from memory.

## CSRF

`createCsrfMiddleware()` checks `Sec-Fetch-Site`, `Origin`, or `Referer`, and rejects what it cannot prove same-origin (middleware guide). Global setup, as documented; the filter keeps it off server routes:

```ts
// src/start.ts
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware /* , other request middleware */],
}))
```

Observed on the built server, 2026-10-31 (requests with crafted headers, no real browser):

| Setup | Target | Cross-site or no headers | Same-origin |
|---|---|---|---|
| No `src/start.ts` | Server function | 403 | 200 |
| `src/start.ts` with the filter above | Server function | 403 | 200 |
| **`src/start.ts` without CSRF** (build passes) | Server function | **200: unprotected** | 200 |
| Any of these | Server route with no middleware of its own | 200 | 200 |
| Any of these | Server route with `server: { middleware: [createCsrfMiddleware()] }` | 403 | 200 |

What this means when you use it on a route:

- **It rejects more than cross-site:** also `Sec-Fetch-Site: same-site` (a subdomain), `Sec-Fetch-Site: none` (a direct visit), and requests with no such headers (curl, webhooks). `GET` is rejected too. Do not use it on a route opened by direct visit, or on one called from outside the app.
- **The 403 body is plain text `Forbidden`,** not the JSON shape in `api-conventions.md`. A client must handle it by status.
- **A server route that calls a server function does not trigger the function's CSRF check** (201 from a foreign `Origin`). The route needs its own middleware.
- **Public origin differs from the request URL (a proxy, for example):** the docs provide `createCsrfMiddleware({ origin })`. **Inferred:** our container deployment may need it, with `APP_URL` from env; check when hosting is set up.

## Security headers

Set them in a request middleware; a `next.config.ts` equivalent does not exist here. Checked on 2026-10-31 on a production build in Chromium: type-checked, linted, and with no CSP violation; the page hydrated and a server function answered.

```ts
// shared/server/security-headers.ts: put it first in requestMiddleware, in src/start.ts
export const securityHeaders = createMiddleware().server(async ({ next }) => {
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const result = await next({ context: { nonce } })
  const { headers } = result.response
  headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
  )
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return result
})
```

```ts
// src/router.tsx: pass the nonce on, so the router's own inline scripts carry it
export function getRouter() {
  const nonce = typeof window === 'undefined' ? getGlobalStartContext()?.nonce : undefined
  return createRouter({ routeTree, ssr: { nonce } })
}
```

| Setup | Observed |
|---|---|
| `script-src 'self'`, no nonce | **Status 200 and a blank page.** The inline scripts are blocked, and the content does not appear. Nothing fails in the build |
| Nonce through `ssr.nonce` | Page renders and hydrates; every script tag carries the nonce |
| Middleware above | Headers present on a page, a server route, a 404, and a server function |

`ssr.nonce` comes from the installed `router.d.ts`, and `getGlobalStartContext` from the package's exports; no docs page describing this pair was found. **Not checked:** the dev server, a stylesheet or font from another origin, inline styles from a component library, and static files served by a proxy, which do not pass through this middleware. Add those sources to the policy deliberately. HSTS belongs where TLS ends. The policy for a real app is open decision AC.

## Next.js habits that do not apply

Training data and many references assume Next.js. Do not write the left column here.

| Next.js | Here |
|---|---|
| `"use server"`, Server Actions | `createServerFn` in `*.functions.ts` |
| `"use client"`, Server Components by default | No such split: code is isomorphic. Server-only code goes in `createServerFn`, `createServerOnlyFn`, or `*.server.*` files |
| `app/api/x/route.ts`, `NextResponse.json` | Server route with `server.handlers`; `Response.json` |
| Fetching in a Server Component | Route `loader` + `queryOptions` + `useSuspenseQuery` |
| `revalidatePath`, `revalidateTag` | `invalidateFeature` with the feature's scope, when `data.ok` (`tanstack-query.md`, rule 12) |
| `React.cache()`, `unstable_cache` | The Query cache (`state-management.md`) |
| `useOptimistic` | `useMutation` with `variables` or the cache (`tanstack-query.md`) |
| `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` | Route files; `pendingComponent`, `errorComponent`, `notFoundComponent` (`tanstack-router.md`) |
| `export const metadata` | `head` on the route |
| `proxy.ts`, `middleware.ts` | `beforeLoad` (UX); function middleware (protection); `requestMiddleware` in `src/start.ts` (global) |
| `instrumentation.ts` | `src/subscribers.server.ts`, started from `src/start.ts` |
| `nuqs`, Zustand, Prisma | Validated search params; `state-management.md`; Drizzle |
| `NEXT_PUBLIC_*` | `VITE_*` (`docs/03-standards/environment.md`) |
| `headers()` in `next.config.ts` | Request middleware (see "Security headers") |
| `getQueryClient()` singleton, `HydrationBoundary`, `dehydrate()` | `QueryClient` inside `getRouter()`, `setupRouterSsrQueryIntegration` (`tanstack-query.md`) |
| `compiler.removeConsole` | Not set up (`docs/03-standards/logging.md`) |

## Pitfalls

- Copying tutorials written for the beta/RC or for the old `@tanstack/start` package (renamed `@tanstack/react-start`) and Vinxi-based config.
- Putting DB access directly inside route loaders instead of calling a server function/service.
- Forgetting CSRF middleware after adding `src/start.ts`: nothing fails in the build, so add a test that a cross-site call to a server function gets 403.

## Verify before use

Server function API, middleware API, `src/start.ts` shape, env var handling, server entry/error handling, hosting adapter config: always read the current page for the installed version.
