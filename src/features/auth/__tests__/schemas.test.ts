import { describe, expect, it } from "vitest"
import { loginSchema, registerSchema } from "@/features/auth/schemas"

const valid = {
  name: "Budi Santoso",
  username: "Budi.Santoso",
  email: "budi@contoh.id",
  password: "rahasia-1",
  confirmPassword: "rahasia-1",
}

function issuePaths(input: Record<string, string>): ReadonlyArray<string> {
  const result = registerSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("registerSchema (AC2)", () => {
  it("menerima input yang sah", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("registerSchema menolak username 2 dan 31 karakter, karakter lain, password 7 karakter, konfirmasi berbeda", () => {
    expect(issuePaths({ ...valid, username: "ab" })).toContain("username")
    expect(issuePaths({ ...valid, username: "a".repeat(31) })).toContain(
      "username"
    )
    expect(issuePaths({ ...valid, username: "budi santoso" })).toContain(
      "username"
    )
    expect(issuePaths({ ...valid, username: "budi@contoh" })).toContain(
      "username"
    )
    expect(
      issuePaths({ ...valid, password: "rahasia", confirmPassword: "rahasia" })
    ).toContain("password")
    expect(issuePaths({ ...valid, confirmPassword: "beda-sekali" })).toContain(
      "confirmPassword"
    )
  })

  it("menolak nama kosong dan email yang tidak sah", () => {
    expect(issuePaths({ ...valid, name: "  " })).toContain("name")
    expect(issuePaths({ ...valid, email: "bukan-email" })).toContain("email")
  })
})

describe("loginSchema", () => {
  it("menolak identitas dan password kosong", () => {
    expect(
      loginSchema.safeParse({ identifier: "", password: "" }).success
    ).toBe(false)
    expect(
      loginSchema.safeParse({ identifier: "budi", password: "x" }).success
    ).toBe(true)
  })
})
