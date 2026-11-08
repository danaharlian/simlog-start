import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidateFeature } from "@/shared/lib/query-scope"
import { authScope } from "@/features/auth/queries"
import type { ChangeAccountRoleInput } from "@/features/auth/schemas"
import { changeAccountRole } from "@/features/auth/server/accounts.functions"

// Same cache rule as status changes: every result reloads the auth scope (spec sections 7, 8;
// T5 PR gate decision 1). A superadmin revoked meanwhile also loses the menu item on reload.
export function useChangeAccountRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangeAccountRoleInput) =>
      changeAccountRole({ data: input }),
    onSettled: () => invalidateFeature(queryClient, authScope),
  })
}
