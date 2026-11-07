import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient, toAuthCallResult } from "@/features/auth/hooks/auth-client"
import { authKeys } from "@/features/auth/queries"
import type { RegisterInput } from "@/features/auth/schemas"

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, username, email, password }: RegisterInput) => {
      const { error } = await authClient.signUp.email({
        name,
        username,
        email,
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
