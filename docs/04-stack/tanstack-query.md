---
applies_to: "@tanstack/react-query v5 line"
last_verified: 2026-10-31
verified_against: "Start TanStack Query guide; Router Query integration page and Query v5 migration page (fetched 2026-10-18); @tanstack/query-core 5.104.1 and 5.104.4 type definitions; Context7 (/tanstack/query v5.x); optimistic updates guide and a strict type-check against @tanstack/react-query 5.105.0 (2026-10-31); ADR 0035 fixture: `Register.queryMeta` in the installed 5.105.0 types, `invalidateFeature` type-checked, linted, and run against `QueryClient` 5.105.0 (2026-11-06)"
---

# TanStack Query

**When to read:** before fetching, caching, mutating, invalidating, or prefetching data. Which strategy to use, and observed behavior: `docs/02-architecture/data-fetching.md`.

## Verified facts

- With Start, create the `QueryClient` **inside `getRouter()`** (per request, avoids sharing cache across SSR requests) and connect it with `setupRouterSsrQueryIntegration({ router, queryClient })` from `@tanstack/react-router-ssr-query`. That integration supplies the provider and handles dehydration, hydration, and streaming. Put the client in router `context`.
- Pattern: `queryOptions({ queryKey, queryFn })` shared by the route loader (`queryClient.query({ ...options, staleTime: 'static' })`) and the component (`useSuspenseQuery`). `ensureQueryData` was the older loader call and is now **deprecated** (see the section below).
- Docs example sets `defaultOptions.queries.staleTime` explicitly (30 s in the guide). Our default is a decision below.

## Rules

1. **All server state goes through Query.** No `useEffect` + `fetch`, no copying query data into `useState`, no global store for server data.
2. **`queryOptions` factories** live in `features/<f>/queries.ts` and are the only way queries are declared. The `queryFn` calls a server function.
3. **Key factory per feature**, hierarchical: `[feature, entity, ...params]`. Never inline key arrays in components. The first segment is the feature's **scope**, a constant exported from its `index.ts`, so other features can name it in `dependsOn` (rule 12).

   ```ts
   export const invoicesScope = 'invoices'

   export const invoiceKeys = {
     all: [invoicesScope] as const,
     list: (filters: InvoiceFilters) => [...invoiceKeys.all, 'list', filters] as const,
     detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
   }
   ```
4. **Routes prefetch, components read.** Loader: `context.queryClient.query({ ...options, staleTime: 'static' })`; component: `useSuspenseQuery` with the same options. **Never use the deprecated imperative methods** (table below).
5. **Mutations** use `useMutation`, wrapped in a feature hook (`features/<f>/hooks/use-<verb>-<entity>.ts`), so the branch on `data.ok` and the invalidation live in one place. Reads need no wrapper: components pass the shared `queryOptions` to `useSuspenseQuery`. On success invalidate with `invalidateFeature(context.client, invoicesScope)` (rule 12), or update in place through the key factory, **only when the returned `Result` has `ok: true`**: a server function that returns `{ ok: false }` is a successful call to Query, so `onSuccess` runs, nothing retries, and `onError` never fires. Optimistic updates: see the section below.
6. **Set `staleTime` deliberately.** Team default: `staleTime: 30_000` (30 s) on the client, as in the Start guide, overridden per query by data volatility (ADR 0007, decision K). Do not leave everything at 0 by accident.
7. **Errors:** unexpected failures are thrown and reach route error boundaries via suspense; do not swallow in `onError`. Expected failures arrive as a `Result` in `data` (see `docs/03-standards/error-handling.md`): the component branches on `data.ok`. Library `retry` defaults are kept (ADR 0007): they apply only to thrown errors, and an `ok: false` result is never retried. Review `retry` per query type.
8. **No query inside loops or render conditionals** that break hook rules; use `useQueries` or restructure.
9. **Dependent/conditional queries** use `enabled` (with `useQuery`) or split into child components with suspense. Suspense hooks have no `enabled` or `placeholderData`, and several in one component run one after another unless the loader starts them together (`data-fetching.md`).
10. If using ESLint, enable `@tanstack/eslint-plugin-query` (see `linting-and-formatting.md`).
11. **Persist/offline caching** needs an ADR (sensitive data must not be persisted unencrypted).
12. **A query that holds another feature's data declares it** (ADR 0035). Rendering B's query options keeps B's key, so B's invalidation reaches it: prefer that (`cross-feature-communication.md`, "Which mechanism"). When A's server function must join B's data (sorting or filtering by it on the server), A's `queryOptions` add `meta: { dependsOn: [customersScope] }`, and every mutation hook invalidates with `invalidateFeature`, which reaches the feature's own queries and every query that depends on it. A missing `dependsOn` stays stale silently: the feature spec lists these queries (section 7), and review checks them.

    ```ts
    // shared/lib/query-scope.ts (ADR 0035: type-checked, linted, and run on 5.105.0)
    import type { QueryClient } from '@tanstack/react-query'

    interface AppQueryMeta extends Record<string, unknown> {
      dependsOn?: ReadonlyArray<string>
    }

    declare module '@tanstack/react-query' {
      interface Register {
        queryMeta: AppQueryMeta
      }
    }

    export function invalidateFeature(queryClient: QueryClient, feature: string): Promise<void> {
      return queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === feature || (query.meta?.dependsOn?.includes(feature) ?? false),
      })
    }
    ```

    Its unit test covers an own key, a dependent query, and an unrelated one. `meta` takes only this registered shape: `dependsOn: 'customers'` does not compile.

## Optimistic updates (selective)

Use them only for actions that rarely fail and are cheap to undo. Everything else waits for the server.

| Optimistic | Wait for the server |
|---|---|
| Toggle a like or bookmark, mark as read | Form submissions, anything the server validates in a way the user must see |
| Reorder items, add to a cart | Payments, deletions, anything irreversible |

**One place shows the result: use the UI approach.** Render `variables` while `isPending`. It writes nothing to the cache, so there is no rollback to write; the temporary value disappears when the mutation settles. On `data?.ok === false`, show the error.

**Several places show it: use the cache approach.** **Because of our `Result`, rollback has two paths:** the documented `onError` handles thrown failures only.

```ts
// features/invoices/hooks/use-set-bookmark.ts
export function useSetBookmark(id: string) {
  const queryClient = useQueryClient()
  const queryKey = invoiceKeys.detail(id)
  return useMutation({
    mutationFn: (bookmarked: boolean) => setInvoiceBookmark({ data: { id, bookmarked } }),
    onMutate: async (bookmarked) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Result<Invoice>>(queryKey)
      queryClient.setQueryData<Result<Invoice>>(queryKey, (old) =>
        old?.ok ? { ok: true, data: { ...old.data, bookmarked } } : old,
      )
      return { previous }
    },
    onError: (_error, _bookmarked, onMutateResult) => {
      queryClient.setQueryData(queryKey, onMutateResult?.previous)
    },
    onSuccess: (result, _bookmarked, onMutateResult) => {
      if (!result.ok) queryClient.setQueryData(queryKey, onMutateResult.previous)
    },
    onSettled: () => invalidateFeature(queryClient, invoicesScope),
  })
}
```

Type-checked and linted against 5.105.0 (ADR 0035 fixture); not run in a component. The callbacks also receive the client as their last argument, `context.client`, but `onSettled` then takes five parameters and fails the lint limit of four (ADR 0034), so the hook takes it from `useQueryClient()`. Older tutorials use a different callback order: check the installed types. Every optimistic hook has a test for both rollback paths. React's `useOptimistic` is not the pattern here, because the data lives in Query.

## Deprecated imperative methods (verified 2026-10-18)

In `@tanstack/query-core` 5.104.1 and 5.104.4 (the installed range) these are marked `@deprecated` and "will be removed in the next major version". The official migration page ("Imperative QueryClient methods") and the Router Query integration page give the same replacements. They still compile, so the compiler will not catch them.

| Deprecated | Use instead |
|---|---|
| `fetchQuery(options)` | `queryClient.query(options)` |
| `prefetchQuery(options)` | `void queryClient.query(options).catch(noop)` |
| `ensureQueryData(options)` | `queryClient.query({ ...options, staleTime: 'static' })` |
| `fetchInfiniteQuery(options)` | `queryClient.infiniteQuery(options)` |
| `prefetchInfiniteQuery(options)` | `queryClient.infiniteQuery(options).catch(noop)` |
| `ensureInfiniteQueryData(options)` | `queryClient.infiniteQuery({ ...options, staleTime: 'static' })` |

Loader patterns from the Router docs:

```ts
// Blocking, cache-first (replaces ensureQueryData)
loader: ({ context }) =>
  context.queryClient.query({ ...postsQuery, staleTime: 'static' }),

// Non-blocking, streamed to the client (do not await or return it)
loader: ({ context, params }) => {
  void context.queryClient.query(userQuery(params.id)).catch(noop)
},
```

Notes:
- `noop` is imported from `@tanstack/react-query` (as in the Router docs example).
- `query()` **rejects** when the fetch fails, and does not retry unless `retry` is set (type docs). In a loader, a rejection reaches the route `errorComponent`. Prefetch-style calls swallow it with `.catch(noop)`.
- `staleTime: 'static'` means existing cached data is never treated as stale for that call; a query with no data still fetches. This reproduces the old `ensureQueryData` cache-first behavior.
- Returning or awaiting the promise from a loader blocks SSR until it settles; not returning it starts the query on the server and streams it (Router docs).
- Enforce with the type-aware deprecation lint rule (`docs/03-standards/linting-and-formatting.md`).

## v5 migration traps (verify against v5 docs before relying on them)

Agents trained on v4 commonly produce: positional-argument signatures instead of a single options object; `cacheTime` instead of `gcTime`; `isLoading` where `isPending` is meant; `onSuccess`/`onError` callbacks on `useQuery` (removed in v5). Check the current v5 docs.

## Verify before use

SSR integration package API, `useSuspenseQuery` behavior with streaming, `useMutation` option names, `queryOptions` typing helpers, devtools package names, and the `@deprecated` tags on any `QueryClient` method you are about to call (open the installed `.d.ts`).
