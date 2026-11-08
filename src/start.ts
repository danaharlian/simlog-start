import { createCsrfMiddleware, createStart } from "@tanstack/react-start"
import { securityHeadersMiddleware } from "@/shared/server/security-headers"

// Defining this file turns off Start's automatic CSRF check for server functions, so it is
// added here explicitly (security.md rule 2; tanstack-start.md, "CSRF"). The filter keeps it off
// server routes such as /api/auth, which Better Auth protects itself (ADR 0046).
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
})

export const startInstance = createStart(() => ({
  // Headers first, so even a CSRF refusal carries them (ADR 0047).
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware],
}))
