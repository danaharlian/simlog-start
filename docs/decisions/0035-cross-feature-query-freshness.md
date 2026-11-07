# 0035 Fresh cross-feature queries after a mutation

- Status: accepted
- Date: 2026-11-06
- Deciders: owner, via chat, 2026-11-06: "ADR 0035 sesuai rekomendasi anda", accepting the recommended option (`meta.dependsOn` and `invalidateFeature`) over the fallbacks below. Drafted by the agent after the owner asked to adopt points 1 to 6 of a comparison with a reference skill set. Resolves open decision AI
- Extends: ADR 0009 (cross-feature communication), ADR 0007 decision K (`staleTime`)

## Context

A mutation hook invalidates through its own feature's key factory, and only when `data.ok` (`docs/04-stack/tanstack-query.md`, rules 3 and 5). The first key segment is the feature name.

Two ways a feature shows another feature's data:

| How feature A shows B's data | Key | After B changes the data |
|---|---|---|
| A renders B's query options (`cross-feature-communication.md`, "Which mechanism", row 1) | B's | B's invalidation reaches it. **No gap** |
| A's own server function joins B's data through B's `index.server.ts` (an invoice list with customer names, sorted or filtered on the server) | A's | B's hook invalidates `['customers', …]` only. A's query keeps the old name until its `staleTime` (30 s, ADR 0007 K) passes and something triggers a refetch |

B cannot invalidate A's keys: it would import A, and A already imports B, a cycle (`cross-feature-communication.md`: cycles are forbidden). Today no doc names this case.

**Verified** in the TanStack Query docs through Context7 `/tanstack/query` (main branch, 2026-11-06), and the first point also in the installed 5.105.0 types (`Register`, `QueryMeta` in `query-core/build/modern`):

- `meta` on a query is typed through module augmentation of `Register` with `queryMeta`; the type must extend `Record<string, unknown>`. The cache entry exposes it as `query.meta`.
- `invalidateQueries` takes `QueryFilters`, including `predicate: (query) => boolean`. "All provided filters must match", so `queryKey` plus `predicate` is an AND; "own key **or** a declared dependency" needs one predicate.
- `refetchType` defaults to `'active'`: matched queries with an observer refetch now, the rest are marked stale and refetch on next use.

## Decision

1. **Prefer row 1.** When A can render B's data through B's query options, it does, and nothing below applies.
2. **A query whose own result holds another feature's data declares it:** `meta: { dependsOn: [customersScope] }` in its `queryOptions`. The scope is the owner's key root, exported from the owner's `index.ts` and used as the first segment of its key factory.
3. **One shared helper invalidates a feature and its dependents.** `shared/lib/query-scope.ts` registers the meta type and exports `invalidateFeature(queryClient, feature)`. It knows no feature.
4. **Mutation hooks call `invalidateFeature(context.client, <own scope>)`** where they call `invalidateQueries({ queryKey: <x>Keys.all })` today, still only when `data.ok`. An optimistic hook calls it in `onSettled`.
5. **The feature spec lists each such query** (section 7) with its `dependsOn`; review checks the list against the server functions that join another feature's data.

```ts
// shared/lib/query-scope.ts (type-checked, linted, and run on 5.105.0: see Verification)
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

## Consequences

- The owner stays unaware of its consumers; the consumer names a scope it can already import. The dependency direction does not change.
- **Broader invalidation:** after any mutation of B, every query of B and of its dependents is marked stale, and the active ones refetch. Cost on a real page: **Unknown**; nothing measures it (decision X).
- **A missing `dependsOn` stays stale silently.** No lint rule can tell which fields of a result came from another feature; the spec's section 7 list and review are the only check.
- Other tabs and other users are not refreshed. That is the same as today; a push channel would need its own ADR.

Done in the same change: rules 3, 5, and 12 in `tanstack-query.md`; `cross-feature-communication.md`; `state-management.md`; `tanstack-start.md`; `data-fetching.md`; `folder-structure.md`; section 7 of `templates/feature-spec.md`; `add-server-function` step 5; the `code-review` data pass. Left for the app: the task that first creates `shared/lib/query-scope.ts` adds its unit test with the three cases under Verification.

## Not verified

- `check:gates` and `check:ui` were not run on the fixture; the lint run included the boundary config. A real Start app (`test-real-app.sh`) was not run.
- The fixture's `tsconfig.json` was written for the check (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), not copied from the scaffold.
- The refetch cost on a page with several queries: **Unknown**.

## Alternatives considered

- **Do nothing; rely on `staleTime` and refetch on focus.** No code. A user who renames a customer and opens the invoice list within 30 s sees the old name.
- **The owner's hook invalidates the consumer's keys.** The owner would import the consumer: a cycle, forbidden.
- **Invalidate every query after every mutation** (`invalidateQueries()` with no filter). Nothing to declare or forget; every active query on the page refetches after each mutation. The simplest choice; cost **Unknown**. The fallback if the owner rejects the meta declaration.
- **Mutation `meta` and a global `MutationCache` `onSuccess` in `getRouter()`.** Same reach, one call site instead of one per hook. The global callback sees `data` as `unknown`, so branching on `ok` needs a Zod parse of the `Result` there; more moving parts for the same effect.

## Verification

Docs consulted (2026-11-06), Context7 `/tanstack/query`, main branch, not pinned to the installed version:

- `docs/framework/react/typescript.md`, "Registering global Meta" (https://github.com/tanstack/query/blob/main/docs/framework/react/typescript.md)
- `QueryFilters` and `matchQuery` reference ("All provided filters must match"); `InvalidateQueryFilters` (`refetchType`, default `'active'`)
- Query invalidation guide, "predicate"
- `packages/query-core/src/query.ts`, the `meta` getter on a cache entry

Runs on 2026-11-06 in a scratch fixture (macOS, Node 24.22.1, pnpm 12.16.1) with `@tanstack/react-query` 5.105.0, TypeScript 6.0.3, eslint 10.13.0, typescript-eslint 8.72.1, `@tanstack/eslint-config` 0.4.0, eslint-plugin-boundaries 7.2.0, and the installer's `eslint.ai-docs.js` with the three configs in `docs/examples/`:

- `tsc`: exit 0 for `query-scope.ts`, an owner feature exporting `customersScope` and a mutation hook calling `invalidateFeature(context.client, customersScope)` in `onSuccess`, and a consumer `queryOptions` with `meta: { dependsOn: [customersScope] }`. `meta: { dependsOn: 'customers' }` fails with TS2769, so the registered type is enforced.
- `eslint --max-warnings 0`: exit 0. A planted `as` cast, `string[]`, and `export default` in the same file gave 3 errors, so the rules were applied.
- The optimistic sample in `tanstack-query.md`, with `invalidateFeature` in `onSettled`: `tsc` exit 0, but `eslint` failed `max-params` on `onSettled` (five parameters with `context`, limit four since ADR 0034). The sample had five parameters before this change too, so it had failed our lint since ADR 0034. It now takes the client from `useQueryClient()`; `tsc` and `eslint` exit 0.
- Runtime, `QueryClient` 5.105.0: after `invalidateFeature(client, 'customers')`, `['customers', 'detail', 'c1']` and `['invoices', 'list', 1]` with `dependsOn: ['customers']` were invalidated; `['products', 'list', 1]` and a query with `dependsOn: ['products']` were not.
