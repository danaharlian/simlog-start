import { describe, expect, it } from "vitest"
import {
  changeAccountRoleSchema,
  changeAccountStatusSchema,
} from "@/features/auth/schemas"
import {
  decideRoleChange,
  decideStatusChange,
} from "@/features/auth/server/accounts.rules"
import type { AccountStatus } from "@/features/auth/schemas"

const ACTOR = "11111111-1111-4111-8111-111111111111"
const TARGET = "22222222-2222-4222-8222-222222222222"

function decide(
  currentStatus: AccountStatus,
  nextStatus: AccountStatus,
  targetId: string = TARGET
) {
  return decideStatusChange({
    actorId: ACTOR,
    targetId,
    currentStatus,
    expectedStatus: currentStatus,
    nextStatus,
  })
}

describe("decideStatusChange (AC15, AC18, EC14, EC15)", () => {
  it("transisi sah: pending ke active dan rejected, active ke inactive, rejected dan inactive ke active", () => {
    const valid: ReadonlyArray<[AccountStatus, AccountStatus]> = [
      ["pending", "active"],
      ["pending", "rejected"],
      ["active", "inactive"],
      ["rejected", "active"],
      ["inactive", "active"],
    ]
    for (const [from, to] of valid)
      expect(decide(from, to)).toEqual({ kind: "apply" })
  })

  it("transisi tidak sah ditolak invalid_transition", () => {
    const invalid: ReadonlyArray<[AccountStatus, AccountStatus]> = [
      ["pending", "inactive"],
      ["active", "rejected"],
      ["active", "pending"],
      ["rejected", "inactive"],
      ["inactive", "rejected"],
      ["active", "active"],
    ]
    for (const [from, to] of invalid)
      expect(decide(from, to)).toEqual({
        kind: "reject",
        reason: "invalid_transition",
      })
  })

  it("menonaktifkan diri sendiri ditolak CANNOT_CHANGE_SELF (self)", () => {
    expect(decide("active", "inactive", ACTOR)).toEqual({
      kind: "reject",
      reason: "self",
    })
  })

  it("status yang sudah berubah sejak dilihat ditolak changed", () => {
    expect(
      decideStatusChange({
        actorId: ACTOR,
        targetId: TARGET,
        currentStatus: "rejected",
        expectedStatus: "pending",
        nextStatus: "active",
      })
    ).toEqual({ kind: "reject", reason: "changed" })
  })
})

describe("changeAccountStatusSchema", () => {
  it("menolak nextStatus pending sebelum server berjalan", () => {
    const input = {
      userId: "7d1f2c1e-0000-4000-8000-000000000001",
      expectedStatus: "active",
    }
    expect(
      changeAccountStatusSchema.safeParse({ ...input, nextStatus: "pending" })
        .success
    ).toBe(false)
    expect(
      changeAccountStatusSchema.safeParse({ ...input, nextStatus: "inactive" })
        .success
    ).toBe(true)
  })
})

describe("decideRoleChange (AC17, AC18 role, EC16, EC18)", () => {
  const base = {
    actorId: ACTOR,
    targetId: TARGET,
    targetStatus: "active",
    currentRole: "user",
    expectedRole: "user",
    nextRole: "superadmin",
  } as const

  it("mengangkat pengguna aktif dan mencabut superadmin lain diterapkan", () => {
    expect(decideRoleChange(base)).toEqual({ kind: "apply" })
    expect(
      decideRoleChange({
        ...base,
        currentRole: "superadmin",
        expectedRole: "superadmin",
        nextRole: "user",
      })
    ).toEqual({ kind: "apply" })
  })

  it("mencabut role diri sendiri ditolak CANNOT_CHANGE_SELF", () => {
    expect(
      decideRoleChange({
        ...base,
        targetId: ACTOR,
        currentRole: "superadmin",
        expectedRole: "superadmin",
        nextRole: "user",
      })
    ).toEqual({ kind: "reject", reason: "self" })
  })

  it("role yang sudah berubah sejak dibaca ditolak", () => {
    expect(decideRoleChange({ ...base, currentRole: "superadmin" })).toEqual({
      kind: "reject",
      reason: "changed",
    })
  })

  it("mengangkat pengguna yang tidak aktif ditolak, mencabut superadmin nonaktif diterapkan", () => {
    for (const targetStatus of ["pending", "rejected", "inactive"] as const)
      expect(decideRoleChange({ ...base, targetStatus })).toEqual({
        kind: "reject",
        reason: "target_not_active",
      })
    expect(
      decideRoleChange({
        ...base,
        targetStatus: "inactive",
        currentRole: "superadmin",
        expectedRole: "superadmin",
        nextRole: "user",
      })
    ).toEqual({ kind: "apply" })
  })

  it("schema menolak nextRole yang sama dengan expectedRole", () => {
    expect(
      changeAccountRoleSchema.safeParse({
        userId: TARGET,
        expectedRole: "user",
        nextRole: "user",
      }).success
    ).toBe(false)
  })
})
