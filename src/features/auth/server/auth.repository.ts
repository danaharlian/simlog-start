import { betterAuth } from "better-auth"
import type { BetterAuthOptions } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  APIError,
  createAuthMiddleware,
  formCsrfMiddleware,
} from "better-auth/api"
import { username } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { z } from "zod"
import { serverEnv } from "@/shared/config/env.server"
import { db } from "@/shared/db/client"
import { logger } from "@/shared/server/logger.server"
import * as schema from "@/features/auth/db/schema"
import { AUTH_ERROR } from "@/features/auth/errors"

const SIGN_UP_EMAIL_PATH = "/sign-up/email"
const SIGN_IN_USERNAME_PATH = "/sign-in/username"

// The username plugin treats `username` as optional on sign-up; R1 makes it required (ADR 0039).
const signUpUsernameSchema = z.object({ username: z.string().trim().min(1) })

const beforeAuthEndpoints = createAuthMiddleware(async (ctx) => {
  // better-auth 1.7.18 runs formCsrfMiddleware on /sign-in/email but not on the username
  // plugin's /sign-in/username; run the same middleware here (ADR 0046).
  if (ctx.path === SIGN_IN_USERNAME_PATH) {
    await formCsrfMiddleware(ctx)
    return
  }
  if (ctx.path !== SIGN_UP_EMAIL_PATH) return
  if (signUpUsernameSchema.safeParse(ctx.body).success) return
  throw new APIError("BAD_REQUEST", {
    code: AUTH_ERROR.USERNAME_REQUIRED,
    message: "Username is required",
  })
})

export const authOptions = {
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: {
    database: { generateId: "uuid" },
    // Explicit false, never true: keeps the origin check on under NODE_ENV=test too, so tests see
    // production behavior (ADR 0046, better-auth.md rule 9).
    disableOriginCheck: false,
  },
  // Only level and message reach the log: Better Auth passes the raw driver error as extra arguments,
  // and its `detail` holds the email on a unique violation (logging.md, security.md rule 13).
  logger: {
    log: (level, message) => {
      logger[level]({ source: "better-auth" }, message)
    },
  },
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
  hooks: { before: beforeAuthEndpoints },
  disabledPaths: ["/is-username-available"],
  // tanstackStartCookies must stay last (docs/04-stack/better-auth.md).
  plugins: [
    username({ immutableUsername: true, displayUsername: false }),
    tanstackStartCookies(),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth(authOptions)
