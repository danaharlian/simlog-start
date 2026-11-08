import { describe, expect, it } from "vitest"
import type { StatusTarget } from "@/features/auth/schemas"
import {
  changeAccountRole,
  changeAccountStatus,
} from "@/features/auth/server/accounts.service"
import {
  createAccount,
  storedAccount,
  superadminActor,
} from "./accounts.helpers"

const CALLERS = 6
const PAIRS = 3

describe("account changes under concurrency (AC20, NFR4, EC14, EC16)", () => {
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

  it("dua superadmin saling mencabut role bersamaan: satu ok, satu NOT_ACTIVE_SUPERADMIN, tepat satu superadmin aktif", async () => {
    // Several independent pairs at once, so each pair's two transactions overlap with others too.
    const pairs = await Promise.all(
      Array.from({ length: PAIRS }, async () => {
        const firstId = await createAccount("active", "superadmin")
        const secondId = await createAccount("active", "superadmin")
        return {
          first: { id: firstId, actor: await superadminActor(firstId) },
          second: { id: secondId, actor: await superadminActor(secondId) },
        }
      })
    )

    // Race: each one revokes the other; both rows are locked in id order, so one decides first and
    // the other is no longer a superadmin when its turn comes (spec section 4, EC16).
    const outcomes = await Promise.all(
      pairs.map(async ({ first, second }) => {
        const results = await Promise.all([
          changeAccountRole(first.actor, {
            userId: second.id,
            expectedRole: "superadmin",
            nextRole: "user",
          }),
          changeAccountRole(second.actor, {
            userId: first.id,
            expectedRole: "superadmin",
            nextRole: "user",
          }),
        ])
        const roles = [
          (await storedAccount(first.id))?.role,
          (await storedAccount(second.id))?.role,
        ]
        return { results, roles }
      })
    )

    for (const { results, roles } of outcomes) {
      expect(results.filter((result) => result.ok)).toHaveLength(1)
      expect(results.find((result) => !result.ok)).toMatchObject({
        error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
      })
      expect(roles.filter((role) => role === "superadmin")).toHaveLength(1)
    }
  })
})
