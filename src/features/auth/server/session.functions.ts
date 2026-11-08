import { createMiddleware } from "@tanstack/react-start"
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server"
import { authorizeActiveSuperadmin } from "@/features/auth/server/accounts.service"
import { readSessionUserId } from "@/features/auth/server/session.service"

// Reads the session; userId may be null. Functions that need a signed-in user check it themselves (ADR 0041).
// The response depends on who is signed in, so it is never stored by a shared cache (security.md, rule 3).
export const withSession = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    setResponseHeader("Cache-Control", "private, no-store")
    setResponseHeader("Vary", "Cookie")
    return next({
      context: { userId: await readSessionUserId(getRequestHeaders()) },
    })
  }
)

// Authorizes every superadmin function (R22, NFR3). A middleware cannot return a Result to the client,
// so it hands the decision to the handler in `context.superadmin` (07-tasks.md change log, T4).
export const requireActiveSuperadmin = createMiddleware({ type: "function" })
  .middleware([withSession])
  .server(async ({ next, context }) =>
    next({
      context: { superadmin: await authorizeActiveSuperadmin(context.userId) },
    })
  )
