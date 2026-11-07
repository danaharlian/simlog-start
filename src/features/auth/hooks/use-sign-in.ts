import { useMutation, useQueryClient } from "@tanstack/react-query"
import { signInMethodFor } from "@/features/auth/components/sign-in-method"
import { authClient, runAuthCall } from "@/features/auth/hooks/auth-client"
import { authKeys } from "@/features/auth/queries"
import type { LoginInput } from "@/features/auth/schemas"

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ identifier, password }: LoginInput) => {
      const method = signInMethodFor(identifier)
      return runAuthCall(() =>
        method.kind === "email"
          ? authClient.signIn.email({ email: method.email, password })
          : authClient.signIn.username({ username: method.username, password })
      )
    },
    onSuccess: async (result) => {
      if (result.ok)
        await queryClient.invalidateQueries({
          queryKey: authKeys.currentUser(),
        })
    },
  })
}
