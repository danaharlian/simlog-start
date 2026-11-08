import { describe, expect, it } from "vitest"
import { decideStatusChange } from "@/features/auth/server/accounts.rules"
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
