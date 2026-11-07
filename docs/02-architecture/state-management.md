# State Management

**When to read:** before storing any value that outlives one render, and before adding a store or a context.

Pick the first row that fits. Most state belongs to the first three.

| State | Lives in | Example |
|---|---|---|
| Server data | **TanStack Query**, declared in `features/<f>/queries.ts` | Invoice list, current user profile |
| Shareable UI state | **URL search params**, validated in the route (`docs/04-stack/tanstack-router.md`, rule 4) | Filters, sorting, page, selected tab |
| Form values | **TanStack Form** with the feature's Zod schema (`docs/04-stack/tanstack-form.md`) | Draft of an invoice |
| Local UI state | `useState` or `useReducer` in the component | Dialog open, hover, accordion |
| UI state shared within a subtree | Lift it up, then React context in the feature's `components/` | Wizard step across its panels |
| Client state a whole feature shares, with complex updates | **Decide first.** `useReducer` plus context is the default; a store library needs an ADR | Offline-style editor state |

## Rules

1. **Never copy server data** into `useState`, context, or a store. Read it from Query, and derive what you need during render. Copied data goes stale silently.
2. **Do not store what you can derive.** A total computed from the items is a calculation, not state.
3. **No store library is installed, and adding one needs an ADR** (`AGENTS.md`). `@tanstack/react-store` is in `package.json` because Table v9 depends on it (`docs/04-stack/versions.md`); it is not adopted as the app's general store. Using it that way is the same ADR.
4. **State does not cross a feature boundary** by a shared store. Use the public API or an event (`cross-feature-communication.md`).
5. **Nothing sensitive in the URL or in browser storage:** tokens, personal data, anything the server has not authorized. Persisting the Query cache needs an ADR (`tanstack-query.md`, rule 11).
6. **SSR:** `QueryClient` is created per request inside `getRouter()`. A module-level mutable variable in client-reachable code is shared across requests on the server, so never put user data in one.

How server data gets into Query (loader, streaming, polling): `data-fetching.md`.

## Caching: which layer

| Need | Use |
|---|---|
| The same data in several components, or in a loader and a component | One `queryOptions` factory; Query deduplicates and shares it |
| Fresh data after a mutation | `invalidateFeature` with the feature's scope, only when `data.ok` (`tanstack-query.md`, rule 12) |
| An instant UI response to an action that rarely fails | Optimistic update (`tanstack-query.md`) |
| A response cached by a browser or CDN | `Cache-Control`; never `public` for identity-dependent data (`security.md`, rule 3) |
| An expensive server-side computation | Not decided: no server cache is installed. Ask before adding one |

Checked by: review, plus `@tanstack/eslint-plugin-query` once it is wired (`docs/04-stack/versions.md`, action item 3).
