import { describe, expect, it } from "vitest"
import { accountStatuses } from "@/features/auth/schemas"
import { auth } from "@/features/auth/server/auth.repository"
import {
  SEED_SAMPLE_EMAILS,
  seedAccounts,
} from "@/features/auth/server/seed.service"
import { accountsWithEmail, seedEnv } from "./seed.helpers"

describe("seedAccounts (AC22, R24, R25, US8)", () => {
  it("seed dua kali: satu superadmin aktif dari konfigurasi, satu akun per status, tanpa duplikat; superadmin bisa login", async () => {
    const env = seedEnv()
    const first = await seedAccounts(env)
    const second = await seedAccounts(env)
    expect(first).toMatchObject({ ok: true, data: { superadmin: "created" } })
    expect(second).toMatchObject({
      ok: true,
      data: {
        superadmin: "existing",
        samples: {
          pending: "existing",
          active: "existing",
          rejected: "existing",
          inactive: "existing",
        },
      },
    })

    const superadmins = await accountsWithEmail(env.SEED_SUPERADMIN_EMAIL)
    expect(superadmins).toEqual([
      expect.objectContaining({
        username: env.SEED_SUPERADMIN_USERNAME,
        status: "active",
        role: "superadmin",
      }),
    ])

    for (const status of accountStatuses) {
      const samples = await accountsWithEmail(SEED_SAMPLE_EMAILS[status])
      expect(samples).toHaveLength(1)
      expect(samples[0]).toMatchObject({ status, role: "user" })
    }

    const signIn = await auth.api.signInEmail({
      body: {
        email: env.SEED_SUPERADMIN_EMAIL,
        password: env.SEED_SUPERADMIN_PASSWORD,
      },
    })
    expect(signIn.user.id).toBe(superadmins[0]?.id)
  })
})
