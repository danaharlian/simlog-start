import { existsSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

// A variable already set in the shell wins over .env. CI and the host have no .env.
if (existsSync(".env")) process.loadEnvFile(".env")

const target = process.env.DB_TARGET
if (target !== undefined && target !== "test")
  throw new Error(`DB_TARGET must be unset or "test", got "${target}"`)
const url =
  target === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
if (!url)
  throw new Error(
    `drizzle.config.ts: no database URL (DB_TARGET=${target ?? "unset"})`
  )
if (target === "test" && url === process.env.DATABASE_URL)
  throw new Error("TEST_DATABASE_URL must not be the DATABASE_URL database")

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/features/*/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
})
