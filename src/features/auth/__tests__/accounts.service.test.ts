import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import { auth } from "@/features/auth/server/auth.repository"
import { getCurrentUserDto } from "@/features/auth/server/accounts.service"
import { db } from "@/shared/db/client"

async function createPendingUser(): Promise<string> {
  const suffix = randomUUID().slice(0, 8)
  const result = await auth.api.signUpEmail({
    body: {
      name: `Citra ${suffix}`,
      email: `citra.${suffix}@contoh.id`,
      username: `citra_${suffix}`,
      password: "rahasia-123",
    },
  })
  return result.user.id
}

describe("getCurrentUserDto (T1)", () => {
  it("mengembalikan DTO pengguna dengan status pending", async () => {
    const userId = await createPendingUser()
    const dto = await getCurrentUserDto(userId)
    expect(dto).toMatchObject({ id: userId, status: "pending", role: "user" })
  })

  it("getCurrentUserDto melihat status yang diubah langsung di database (AC16)", async () => {
    const userId = await createPendingUser()
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId))
    const dto = await getCurrentUserDto(userId)
    expect(dto?.status).toBe("active")
  })

  it("mengembalikan null untuk id yang tidak ada", async () => {
    expect(await getCurrentUserDto(randomUUID())).toBeNull()
  })
})
