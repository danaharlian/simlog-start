import { describe, expect, it } from "vitest"
import { seedAccounts } from "@/features/auth/server/seed.service"
import { accountsWithEmail, seedEnv } from "./seed.helpers"

describe("seedAccounts guard (AC23, R25, EC20)", () => {
  it("seed menolak NODE_ENV=production sebelum menulis", async () => {
    const env = seedEnv({ NODE_ENV: "production" })
    expect(await seedAccounts(env)).toMatchObject({
      ok: false,
      error: { reason: "production" },
    })
    expect(await accountsWithEmail(env.SEED_SUPERADMIN_EMAIL)).toHaveLength(0)
  })

  it("seed menolak SEED_ALLOW bukan true sebelum menulis", async () => {
    for (const allow of [undefined, "", "false", "TRUE", "yes"]) {
      const env = seedEnv({ SEED_ALLOW: allow })
      expect(await seedAccounts(env)).toMatchObject({
        ok: false,
        error: { reason: "not_allowed" },
      })
      expect(await accountsWithEmail(env.SEED_SUPERADMIN_EMAIL)).toHaveLength(0)
    }
  })

  it("konfigurasi superadmin yang tidak lengkap ditolak sebelum menulis", async () => {
    const env = seedEnv({ SEED_SUPERADMIN_PASSWORD: undefined })
    expect(await seedAccounts(env)).toMatchObject({
      ok: false,
      error: { reason: "invalid_config" },
    })
    expect(await accountsWithEmail(env.SEED_SUPERADMIN_EMAIL)).toHaveLength(0)
  })
})
