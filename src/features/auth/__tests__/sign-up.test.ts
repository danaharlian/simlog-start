import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { accounts, sessions, users } from "@/features/auth/db/schema"
import { auth } from "@/features/auth/server/auth.repository"
import { db } from "@/shared/db/client"
import { logger } from "@/shared/server/logger.server"

const SIGN_UP_URL = "http://localhost:3000/api/auth/sign-up/email"
const HTTP_OK = 200
const ONE_MINUTE_MS = 60_000

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8)
}

function signUp(body: Record<string, unknown>): Promise<Response> {
  return auth.handler(
    new Request(SIGN_UP_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

type SignUpBody = {
  name: string
  email: string
  username: string
  password: string
}

function validBody(suffix: string): SignUpBody {
  return {
    name: `Budi ${suffix}`,
    email: `budi.${suffix}@contoh.id`,
    username: `Budi.${suffix}`,
    password: "rahasia-123",
  }
}

async function findUserByEmail(email: string) {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, email))
  return row
}

describe("sign-up through auth.handler (T1)", () => {
  it("register lewat auth.handler menyimpan baris di users, accounts, dan sessions", async () => {
    const body = validBody(uniqueSuffix())
    const response = await signUp(body)
    expect(response.status).toBe(HTTP_OK)

    const user = await findUserByEmail(body.email)
    expect(user).toBeDefined()
    const userId = user?.id ?? ""
    const accountRows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))
    const sessionRows = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
    expect(accountRows).toHaveLength(1)
    expect(sessionRows).toHaveLength(1)
  })

  it("id pengguna baru berbentuk uuid", async () => {
    const body = validBody(uniqueSuffix())
    await signUp(body)
    const user = await findUserByEmail(body.email)
    expect(user?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it("register membuat akun pending role user dengan username huruf kecil dan sesi (AC1)", async () => {
    const suffix = uniqueSuffix()
    const body = validBody(suffix)
    const response = await signUp(body)
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token"
    )

    const user = await findUserByEmail(body.email)
    expect(user?.status).toBe("pending")
    expect(user?.role).toBe("user")
    expect(user?.username).toBe(`budi.${suffix}`)
  })

  it("status dan role di body register diabaikan (AC4)", async () => {
    const body = {
      ...validBody(uniqueSuffix()),
      status: "active",
      role: "superadmin",
    }
    await signUp(body)
    const user = await findUserByEmail(body.email)
    expect(user?.status).toBe("pending")
    expect(user?.role).toBe("user")
  })

  it("createdAt akun baru berada dalam satu menit dari waktu tes", async () => {
    const body = validBody(uniqueSuffix())
    await signUp(body)
    const user = await findUserByEmail(body.email)
    const createdAt = user?.createdAt.getTime() ?? 0
    expect(Math.abs(createdAt - Date.now())).toBeLessThan(ONE_MINUTE_MS)
  })

  it("register tanpa username ditolak dengan AUTH_USERNAME_REQUIRED", async () => {
    const { username: _omitted, ...body } = validBody(uniqueSuffix())
    const response = await signUp(body)
    const payload: unknown = await response.json()
    expect(payload).toMatchObject({ code: "AUTH_USERNAME_REQUIRED" })
    expect(await findUserByEmail(body.email)).toBeUndefined()
  })

  it("username yang berisi @ ditolak INVALID_USERNAME", async () => {
    const suffix = uniqueSuffix()
    const body = { ...validBody(suffix), username: `budi@${suffix}` }
    const response = await signUp(body)
    const payload: unknown = await response.json()
    expect(payload).toMatchObject({ code: "INVALID_USERNAME" })
    expect(await findUserByEmail(body.email)).toBeUndefined()
  })

  it("register dengan email atau username beda huruf ditolak, jumlah akun tetap (AC3)", async () => {
    const body = validBody(uniqueSuffix())
    await signUp(body)
    const sameEmail = await signUp({
      ...validBody(uniqueSuffix()),
      email: body.email.toUpperCase(),
    })
    const usernameCollision = {
      ...validBody(uniqueSuffix()),
      username: body.username.toUpperCase(),
    }
    const sameUsername = await signUp(usernameCollision)
    expect(await sameEmail.json()).toMatchObject({
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    })
    expect(await sameUsername.json()).toMatchObject({
      code: "USERNAME_IS_ALREADY_TAKEN",
    })
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
    expect(rows).toHaveLength(1)
    const collisionRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, usernameCollision.email))
    expect(collisionRows).toHaveLength(0)
  })

  it("dua register bersamaan dengan email sama: satu berhasil, email tidak masuk log", async () => {
    const suffix = uniqueSuffix()
    const first = validBody(suffix)
    const second = { ...validBody(uniqueSuffix()), email: first.email }
    // Spy on the shared pino logger: pino writes to fd 1, not through console (review T2 B1).
    const written: Array<string> = []
    const record = (...args: ReadonlyArray<unknown>) => {
      written.push(JSON.stringify(args))
    }
    vi.spyOn(logger, "error").mockImplementation(record)
    vi.spyOn(console, "error").mockImplementation(record)
    const responses = await Promise.all([signUp(first), signUp(second)])
    vi.restoreAllMocks()
    expect(written.some((line) => line.includes(first.email))).toBe(false)
    const statuses = responses.map((response) => response.status).sort()
    expect(statuses.filter((status) => status === HTTP_OK)).toHaveLength(1)
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, first.email))
    expect(rows).toHaveLength(1)
    // Spec section 4: the loser fails at Better Auth's pre-check (USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL) or,
    // when both pass it, at the unique index (FAILED_TO_CREATE_USER). Both map to a sign-up error in the UI.
    const loser = responses.find((response) => response.status !== HTTP_OK)
    const loserBody: unknown = await loser?.json()
    const { code } = z.object({ code: z.string() }).parse(loserBody)
    expect([
      "FAILED_TO_CREATE_USER",
      "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    ]).toContain(code)
    // Positive control: a loss at the unique index is logged, and the line carries no email.
    if (code === "FAILED_TO_CREATE_USER")
      expect(written.length).toBeGreaterThan(0)
  })
})
