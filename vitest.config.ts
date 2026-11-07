import { existsSync } from "node:fs"
import { defineConfig } from "vitest/config"

// ADR 0044: tests reach the test database through serverEnv.DATABASE_URL, set here.
if (existsSync(".env")) process.loadEnvFile(".env")

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl)
  throw new Error("vitest.config.ts: TEST_DATABASE_URL is not set")
if (testDatabaseUrl === process.env.DATABASE_URL)
  throw new Error(
    "vitest.config.ts: TEST_DATABASE_URL must not be the DATABASE_URL database"
  )

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    env: { DATABASE_URL: testDatabaseUrl },
    // Lets a test check that serverEnv saw the override without reading process.env.
    provide: { testDatabaseUrl },
  },
})

declare module "vitest" {
  interface ProvidedContext {
    testDatabaseUrl: string
  }
}
