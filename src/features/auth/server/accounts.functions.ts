import { createServerFn } from "@tanstack/react-start"
import { withErrorBoundary } from "@/shared/server/with-error-boundary"
import { withSession } from "@/features/auth/server/session.functions"
import { getCurrentUserDto } from "@/features/auth/server/accounts.service"

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([withSession])
  .handler(({ context }) =>
    withErrorBoundary("auth.getCurrentUser", async () =>
      context.userId === null ? null : getCurrentUserDto(context.userId)
    )
  )
