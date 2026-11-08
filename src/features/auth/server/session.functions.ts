import { createMiddleware } from "@tanstack/react-start"
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server"
import { logger } from "@/shared/server/logger.server"
import { withErrorBoundary } from "@/shared/server/with-error-boundary"
import { authorizeActiveSuperadmin } from "@/features/auth/server/accounts.service"
import { readSessionUserId } from "@/features/auth/server/session.service"

// Reads the session; userId may be null. Functions that need a signed-in user check it themselves (ADR 0041).
// The response depends on who is signed in, so it is never stored by a shared cache (security.md, rule 3).
// Database reads run inside the error boundary, so a driver error is logged once and never reaches the client.
export const withSession = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "private, no-store")
    setResponseHeader("Vary", "Cookie")
    const userId = await withErrorBoundary("auth.withSession", () =>
      readSessionUserId(getRequestHeaders())
    )
    return next({ context: { userId } })
  }
)

// Authorizes every superadmin function (R22, NFR3). A middleware cannot return a Result to the client,
// so it hands the decision to the handler in `context.superadmin`; the services require the
// ActiveSuperadmin it carries (07-tasks.md change log, T4).
export const requireActiveSuperadmin = createMiddleware({ type: "function" })
  .middleware([withSession])
  .server(async ({ next, context }) => {
    const superadmin = await withErrorBoundary(
      "auth.requireActiveSuperadmin",
      () => authorizeActiveSuperadmin(context.userId)
    )
    if (!superadmin.ok) {
      // Audit: a refused superadmin call, ids and code only (security.md rule 13, spec section 10).
      logger.warn(
        {
          operation: "auth.requireActiveSuperadmin",
          userId: context.userId,
          code: superadmin.error.code,
        },
        "refused"
      )
    }
    return next({ context: { superadmin } })
  })
