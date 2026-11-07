import { queryOptions } from "@tanstack/react-query"
import { getCurrentUser } from "@/features/auth/server/accounts.functions"

export const authScope = "auth"

export const authKeys = {
  all: () => [authScope] as const,
  currentUser: () => [authScope, "current-user"] as const,
}

// staleTime 0: a status change must show on the next navigation (R21).
export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.currentUser(),
    queryFn: () => getCurrentUser(),
    staleTime: 0,
  })
