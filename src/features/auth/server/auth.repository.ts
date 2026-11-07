import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { username } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { z } from "zod"
import { serverEnv } from "@/shared/config/env.server"
import { db } from "@/shared/db/client"
import * as schema from "@/features/auth/db/schema"
import { AUTH_ERROR } from "@/features/auth/errors"

const SIGN_UP_EMAIL_PATH = "/sign-up/email"

// The username plugin treats `username` as optional on sign-up; R1 makes it required (ADR 0039).
const signUpUsernameSchema = z.object({ username: z.string().trim().min(1) })

const requireUsernameOnSignUp = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_UP_EMAIL_PATH) return
  if (signUpUsernameSchema.safeParse(ctx.body).success) return
  throw new APIError("BAD_REQUEST", {
    code: AUTH_ERROR.USERNAME_REQUIRED,
    message: "Username is required",
  })
})

export const auth = betterAuth({
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: { enabled: true },
  user: {
    // input: false: sign-up cannot set these (ADR 0038, AC4).
    additionalFields: {
      status: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "pending",
      },
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "user",
      },
      statusChangedAt: { type: "date", required: false, input: false },
    },
  },
  // Explicit, not the default: a cached session would hide a status change until it expires (R21, D10).
  session: { cookieCache: { enabled: false } },
  hooks: { before: requireUsernameOnSignUp },
  disabledPaths: ["/is-username-available"],
  // tanstackStartCookies must stay last (docs/04-stack/better-auth.md).
  plugins: [
    username({ immutableUsername: true, displayUsername: false }),
    tanstackStartCookies(),
  ],
})
