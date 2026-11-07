import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "./routeTree.gen"

// Team default staleTime (ADR 0007, decision K); queries override it per data volatility.
const DEFAULT_STALE_TIME_MS = 30_000

export function getRouter() {
  // One QueryClient per router, so SSR requests never share a cache (tanstack-query.md).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: DEFAULT_STALE_TIME_MS } },
  })

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
