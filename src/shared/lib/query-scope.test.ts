import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { invalidateFeature } from "@/shared/lib/query-scope"

// tanstack-query.md rule 12: an own key, a dependent query, and an unrelated one.
function seededClient(): QueryClient {
  const queryClient = new QueryClient()
  queryClient
    .getQueryCache()
    .build(queryClient, { queryKey: ["auth", "accounts"] })
    .setData("own")
  queryClient
    .getQueryCache()
    .build(queryClient, {
      queryKey: ["reports", "summary"],
      meta: { dependsOn: ["auth"] },
    })
    .setData("dependent")
  queryClient
    .getQueryCache()
    .build(queryClient, { queryKey: ["reports", "other"] })
    .setData("unrelated")
  return queryClient
}

function isInvalidated(
  queryClient: QueryClient,
  queryKey: ReadonlyArray<string>
) {
  return queryClient.getQueryState(queryKey)?.isInvalidated
}

describe("invalidateFeature", () => {
  it("menandai query milik fitur dan query yang bergantung padanya, tidak yang lain", async () => {
    const queryClient = seededClient()
    await invalidateFeature(queryClient, "auth")
    expect(isInvalidated(queryClient, ["auth", "accounts"])).toBe(true)
    expect(isInvalidated(queryClient, ["reports", "summary"])).toBe(true)
    expect(isInvalidated(queryClient, ["reports", "other"])).toBe(false)
  })
})
