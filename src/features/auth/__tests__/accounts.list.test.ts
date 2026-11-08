import { eq, inArray } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import { ACCOUNTS_PAGE_SIZE } from "@/features/auth/schemas"
import type { ListAccountsInput } from "@/features/auth/schemas"
import { listAccountsForAdmin } from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"
import { createAccount, superadminActor } from "./accounts.helpers"

const FAR_PAGE = 10_000
// Timestamps unique to this run and newer than any earlier run's, so rows other tests or runs left
// in the shared test database cannot sit between the rows a test compares (ADR 0044, point 4).
const RUN_BASE_MS = Date.UTC(2100, 0, 1) + Date.now()
function runTime(offsetMs: number): Date {
  return new Date(RUN_BASE_MS + offsetMs)
}
const DTO_KEYS = [
  "createdAt",
  "email",
  "id",
  "name",
  "role",
  "status",
  "username",
]

async function listOrFail(input: ListAccountsInput) {
  const result = await listAccountsForAdmin(await superadminActor(), input)
  if (!result.ok)
    throw new Error(`listAccountsForAdmin failed: ${result.error.code}`)
  return result.data
}

describe("listAccountsForAdmin (AC14, NFR6, R16)", () => {
  it("listAccounts hanya mengembalikan kolom DTO", async () => {
    await createAccount("pending")
    const page = await listOrFail({ page: 1, sort: "pendingFirst" })
    expect(page.items.length).toBeGreaterThan(0)
    for (const item of page.items)
      expect(Object.keys(item).sort()).toEqual(DTO_KEYS)
    expect(page.pageSize).toBe(ACCOUNTS_PAGE_SIZE)
    expect(page.items.length).toBeLessThanOrEqual(ACCOUNTS_PAGE_SIZE)
  })

  it("saringan status mengembalikan akun dengan status itu saja, dan akun baru ada di dalamnya", async () => {
    const rejectedId = await createAccount("rejected")
    await db
      .update(users)
      .set({ createdAt: runTime(0) })
      .where(eq(users.id, rejectedId))
    const page = await listOrFail({
      status: "rejected",
      page: 1,
      sort: "createdAtDesc",
    })
    expect(page.items.every((item) => item.status === "rejected")).toBe(true)
    expect(page.items.some((item) => item.id === rejectedId)).toBe(true)
  })

  it("urutan pending dulu: akun pending di atas akun aktif yang lebih baru", async () => {
    const pendingId = await createAccount("pending")
    const activeId = await createAccount("active")
    await db
      .update(users)
      .set({ createdAt: runTime(20) })
      .where(eq(users.id, pendingId))
    await db
      .update(users)
      .set({ createdAt: runTime(21) })
      .where(eq(users.id, activeId))

    const pendingFirst = await listOrFail({ page: 1, sort: "pendingFirst" })
    expect(pendingFirst.items[0]?.id).toBe(pendingId)
    const activeIndex = pendingFirst.items.findIndex(
      (item) => item.id === activeId
    )
    expect(activeIndex === -1 || activeIndex > 0).toBe(true)

    const newestFirst = await listOrFail({ page: 1, sort: "createdAtDesc" })
    const ids = newestFirst.items.map((item) => item.id)
    expect(ids.indexOf(activeId)).toBeGreaterThanOrEqual(0)
    expect(ids.indexOf(activeId)).toBeLessThan(ids.indexOf(pendingId))
  })

  it("waktu daftar sama diurutkan dengan id (tie-breaker)", async () => {
    const ids = [await createAccount("active"), await createAccount("active")]
    const tieTime = runTime(10)
    await db
      .update(users)
      .set({ createdAt: tieTime })
      .where(inArray(users.id, ids))
    const page = await listOrFail({ page: 1, sort: "createdAtDesc" })
    const tied = page.items
      .filter((item) => ids.includes(item.id))
      .map((item) => item.id)
    expect(tied).toEqual([...ids].sort())
  })

  it("halaman di luar jumlah data kosong, total tetap terisi", async () => {
    await createAccount("active")
    const page = await listOrFail({ page: FAR_PAGE, sort: "createdAtDesc" })
    expect(page.items).toHaveLength(0)
    expect(page.total).toBeGreaterThan(0)
  })

  it("createdAt dikirim sebagai string ISO", async () => {
    await createAccount("pending")
    const page = await listOrFail({ page: 1, sort: "pendingFirst" })
    expect(Number.isNaN(Date.parse(page.items[0]?.createdAt ?? ""))).toBe(false)
  })
})
