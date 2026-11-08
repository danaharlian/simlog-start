import { describe, expect, it } from "vitest"
import type { StatusTarget } from "@/features/auth/schemas"
import { changeAccountStatus } from "@/features/auth/server/accounts.service"
import {
  createAccount,
  storedAccount,
  superadminActor,
} from "./accounts.helpers"

const CALLERS = 6

describe("changeAccountStatus under concurrency (AC20, NFR4, EC14)", () => {
  it("aktifkan dan tolak bersamaan: satu ok, sisanya AUTH_ACCOUNT_STATUS_CHANGED, status tersimpan sesuai yang menang", async () => {
    const target = await createAccount("pending")
    const actors = await Promise.all(
      Array.from({ length: CALLERS }, () => superadminActor())
    )
    const nextStatuses: ReadonlyArray<StatusTarget> = actors.map((_, index) =>
      index % 2 === 0 ? "active" : "rejected"
    )

    // Race: every caller saw "pending"; the row lock lets exactly one decide (spec section 4).
    const results = await Promise.all(
      actors.map((actor, index) =>
        changeAccountStatus(actor, {
          userId: target,
          expectedStatus: "pending",
          nextStatus: nextStatuses[index] ?? "active",
        })
      )
    )

    const winners = results.flatMap((result, index) =>
      result.ok ? [nextStatuses[index]] : []
    )
    const losers = results.filter((result) => !result.ok)
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(CALLERS - 1)
    for (const loser of losers)
      expect(loser).toMatchObject({
        error: { kind: "conflict", code: "AUTH_ACCOUNT_STATUS_CHANGED" },
      })
    expect((await storedAccount(target))?.status).toBe(winners[0])
  })
})
