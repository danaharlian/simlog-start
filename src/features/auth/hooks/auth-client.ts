import { usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { z } from "zod"

// Same origin as the app, so no baseURL (better-auth.md, rule 2; ADR 0039 for the plugin options).
export const authClient = createAuthClient({
  plugins: [usernameClient({ displayUsername: false })],
})

export type AuthCallResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: string | undefined
      readonly status: number
    }

const authCallErrorSchema = z.object({
  code: z.string().optional(),
  status: z.number(),
})

// The client resolves with { data, error } and never throws for an HTTP error.
export function toAuthCallResult(error: unknown): AuthCallResult {
  if (error === null) return { ok: true }
  const parsed = authCallErrorSchema.safeParse(error)
  return parsed.success
    ? { ok: false, code: parsed.data.code, status: parsed.data.status }
    : { ok: false, code: undefined, status: 0 }
}
