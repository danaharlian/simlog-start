---
name: add-route
description: Add a thin page route that composes an existing feature (file location, search params, loader, head, pending and error UI, entry point). Use when asked to add a page, screen, or view to a feature that already exists. Not for webhooks or public endpoints (add-server-route), and a new feature starts with new-feature.
---

# Add a page route

Read `docs/04-stack/tanstack-router.md` (file conventions, the thin route sample, rules) and `docs/02-architecture/data-fetching.md`. Run `verify-library-docs` for any Router API not in that sample.

## Steps

1. **Find the home.** Take the URL, title, search params, and loader from the feature spec (section 8), or the issue. Check the routes that exist first. A protected page goes under the pathless layout that holds the auth guard. Use the file conventions table for segments and groups.
2. **Put logic in the feature first.** The page's component, `queryOptions`, and server function live in `src/features/<f>/`, exported from `index.ts` (`add-server-function` for new data). A route imports only `index.ts`, never `index.server.ts` or internals.
3. **Write the route file,** about 20 lines: `head` for the title, `validateSearch` when it has search params (each field with `.catch()`), a `loader` that calls the feature's query options in the mode `data-fetching.md` picks, and a component that renders the feature component. No business logic, no direct database call or `fetch`. An offset-paginated list redirects a page past the end to the last page (`data-fetching.md`, "Lists with search and pagination").
4. **Choose the states.** Say which `pendingComponent`, `errorComponent`, and `notFoundComponent` apply; major sections set their own (`tanstack-router.md`, rule 8). The feature component handles empty and `ok: false` (`docs/03-standards/components.md`, rule 7).
5. **Guard is not protection.** `beforeLoad` redirects are UX. Every server function the page calls checks authorization itself (`docs/03-standards/security.md`).
6. **Entry point.** Links use typed `Link` (`tanstack-router.md`, rule 3). Add the link only in the task the plan names, usually the last one (`07-tasks.md`, "Entry point visibility").
7. **Do not edit `routeTree.gen.ts`.** The plugin regenerates it; commit the result.
8. **Run the gates.** Open the page in a built or running app when you can, and report what you saw, or "not run". Status 200 proves little: a strict CSP gave a blank page with 200, and a bad env a page with 200 whose server function answered 500 (ADR 0015).

## Output

The route file and URL, the feature exports it uses, the states chosen, gate results, and `Docs consulted:`.
