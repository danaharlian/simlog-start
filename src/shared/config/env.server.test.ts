import { describe, expect, inject, it } from "vitest"
import { serverEnv } from "@/shared/config/env.server"

describe("serverEnv under Vitest (ADR 0044)", () => {
  it("serverEnv.DATABASE_URL adalah TEST_DATABASE_URL", () => {
    // vitest.config.ts refuses a TEST_DATABASE_URL equal to the dev URL, so equality here
    // proves test.env reached serverEnv before it was parsed.
    expect(serverEnv.DATABASE_URL).toBe(inject("testDatabaseUrl"))
  })
})
