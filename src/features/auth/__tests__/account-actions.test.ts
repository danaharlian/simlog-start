import { describe, expect, it } from "vitest"
import {
  actionKey,
  choicesFor,
} from "@/features/auth/components/account-actions"
import type { AccountRow } from "@/features/auth/schemas"

function row(overrides: Pick<AccountRow, "status" | "role">): AccountRow {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Sari",
    username: "sari",
    email: "sari@contoh.id",
    createdAt: "2026-11-08T03:00:00.000Z",
    ...overrides,
  }
}

const keysFor = (account: AccountRow, isSelf: boolean) =>
  choicesFor(account, isSelf).map(actionKey)

describe("choicesFor (spec section 8 step 2, AC18, EC15)", () => {
  it("baris superadmin yang sedang login tidak menawarkan Nonaktifkan dan Cabut superadmin", () => {
    expect(
      keysFor(row({ status: "active", role: "superadmin" }), true)
    ).toEqual([])
  })

  it("baris aktif menawarkan Nonaktifkan dan satu aksi role sesuai role saat ini", () => {
    expect(keysFor(row({ status: "active", role: "user" }), false)).toEqual([
      "status:inactive",
      "role:superadmin",
    ])
    expect(
      keysFor(row({ status: "active", role: "superadmin" }), false)
    ).toEqual(["status:inactive", "role:user"])
  })

  it("baris yang tidak aktif tidak menawarkan aksi role", () => {
    expect(keysFor(row({ status: "pending", role: "user" }), false)).toEqual([
      "status:active",
      "status:rejected",
    ])
    expect(
      keysFor(row({ status: "inactive", role: "superadmin" }), false)
    ).toEqual(["status:active"])
    expect(keysFor(row({ status: "rejected", role: "user" }), false)).toEqual([
      "status:active",
    ])
  })
})
