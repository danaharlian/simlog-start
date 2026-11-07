import { createMiddleware } from "@tanstack/react-start"
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server"
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
