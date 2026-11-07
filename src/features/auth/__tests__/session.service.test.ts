import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { users } from "@/features/auth/db/schema"
import { auth } from "@/features/auth/server/auth.repository"
import { getCurrentUserDto } from "@/features/auth/server/accounts.service"
import { readSessionUserId } from "@/features/auth/server/session.service"
import { db } from "@/shared/db/client"

const BASE_URL = "http://localhost:3000/api/auth"
const HTTP_BAD_REQUEST = 400

type SignedUp = { userId: string; cookie: string; email: string }

function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return auth.handler(
    new Request(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  )
}

// The session cookie as a browser would send it back: name=value pairs, no attributes.
function cookieHeaderFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0] ?? "")
    .join("; ")
}

async function signUp(): Promise<SignedUp> {
  const suffix = randomUUID().slice(0, 8)
  const email = `dewi.${suffix}@contoh.id`
  const response = await post("/sign-up/email", {
    name: `Dewi ${suffix}`,
    email,
    username: `dewi_${suffix}`,
    password: "rahasia-123",
  })
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
  return { userId: row?.id ?? "", cookie: cookieHeaderFrom(response), email }
}

describe("session path (T1, D10)", () => {
  it("readSessionUserId mengembalikan id pengguna dari cookie sesi", async () => {
    const { userId, cookie } = await signUp()
    expect(await readSessionUserId(new Headers({ cookie }))).toBe(userId)
  })

  it("readSessionUserId mengembalikan null tanpa cookie dan dengan token yang diubah", async () => {
    const { cookie } = await signUp()
    expect(await readSessionUserId(new Headers())).toBeNull()
    const tampered = cookie.replace(
      /session_token=([^;]+)/,
      "session_token=$1x"
    )
    expect(
      await readSessionUserId(new Headers({ cookie: tampered }))
    ).toBeNull()
  })

  it("status yang diubah di database terlihat lewat sesi yang sama tanpa login ulang (AC16)", async () => {
    const { userId, cookie } = await signUp()
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId))
    const sessionUserId = await readSessionUserId(new Headers({ cookie }))
    const dto =
      sessionUserId === null ? null : await getCurrentUserDto(sessionUserId)
    expect(dto?.status).toBe("active")
  })
})

describe("fields the user cannot set (AC4, ADR 0038)", () => {
  it("update-user dengan status atau role ditolak dan baris tidak berubah", async () => {
    const { userId, cookie } = await signUp()
    const origin = { cookie, origin: "http://localhost:3000" }
    const statusResponse = await post(
      "/update-user",
      { status: "active" },
      origin
    )
    const roleResponse = await post(
      "/update-user",
      { role: "superadmin" },
      origin
    )
    expect(statusResponse.status).toBe(HTTP_BAD_REQUEST)
    expect(roleResponse.status).toBe(HTTP_BAD_REQUEST)
    const [row] = await db
      .select({ status: users.status, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
    expect(row).toEqual({ status: "pending", role: "user" })
  })

  it("register dengan statusChangedAt ditolak", async () => {
    const suffix = randomUUID().slice(0, 8)
    const response = await post("/sign-up/email", {
      name: `Eka ${suffix}`,
      email: `eka.${suffix}@contoh.id`,
      username: `eka_${suffix}`,
      password: "rahasia-123",
      statusChangedAt: new Date().toISOString(),
    })
    expect(response.status).toBe(HTTP_BAD_REQUEST)
  })
})
