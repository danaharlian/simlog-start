import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import type {
  ChangeAccountRoleInput,
  ChangeAccountStatusInput,
} from "@/features/auth/schemas"
import {
  authorizeActiveSuperadmin,
  changeAccountRole,
  changeAccountStatus,
} from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"
import { createAccount } from "./accounts.helpers"

describe("authorizeActiveSuperadmin (AC13, NFR3, R22)", () => {
  it("tanpa sesi ditolak AUTH_REQUIRED", async () => {
    const result = await authorizeActiveSuperadmin(null)
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "unauthorized", code: "AUTH_REQUIRED" },
    })
  })

  it("listAccounts menolak pengguna aktif role user dan pengguna pending dengan NOT_ACTIVE_SUPERADMIN", async () => {
    const activeUser = await createAccount("active", "user")
    const pendingUser = await createAccount("pending", "user")
    for (const userId of [activeUser, pendingUser]) {
      expect(await authorizeActiveSuperadmin(userId)).toMatchObject({
        ok: false,
        error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
      })
    }
  })

  it("superadmin yang nonaktif ditolak, superadmin aktif diizinkan", async () => {
    const inactiveSuperadmin = await createAccount("inactive", "superadmin")
    const activeSuperadmin = await createAccount("active", "superadmin")
    expect(await authorizeActiveSuperadmin(inactiveSuperadmin)).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
    })
    expect(await authorizeActiveSuperadmin(activeSuperadmin)).toMatchObject({
      ok: true,
      data: { actorId: activeSuperadmin },
    })
  })

  it("id yang tidak ada ditolak sebagai tanpa sesi", async () => {
    expect(await authorizeActiveSuperadmin(randomUUID())).toMatchObject({
      ok: false,
      error: { kind: "unauthorized", code: "AUTH_REQUIRED" },
    })
  })

  it("changeAccountStatus menolak pengguna role user", async () => {
    const callerId = await createAccount("active", "user")
    const targetId = await createAccount("pending", "user")
    const input: ChangeAccountStatusInput = {
      userId: targetId,
      expectedStatus: "pending",
      nextStatus: "active",
    }
    // The same steps as the server function: requireActiveSuperadmin, then the service only on ok.
    const proof = await authorizeActiveSuperadmin(callerId)
    const result = proof.ok
      ? await changeAccountStatus(proof.data, input)
      : proof
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
    })
    const [stored] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, targetId))
    expect(stored?.status).toBe("pending")
  })

  it("changeAccountRole menolak pengguna role user", async () => {
    const callerId = await createAccount("active", "user")
    const targetId = await createAccount("active", "user")
    const input: ChangeAccountRoleInput = {
      userId: targetId,
      expectedRole: "user",
      nextRole: "superadmin",
    }
    // The same steps as the server function: requireActiveSuperadmin, then the service only on ok.
    const proof = await authorizeActiveSuperadmin(callerId)
    const result = proof.ok ? await changeAccountRole(proof.data, input) : proof
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
    })
    const [stored] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, targetId))
    expect(stored?.role).toBe("user")
  })
})
