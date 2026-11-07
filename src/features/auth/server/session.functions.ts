import { createMiddleware } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { readSessionUserId } from "@/features/auth/server/session.service"

// Reads the session; userId may be null. Functions that need a signed-in user check it themselves (ADR 0041).
export const withSession = createMiddleware({ type: "function" }).server(
  async ({ next }) =>
    next({ context: { userId: await readSessionUserId(getRequestHeaders()) } })
)
