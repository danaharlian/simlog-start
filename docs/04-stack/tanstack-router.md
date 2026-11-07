---
applies_to: "@tanstack/react-router (with Start 1.0)"
last_verified: 2026-10-31
verified_against: "Router Query integration page (fetched 2026-10-18); Router external-data-loading docs (via Context7); Start routing guide; file naming and data loading guides, Start execution model guide, and a build and run with Router 1.170.46 (2026-10-31)"
---

# TanStack Router

**When to read:** before creating or editing anything in `src/routes/`, loaders, search params, navigation, or route context.

## Verified facts

- File-based routing under `src/routes/` with `__root.tsx` as the root. `src/routeTree.gen.ts` is **generated** by the Start/Router plugin.
- Root route is created with `createRootRouteWithContext<{ queryClient: QueryClient }>()` so loaders get `context.queryClient`.
- The documented loading pattern with TanStack Query (Router Query integration page, 2026-10-18): in the route `loader`, call `context.queryClient.query({ ...queryOptions, staleTime: 'static' })`; in the component, read the same options with `useSuspenseQuery`. The page states `ensureQueryData` and `prefetchQuery` are **deprecated** in favor of `queryClient.query`. Details and the streaming variant: `docs/04-stack/tanstack-query.md`.
- When TanStack Query owns caching, docs configure `defaultPreload: 'intent'` and `defaultPreloadStaleTime: 0` on the router so loaders always run on preload/visit.
- Routes can define `errorComponent` and `notFoundComponent`.
- **Route `loader`s are isomorphic:** they run on the server during SSR and on the client during navigation (Start execution model guide). Where `beforeLoad` runs was not stated on the pages read: `TODO(verify)`.

## File conventions

| Need | Convention |
|---|---|
| Root layout | `__root.tsx` |
| Dynamic segment | `$id` |
| Layout with no URL segment (auth guard, shell) | `_` prefix (`_authenticated`) |
| Folder that groups files, absent from the URL | `(group)` |
| Page at the parent's URL | `index` token |
| File kept next to routes, not a route | `-` prefix |
| Loading, failure, missing UI | `pendingComponent`, `errorComponent`, `notFoundComponent` on the route |
| Title and meta tags | `head` on the route; `<HeadContent />` in the root |
| Webhook or public endpoint | `server.handlers` on the route (`docs/03-standards/api-conventions.md`) |

## A thin route

Aim for about 20 lines: if it grows, the logic belongs in the feature.

```tsx
// src/routes/invoices/$id.tsx
import { createFileRoute } from '@tanstack/react-router'
import { InvoiceDetail, invoiceQueryOptions } from '@/features/invoices'

export const Route = createFileRoute('/invoices/$id')({
  head: () => ({ meta: [{ title: 'Invoice' }] }),
  loader: ({ context, params }) =>
    context.queryClient.query({ ...invoiceQueryOptions(params.id), staleTime: 'static' }),
  component: InvoicePage,
})

function InvoicePage() {
  const { id } = Route.useParams()
  return <InvoiceDetail id={id} />
}
```

| In a route | In a feature |
|---|---|
| Path, search param validation, `head` | Components with logic or state |
| `loader` that calls the feature's query options | Query options, server functions, services |
| `beforeLoad` redirect (UX only) | Authorization (function or middleware) |
| Choosing pending, error, and not-found UI | Business rules, schemas |

## Rules

1. **Routes are thin.** A route file: defines `createFileRoute(...)`, `validateSearch` (if needed), `loader` (calls feature `queryOptions`), and renders a feature component. No business logic, no direct DB or `fetch`.
2. **Never edit `routeTree.gen.ts`.** Exclude it from lint/format. It is committed (ADR 0007, L).
3. **Typed navigation only.** Use `Link`, `useNavigate`, `redirect` with route paths and typed `params`/`search`. No string-built URLs.
4. **Search params are state.** Filters, sorting, pagination, selected tab live in validated search params (Zod/Standard Schema), not in `useState`. `validateSearch` with a Zod 4 schema and `loaderDeps: ({ search }) => search` ran with no adapter (ADR 0014; sample in `docs/02-architecture/data-fetching.md`). Give each field a fallback with `.catch()`, so a bad URL does not throw.
5. **Loader data via Query**, not via the router's own loader data, for anything that is server state shared across components. (Loader return values are fine for route-specific, non-cached data.)
6. **Auth guards**: use a pathless layout route with `beforeLoad` to redirect unauthenticated users (UX). The real protection is in server functions (`docs/03-standards/security.md`).
7. **Code splitting / lazy routes:** follow the current docs; do not hand-roll.
8. Set `errorComponent`/`notFoundComponent` on the root and on major sections. Reset Query error boundaries in retry handlers.
9. Register the router type for end-to-end type safety exactly as the Start docs show for the installed version.
10. Use the official Router devtools in development only.

## Pitfalls

- Mixing code-based route definitions with file-based ones without reading the docs.
- Calling hooks (`useSuspenseQuery`) with different options objects than the loader used, which breaks cache sharing. Always import the same `queryOptions` factory.
- Search param schemas that silently drop unknown keys the UI needs.

## Verify before use

Search param validation API, `beforeLoad` context typing, preloading options, virtual file routes, route masking, `Register` module augmentation.
