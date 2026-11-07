import { useMutation, useQueryClient } from "@tanstack/react-query"
import { signInMethodFor } from "@/features/auth/components/sign-in-method"
import { authClient, toAuthCallResult } from "@/features/auth/hooks/auth-client"
import { authKeys } from "@/features/auth/queries"
import type { LoginInput } from "@/features/auth/schemas"

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ identifier, password }: LoginInput) => {
      const method = signInMethodFor(identifier)
      const { error } =
        method.kind === "email"
          ? await authClient.signIn.email({ email: method.email, password })
          : await authClient.signIn.username({
              username: method.username,
              password,
            })
      return toAuthCallResult(error)
    },
    onSuccess: async (result) => {
      if (result.ok)
        await queryClient.invalidateQueries({
          queryKey: authKeys.currentUser(),
        })
    },
  })
}
