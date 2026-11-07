import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { authClient, toAuthCallResult } from "@/features/auth/hooks/auth-client"

// After sign-out every cached query belonged to the previous user, so the whole cache goes (spec section 7).
export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async () =>
      toAuthCallResult((await authClient.signOut()).error),
    onSuccess: async (result) => {
      if (!result.ok) return
      queryClient.clear()
      await navigate({ to: "/login" })
    },
  })
}
