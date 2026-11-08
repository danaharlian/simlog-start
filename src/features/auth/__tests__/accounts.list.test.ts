import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import { ACCOUNTS_PAGE_SIZE } from "@/features/auth/schemas"
import type { AccountStatus } from "@/features/auth/schemas"
import { auth } from "@/features/auth/server/auth.repository"
import { listAccountsForAdmin } from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"

const FAR_PAGE = 100_000
const DTO_KEYS = [
  "createdAt",
  "email",
  "id",
  "name",
  "role",
  "status",
  "username",
]

async function createAccount(status: AccountStatus): Promise<string> {
  const suffix = randomUUID().slice(0, 8)
  const { user } = await auth.api.signUpEmail({
    body: {
      name: `Joko ${suffix}`,
      email: `joko.${suffix}@contoh.id`,
      username: `joko_${suffix}`,
      password: "rahasia-123",
    },
  })
  await db.update(users).set({ status }).where(eq(users.id, user.id))
  return user.id
}

async function listOrFail(input: Parameters<typeof listAccountsForAdmin>[0]) {
  const result = await listAccountsForAdmin(input)
  if (!result.ok)
    throw new Error(`listAccountsForAdmin failed: ${result.error.code}`)
  return result.data
}

describe("listAccountsForAdmin (AC14, NFR6, R16, EC21)", () => {
  it("listAccounts hanya mengembalikan kolom DTO", async () => {
    await createAccount("pending")
    const page = await listOrFail({ page: 1, sort: "pendingFirst" })
    expect(page.items.length).toBeGreaterThan(0)
    for (const item of page.items)
      expect(Object.keys(item).sort()).toEqual(DTO_KEYS)
    expect(page.pageSize).toBe(ACCOUNTS_PAGE_SIZE)
    expect(page.items.length).toBeLessThanOrEqual(ACCOUNTS_PAGE_SIZE)
  })

  it("saringan status mengembalikan akun dengan status itu saja, terbaru dulu", async () => {
    const rejectedId = await createAccount("rejected")
    const page = await listOrFail({
      status: "rejected",
      page: 1,
      sort: "createdAtDesc",
    })
    expect(page.items.every((item) => item.status === "rejected")).toBe(true)
    expect(page.items[0]?.id).toBe(rejectedId)
  })

  it("urutan pending dulu: tidak ada akun pending setelah akun lain di halaman yang sama", async () => {
    await createAccount("pending")
    await createAccount("active")
    const page = await listOrFail({ page: 1, sort: "pendingFirst" })
    const firstOther = page.items.findIndex((item) => item.status !== "pending")
    const pendingAfter =
      firstOther === -1
        ? []
        : page.items
            .slice(firstOther)
            .filter((item) => item.status === "pending")
    expect(page.items[0]?.status).toBe("pending")
    expect(pendingAfter).toHaveLength(0)
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
