import { describe, expect, it } from "vitest"
import { resolveAccessRedirect } from "@/features/auth/components/access-redirect"
import type { AccountStatus, CurrentUser } from "@/features/auth/schemas"

function user(status: AccountStatus): CurrentUser {
  return {
    id: "5f0c2c3e-6f7a-4c1b-9a51-0a1b2c3d4e5f",
    name: "Budi",
    username: "budi",
    status,
    role: "user",
  }
}

const notActive: ReadonlyArray<AccountStatus> = [
  "pending",
  "rejected",
  "inactive",
]

describe("resolveAccessRedirect (spec section 1, AC8 to AC11)", () => {
  it("guest: tanpa sesi tampil; dengan sesi status apa pun ke / (AC9)", () => {
    expect(resolveAccessRedirect("guest", null)).toBeNull()
    expect(resolveAccessRedirect("guest", user("active"))).toBe("/")
    for (const status of notActive)
      expect(resolveAccessRedirect("guest", user(status))).toBe("/")
  })

  it("status: tanpa sesi ke /login (AC8); belum aktif tampil; aktif ke / (AC11)", () => {
    expect(resolveAccessRedirect("status", null)).toBe("/login")
    for (const status of notActive)
      expect(resolveAccessRedirect("status", user(status))).toBeNull()
    expect(resolveAccessRedirect("status", user("active"))).toBe("/")
  })

  it("app: tanpa sesi ke /login (AC8); belum aktif ke /status (AC10); aktif tampil", () => {
    expect(resolveAccessRedirect("app", null)).toBe("/login")
    for (const status of notActive)
      expect(resolveAccessRedirect("app", user(status))).toBe("/status")
    expect(resolveAccessRedirect("app", user("active"))).toBeNull()
  })
})
