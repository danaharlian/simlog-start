import { createFileRoute } from "@tanstack/react-router"
import { authHandler } from "@/features/auth/index.server"

// Only forwards to Better Auth, which checks origin and Fetch Metadata itself (better-auth.md, rule 9).
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => authHandler(request),
      POST: ({ request }) => authHandler(request),
    },
  },
})
