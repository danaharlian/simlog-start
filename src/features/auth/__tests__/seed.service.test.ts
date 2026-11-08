import { describe, expect, it } from "vitest"
import { accountStatuses } from "@/features/auth/schemas"
import { auth } from "@/features/auth/server/auth.repository"
import {
  sampleIdentity,
  seedAccounts,
} from "@/features/auth/server/seed.service"
import { accountsWithEmail, seedInput } from "./seed.helpers"

type Input = ReturnType<typeof seedInput>

async function expectOneAccountPerEmail(input: Input) {
  const superadmins = await accountsWithEmail(input.env.SEED_SUPERADMIN_EMAIL)
  expect(superadmins).toEqual([
    expect.objectContaining({
      username: input.env.SEED_SUPERADMIN_USERNAME,
      status: "active",
      role: "superadmin",
    }),
  ])
  for (const status of accountStatuses) {
    const samples = await accountsWithEmail(
      sampleIdentity(status, input.sampleTag).email
    )
    expect(samples).toHaveLength(1)
    expect(samples[0]).toMatchObject({ status, role: "user" })
  }
  return superadmins[0]?.id
}

describe("seedAccounts (AC22, R24, R25, US8)", () => {
  it("seed dua kali: satu superadmin aktif dari konfigurasi, satu akun per status, tanpa duplikat; superadmin bisa login", async () => {
    const input = seedInput()
    const first = await seedAccounts(input)
    const second = await seedAccounts(input)
    for (const status of accountStatuses) {
      expect(first).toMatchObject({
        ok: true,
        data: { samples: { [status]: { outcome: "created", status } } },
      })
      expect(second).toMatchObject({
        ok: true,
        data: { samples: { [status]: { outcome: "existing", status } } },
      })
    }
    expect(first).toMatchObject({ data: { superadmin: "created" } })
    expect(second).toMatchObject({ data: { superadmin: "existing" } })

    const superadminId = await expectOneAccountPerEmail(input)
    const signIn = await auth.api.signInEmail({
      body: {
        email: input.env.SEED_SUPERADMIN_EMAIL,
        password: input.env.SEED_SUPERADMIN_PASSWORD,
      },
    })
    expect(signIn.user.id).toBe(superadminId)
    const sampleSignIn = await auth.api.signInEmail({
      body: {
        email: sampleIdentity("active", input.sampleTag).email,
        password: input.env.SEED_SAMPLE_PASSWORD,
      },
    })
    expect(sampleSignIn.user.email).toBe(
      sampleIdentity("active", input.sampleTag).email
    )
  })

  it("dua seed bersamaan tidak membuat akun ganda (spec section 4)", async () => {
    const input = seedInput()
    // Race: both runs sign up the same emails; the unique index lets one create each account.
    const results = await Promise.all([
      seedAccounts(input),
      seedAccounts(input),
    ])
    expect(results.some((result) => result.ok)).toBe(true)
    for (const result of results)
      if (!result.ok) expect(result.error.reason).toBe("superadmin_not_active")
    await expectOneAccountPerEmail(input)
  })
})
