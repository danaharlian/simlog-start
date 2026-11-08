import { afterEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/features/auth/server/auth.repository"
import { seedAccounts } from "@/features/auth/server/seed.service"
import { accountsWithEmail, seedInput } from "./seed.helpers"

// "Before writing anything" (AC23): no sign-up call at all, not only no superadmin row.
function watchSignUps() {
  return vi.spyOn(auth.api, "signUpEmail")
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("seedAccounts guard (AC23, R25, EC20)", () => {
  it("seed menolak NODE_ENV=production sebelum menulis", async () => {
    const signUps = watchSignUps()
    const input = seedInput({ env: { NODE_ENV: "production" } })
    expect(await seedAccounts(input)).toMatchObject({
      ok: false,
      error: { reason: "production" },
    })
    expect(signUps).not.toHaveBeenCalled()
    expect(
      await accountsWithEmail(input.env.SEED_SUPERADMIN_EMAIL)
    ).toHaveLength(0)
  })

  it("seed menolak DATABASE_URL dari shell sebelum menulis", async () => {
    const signUps = watchSignUps()
    const input = seedInput({
      shell: { DATABASE_URL: "postgresql://prod.example/app" },
    })
    expect(await seedAccounts(input)).toMatchObject({
      ok: false,
      error: { reason: "shell_database_url" },
    })
    expect(signUps).not.toHaveBeenCalled()
  })

  it("seed menolak SEED_ALLOW bukan true di shell, termasuk SEED_ALLOW yang hanya ada di .env", async () => {
    const signUps = watchSignUps()
    for (const allow of [undefined, "", "false", "TRUE", "yes"]) {
      const input = seedInput({
        shell: { SEED_ALLOW: allow },
        env: { SEED_ALLOW: "true" },
      })
      expect(await seedAccounts(input)).toMatchObject({
        ok: false,
        error: { reason: "not_allowed" },
      })
    }
    expect(signUps).not.toHaveBeenCalled()
  })

  it("konfigurasi tidak sah ditolak sebelum menulis, tanpa nilai password di pesan", async () => {
    const signUps = watchSignUps()
    const input = seedInput({
      env: { SEED_SUPERADMIN_PASSWORD: "abc", SEED_SAMPLE_PASSWORD: undefined },
    })
    const result = await seedAccounts(input)
    expect(result).toMatchObject({
      ok: false,
      error: { reason: "invalid_config" },
    })
    expect(result.ok ? "" : result.error.detail).not.toContain("abc")
    expect(result.ok ? "" : result.error.detail).toContain(
      "SEED_SAMPLE_PASSWORD"
    )
    expect(signUps).not.toHaveBeenCalled()
  })
})
