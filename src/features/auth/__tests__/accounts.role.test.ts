import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import {
  changeAccountRole,
  changeAccountStatus,
} from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"
import {
  createAccount,
  storedAccount,
  superadminActor,
} from "./accounts.helpers"

describe("changeAccountRole (AC17, AC18, AC19)", () => {
  it("angkat pengguna aktif; mengangkat pengguna pending ditolak TARGET_NOT_ACTIVE", async () => {
    const actor = await superadminActor()
    const active = await createAccount("active")
    const pending = await createAccount("pending")

    const promoted = await changeAccountRole(actor, {
      userId: active,
      expectedRole: "user",
      nextRole: "superadmin",
    })
    expect(promoted).toMatchObject({
      ok: true,
      data: { id: active, role: "superadmin" },
    })
    expect((await storedAccount(active))?.role).toBe("superadmin")

    const refused = await changeAccountRole(actor, {
      userId: pending,
      expectedRole: "user",
      nextRole: "superadmin",
    })
    expect(refused).toMatchObject({
      ok: false,
      error: { kind: "conflict", code: "AUTH_TARGET_NOT_ACTIVE" },
    })
    expect((await storedAccount(pending))?.role).toBe("user")
  })

  it("cabut superadmin lain; role yang sudah berubah ditolak ACCOUNT_ROLE_CHANGED", async () => {
    const actor = await superadminActor()
    const other = await createAccount("active", "superadmin")
    const revoked = await changeAccountRole(actor, {
      userId: other,
      expectedRole: "superadmin",
      nextRole: "user",
    })
    expect(revoked).toMatchObject({ ok: true, data: { role: "user" } })

    const stale = await changeAccountRole(actor, {
      userId: other,
      expectedRole: "superadmin",
      nextRole: "user",
    })
    expect(stale).toMatchObject({
      ok: false,
      error: { kind: "conflict", code: "AUTH_ACCOUNT_ROLE_CHANGED" },
    })
  })

  it("request langsung untuk mencabut role sendiri ditolak dan data tidak berubah (AC18, EC15)", async () => {
    const selfId = await createAccount("active", "superadmin")
    const actor = await superadminActor(selfId)
    const result = await changeAccountRole(actor, {
      userId: selfId,
      expectedRole: "superadmin",
      nextRole: "user",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_CANNOT_CHANGE_SELF" },
    })
    expect((await storedAccount(selfId))?.role).toBe("superadmin")
  })

  it("superadmin yang dicabut tidak bisa mengaktifkan akun (AC19, NOT_ACTIVE_SUPERADMIN)", async () => {
    const revokerActor = await superadminActor()
    const revokedId = await createAccount("active", "superadmin")
    const revokedActor = await superadminActor(revokedId)
    await changeAccountRole(revokerActor, {
      userId: revokedId,
      expectedRole: "superadmin",
      nextRole: "user",
    })
    const target = await createAccount("pending")
    const result = await changeAccountStatus(revokedActor, {
      userId: target,
      expectedStatus: "pending",
      nextStatus: "active",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
    })
    expect((await storedAccount(target))?.status).toBe("pending")
  })

  it("aktor yang sudah dinonaktifkan tidak bisa mengangkat (EC17)", async () => {
    const actorId = await createAccount("active", "superadmin")
    const actor = await superadminActor(actorId)
    await db
      .update(users)
      .set({ status: "inactive" })
      .where(eq(users.id, actorId))
    const target = await createAccount("active")
    const result = await changeAccountRole(actor, {
      userId: target,
      expectedRole: "user",
      nextRole: "superadmin",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_NOT_ACTIVE_SUPERADMIN" },
    })
    expect((await storedAccount(target))?.role).toBe("user")
  })
})
