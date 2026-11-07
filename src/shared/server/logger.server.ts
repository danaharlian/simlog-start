import pino from "pino"
import { serverEnv } from "@/shared/config/env.server"

export const logger = pino({
  level: serverEnv.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "email",
      "*.password",
      "*.token",
      "*.authorization",
      "*.cookie",
      "*.email",
    ],
    censor: "[REDACTED]",
  },
})
