import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateFeature } from "@/shared/lib/query-scope"
import { authScope } from "@/features/auth/queries"
import type { ChangeAccountStatusInput } from "@/features/auth/schemas"
import { changeAccountStatus } from "@/features/auth/server/accounts.functions"

// Success or failure, the list and the current user may be out of date (status changed by
// someone else, account gone, actor demoted), so the whole auth scope reloads (spec sections 7, 8).
export function useChangeAccountStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangeAccountStatusInput) =>
      changeAccountStatus({ data: input }),
    onSettled: () => invalidateFeature(queryClient, authScope),
  })
}
