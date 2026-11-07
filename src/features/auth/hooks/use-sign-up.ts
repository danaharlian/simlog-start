import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient, runAuthCall } from "@/features/auth/hooks/auth-client"
import { authKeys } from "@/features/auth/queries"
import type { RegisterInput } from "@/features/auth/schemas"

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, username, email, password }: RegisterInput) =>
      runAuthCall(() =>
        authClient.signUp.email({ name, username, email, password })
      ),
    onSuccess: async (result) => {
      if (result.ok)
        await queryClient.invalidateQueries({
          queryKey: authKeys.currentUser(),
        })
    },
  })
}
