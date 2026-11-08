import { queryOptions } from "@tanstack/react-query"
import {
  getCurrentUser,
  listAccounts,
} from "@/features/auth/server/accounts.functions"
import type { ListAccountsInput } from "@/features/auth/schemas"

export const authScope = "auth"

export const authKeys = {
  all: () => [authScope] as const,
  currentUser: () => [authScope, "current-user"] as const,
  accounts: (input: ListAccountsInput) =>
    [authScope, "accounts", input] as const,
}

// staleTime 0: a status change must show on the next navigation (R21).
export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.currentUser(),
    queryFn: () => getCurrentUser(),
    staleTime: 0,
  })

// Default staleTime (30 s, ADR 0007 K); mutations invalidate the auth scope (T5, T6).
export const accountsQueryOptions = (input: ListAccountsInput) =>
  queryOptions({
    queryKey: authKeys.accounts(input),
    queryFn: () => listAccounts({ data: input }),
  })
