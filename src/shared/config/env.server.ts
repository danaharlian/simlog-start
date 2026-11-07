import { z } from "zod"

const BETTER_AUTH_SECRET_MIN_LENGTH = 32

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(BETTER_AUTH_SECRET_MIN_LENGTH),
  BETTER_AUTH_URL: z.url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
})

export const serverEnv = serverEnvSchema.parse(process.env)
