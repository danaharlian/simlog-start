import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import {
  changeAccountStatus,
  getCurrentUserDto,
} from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"
import {
  createAccount,
  storedAccount,
  superadminActor,
} from "./accounts.helpers"

describe("changeAccountStatus (AC15, AC16, AC18, M1)", () => {
  it("aktifkan, tolak, nonaktifkan, aktifkan kembali", async () => {
    const actor = await superadminActor()
    const a = await createAccount("pending")
    const b = await createAccount("pending")
    const c = await createAccount("active")
    const d = await createAccount("rejected")
    const results = [
      await changeAccountStatus(actor, {
        userId: a,
        expectedStatus: "pending",
        nextStatus: "active",
      }),
      await changeAccountStatus(actor, {
        userId: b,
        expectedStatus: "pending",
        nextStatus: "rejected",
      }),
      await changeAccountStatus(actor, {
        userId: c,
        expectedStatus: "active",
        nextStatus: "inactive",
      }),
      await changeAccountStatus(actor, {
        userId: d,
        expectedStatus: "rejected",
        nextStatus: "active",
      }),
    ]
    expect(results.every((result) => result.ok)).toBe(true)
    expect((await storedAccount(a))?.status).toBe("active")
    expect((await storedAccount(b))?.status).toBe("rejected")
    expect((await storedAccount(c))?.status).toBe("inactive")
    expect((await storedAccount(d))?.status).toBe("active")
  })

  it("status_changed_at terisi saat keputusan (M1)", async () => {
    const actor = await superadminActor()
    const target = await createAccount("pending")
    expect((await storedAccount(target))?.statusChangedAt).toBeNull()
    await changeAccountStatus(actor, {
      userId: target,
      expectedStatus: "pending",
      nextStatus: "active",
    })
    expect((await storedAccount(target))?.statusChangedAt).toBeInstanceOf(Date)
  })

  it("getCurrentUserDto pengguna A melihat active, pengguna C melihat inactive tanpa login ulang (AC16)", async () => {
    const actor = await superadminActor()
    const a = await createAccount("pending")
    const c = await createAccount("active")
    await changeAccountStatus(actor, {
      userId: a,
      expectedStatus: "pending",
      nextStatus: "active",
    })
    await changeAccountStatus(actor, {
      userId: c,
      expectedStatus: "active",
      nextStatus: "inactive",
    })
    expect((await getCurrentUserDto(a))?.status).toBe("active")
    expect((await getCurrentUserDto(c))?.status).toBe("inactive")
  })

  it("request langsung untuk diri sendiri ditolak dan data tidak berubah (AC18, EC15)", async () => {
    const selfId = await createAccount("active", "superadmin")
    const actor = await superadminActor(selfId)
    const result = await changeAccountStatus(actor, {
      userId: selfId,
      expectedStatus: "active",
      nextStatus: "inactive",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "forbidden", code: "AUTH_CANNOT_CHANGE_SELF" },
    })
    expect((await storedAccount(selfId))?.status).toBe("active")
  })

  it("transisi tidak sah ditolak dan status tetap", async () => {
    const actor = await superadminActor()
    const target = await createAccount("active")
    const result = await changeAccountStatus(actor, {
      userId: target,
      expectedStatus: "active",
      nextStatus: "rejected",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "conflict", code: "AUTH_INVALID_STATUS_TRANSITION" },
    })
    expect((await storedAccount(target))?.status).toBe("active")
  })

  it("akun yang tidak ada ditolak AUTH_ACCOUNT_NOT_FOUND", async () => {
    const actor = await superadminActor()
    const result = await changeAccountStatus(actor, {
      userId: randomUUID(),
      expectedStatus: "pending",
      nextStatus: "active",
    })
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "not_found", code: "AUTH_ACCOUNT_NOT_FOUND" },
    })
  })

  it("aktor yang sudah tidak aktif atau bukan superadmin ditolak di baris terkunci (EC17)", async () => {
    const actorId = await createAccount("active", "superadmin")
    const actor = await superadminActor(actorId)
    await db.update(users).set({ role: "user" }).where(eq(users.id, actorId))
    const target = await createAccount("pending")
    const result = await changeAccountStatus(actor, {
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
})
