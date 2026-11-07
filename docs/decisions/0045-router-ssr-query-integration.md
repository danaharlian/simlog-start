# 0045 Add @tanstack/react-router-ssr-query

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Tech Lead), via chat, 2026-11-08: “06-feature-spec auth: AH pakai vitest.config, ADR 0043 accepted, ssr-query pakai ADR, setujui 2 export tambahan di 05, section 8 sesuai; perbaiki 4 kelemahan lalu tulis 07-tasks”

## Context

`docs/04-stack/tanstack-query.md` says to create the `QueryClient` inside `getRouter()` and connect it with `setupRouterSsrQueryIntegration({ router, queryClient })` from `@tanstack/react-router-ssr-query`. That integration supplies the provider and handles dehydration, hydration, and streaming. `docs/02-architecture/data-fetching.md` records it as observed. The package is not in `docs/04-stack/versions.md`, and `AGENTS.md` allows no new dependency without an ADR.

npm, read 2026-11-08: `latest` is 1.167.3. Its peers are `@tanstack/react-router >=1.170.33`, `@tanstack/react-query >=5.102.0`, `@tanstack/query-core >=5.102.0`, and `react` and `react-dom >=18`. The app declares `@tanstack/react-router ^1.170.46`, and `versions.md` lists `@tanstack/react-query ^5.104.5`.

## Decision

Add `@tanstack/react-router-ssr-query` as a runtime dependency with an exact pin, through skill `change-dependency`, in the task that wires Query into the router (`specs/auth/07-tasks.md`, T1). Add a row to `versions.md` saying it moves together with `@tanstack/react-router`.

## Consequences

- Loaders can prefetch with `context.queryClient` and SSR hydrates the cache, as `tanstack-query.md` assumes.
- One more TanStack package to keep aligned on upgrades. `versions.md` says so.

## Not verified

- Whether the package runs install scripts (`versions.md` rule 6).
- Its client bundle size (decision X).
- Whether it works with Start 1.169.4 in this repo. T1 proves it with the `/status` page, which reads `currentUserQueryOptions`.

## Alternatives considered

- **Wire `QueryClientProvider` and dehydration by hand.** It re-implements what the official integration does, against `tanstack-query.md`.
- **No Query.** It is against `AGENTS.md`: server state lives in TanStack Query.

## Verification

npm registry: `@tanstack/react-router-ssr-query` dist-tags and peerDependencies, 2026-11-08. `docs/04-stack/tanstack-query.md`, `docs/02-architecture/data-fetching.md`.
