// shared/lib/query-scope.ts (ADR 0035; docs/04-stack/tanstack-query.md, rule 12)
import type { QueryClient } from "@tanstack/react-query"

interface AppQueryMeta extends Record<string, unknown> {
  dependsOn?: ReadonlyArray<string>
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: AppQueryMeta
  }
}

export function invalidateFeature(
  queryClient: QueryClient,
  feature: string
): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === feature ||
      (query.meta?.dependsOn?.includes(feature) ?? false),
  })
}
