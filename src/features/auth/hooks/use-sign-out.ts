import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient, runAuthCall } from "@/features/auth/hooks/auth-client"

type UseSignOutOptions = { readonly onSignedOut: () => Promise<void> | void }

// After sign-out every cached query belonged to the previous user, so the whole cache goes (spec section 7).
// The route decides where to go next (components.md: callbacks go up).
export function useSignOut({ onSignedOut }: UseSignOutOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => runAuthCall(() => authClient.signOut()),
    onSuccess: async (result) => {
      if (!result.ok) return
      queryClient.clear()
      await onSignedOut()
    },
  })
}
