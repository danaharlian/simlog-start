import { randomUUID } from "node:crypto"
import { betterAuth } from "better-auth"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { accounts, sessions, users } from "@/features/auth/db/schema"
import { auth, authOptions } from "@/features/auth/server/auth.repository"
import { db } from "@/shared/db/client"
import { logger } from "@/shared/server/logger.server"

const BASE_URL = "http://localhost:3000/api/auth"
const SAME_ORIGIN = "http://localhost:3000"
const PASSWORD = "rahasia-123"
const HTTP_OK = 200
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_TOO_MANY_REQUESTS = 429
const RATE_LIMIT_MAX = 3

type Handler = (request: Request) => Promise<Response>

function post(
  handler: Handler,
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return handler(
    new Request(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  )
}

function cookieHeaderFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0] ?? "")
    .join("; ")
}

async function createAccount() {
  const suffix = randomUUID().slice(0, 8)
  const account = {
    username: `gita_${suffix}`,
    email: `gita.${suffix}@contoh.id`,
  }
  await post(auth.handler, "/sign-up/email", {
    name: `Gita ${suffix}`,
    ...account,
    password: PASSWORD,
  })
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, account.email))
  return { ...account, userId: row?.id ?? "" }
}

async function sessionCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
  return rows.length
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("sign-in and sign-out (AC5, AC6, AC7)", () => {
  it("login dengan username huruf besar dan email huruf besar berhasil (AC5)", async () => {
    const account = await createAccount()
    const byUsername = await post(auth.handler, "/sign-in/username", {
      username: account.username.toUpperCase(),
      password: PASSWORD,
    })
    const byEmail = await post(auth.handler, "/sign-in/email", {
      email: account.email.toUpperCase(),
      password: PASSWORD,
    })
    expect(byUsername.status).toBe(HTTP_OK)
    expect(byEmail.status).toBe(HTTP_OK)
  })

  it("sign-out menghapus sesi (AC6)", async () => {
    const account = await createAccount()
    const signIn = await post(auth.handler, "/sign-in/username", {
      username: account.username,
      password: PASSWORD,
    })
    const before = await sessionCount(account.userId)
    const signOut = await post(
      auth.handler,
      "/sign-out",
      {},
      { cookie: cookieHeaderFrom(signIn), origin: SAME_ORIGIN }
    )
    expect(signOut.status).toBe(HTTP_OK)
    expect(await sessionCount(account.userId)).toBe(before - 1)
  })

  it("password salah dan username tak dikenal tidak membuat sesi (AC7)", async () => {
    const account = await createAccount()
    const before = await sessionCount(account.userId)
    const wrongPassword = await post(auth.handler, "/sign-in/username", {
      username: account.username,
      password: "salah-sekali",
    })
    const unknownUser = await post(auth.handler, "/sign-in/username", {
      username: `tidakada_${randomUUID().slice(0, 8)}`,
      password: PASSWORD,
    })
    expect(wrongPassword.status).toBe(HTTP_UNAUTHORIZED)
    expect(unknownUser.status).toBe(HTTP_UNAUTHORIZED)
    expect(await wrongPassword.json()).toEqual(await unknownUser.json())
    expect(await sessionCount(account.userId)).toBe(before)
  })
})

describe("rate limit (AC21, NFR1)", () => {
  it("permintaan keempat dalam 10 detik ke /sign-in/username mendapat 429", async () => {
    // Better Auth enables its limiter only in production; same options with the limiter turned on.
    const limited = betterAuth({ ...authOptions, rateLimit: { enabled: true } })
    const body = {
      username: `tidakada_${randomUUID().slice(0, 8)}`,
      password: PASSWORD,
    }
    const statuses: Array<number> = []
    for (let attempt = 0; attempt <= RATE_LIMIT_MAX; attempt += 1) {
      statuses.push(
        (await post(limited.handler, "/sign-in/username", body)).status
      )
    }
    expect(
      statuses
        .slice(0, RATE_LIMIT_MAX)
        .every((status) => status !== HTTP_TOO_MANY_REQUESTS)
    ).toBe(true)
    expect(statuses[RATE_LIMIT_MAX]).toBe(HTTP_TOO_MANY_REQUESTS)
  })
})

// pino writes to fd 1 directly, so the tests spy on the shared pino logger itself (review T2 B1).
function captureLogs(): Array<string> {
  const written: Array<string> = []
  const record = (...args: ReadonlyArray<unknown>) => {
    written.push(JSON.stringify(args))
  }
  for (const level of ["debug", "info", "warn", "error"] as const) {
    vi.spyOn(logger, level).mockImplementation(record)
  }
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation(record)
  }
  return written
}

describe("Better Auth logs (ADR 0046, point 3)", () => {
  it("logger Better Auth meneruskan pesan ke pino tanpa argumen tambahan", () => {
    const written = captureLogs()
    authOptions.logger.log("error", "Failed to create user", {
      detail: "Key (email)=(rahasia.log@contoh.id) already exists.",
    })
    expect(written).toHaveLength(1)
    expect(written[0]).toContain("Failed to create user")
    expect(written[0]).not.toContain("rahasia.log@contoh.id")
  })

  it("level logger Better Auth tetap warn (pesan info memuat email)", () => {
    expect(authOptions.logger.level).toBe("warn")
  })
})

describe("passwords stay out of logs and storage (AC24, NFR2)", () => {
  it("log yang ditangkap tidak memuat password; accounts.password bukan teks asli", async () => {
    const written = captureLogs()
    // Positive control: the capture sees what Better Auth sends to the logger.
    authOptions.logger.log("warn", "capture-probe")
    const account = await createAccount()
    await post(auth.handler, "/sign-in/username", {
      username: account.username,
      password: "salah-sekali",
    })
    await post(auth.handler, "/sign-in/username", {
      username: account.username,
      password: PASSWORD,
    })
    vi.restoreAllMocks()

    expect(written.some((line) => line.includes("capture-probe"))).toBe(true)
    expect(
      written.some(
        (line) => line.includes(PASSWORD) || line.includes("salah-sekali")
      )
    ).toBe(false)
    const [credential] = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(eq(accounts.userId, account.userId))
    expect(credential?.password).toBeTruthy()
    expect(credential?.password).not.toContain(PASSWORD)
  })
})

describe("cross-site requests to /api/auth (better-auth.md rule 9, ADR 0046)", () => {
  function signUpBody() {
    const suffix = randomUUID().slice(0, 8)
    return {
      name: `Hana ${suffix}`,
      email: `hana.${suffix}@contoh.id`,
      username: `hana_${suffix}`,
      password: PASSWORD,
    }
  }

  it("sign-up: Origin asing 403, Origin null 403, cross-site navigation 403, same origin 200", async () => {
    expect(
      (
        await post(auth.handler, "/sign-up/email", signUpBody(), {
          origin: "https://evil.example",
        })
      ).status
    ).toBe(HTTP_FORBIDDEN)
    expect(
      (
        await post(auth.handler, "/sign-up/email", signUpBody(), {
          origin: "null",
        })
      ).status
    ).toBe(HTTP_FORBIDDEN)
    const navigation = {
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    }
    expect(
      (await post(auth.handler, "/sign-up/email", signUpBody(), navigation))
        .status
    ).toBe(HTTP_FORBIDDEN)
    expect(
      (
        await post(auth.handler, "/sign-up/email", signUpBody(), {
          origin: SAME_ORIGIN,
        })
      ).status
    ).toBe(HTTP_OK)
  })

  it("sign-in username dan email: Origin asing, Origin null, cross-site navigation 403; same origin 200", async () => {
    const account = await createAccount()
    const navigation = {
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
    }
    const cases = [
      {
        path: "/sign-in/username",
        body: { username: account.username, password: PASSWORD },
      },
      {
        path: "/sign-in/email",
        body: { email: account.email, password: PASSWORD },
      },
    ]
    for (const { path, body } of cases) {
      expect(
        (
          await post(auth.handler, path, body, {
            origin: "https://evil.example",
          })
        ).status
      ).toBe(HTTP_FORBIDDEN)
      expect(
        (await post(auth.handler, path, body, { origin: "null" })).status
      ).toBe(HTTP_FORBIDDEN)
      expect((await post(auth.handler, path, body, navigation)).status).toBe(
        HTTP_FORBIDDEN
      )
      expect(
        (await post(auth.handler, path, body, { origin: SAME_ORIGIN })).status
      ).toBe(HTTP_OK)
    }
  })

  it("sign-out dengan cookie: Origin asing 403, tanpa Origin 403", async () => {
    const account = await createAccount()
    const signIn = await post(auth.handler, "/sign-in/username", {
      username: account.username,
      password: PASSWORD,
    })
    const cookie = cookieHeaderFrom(signIn)
    expect(
      (
        await post(
          auth.handler,
          "/sign-out",
          {},
          { cookie, origin: "https://evil.example" }
        )
      ).status
    ).toBe(HTTP_FORBIDDEN)
    expect((await post(auth.handler, "/sign-out", {}, { cookie })).status).toBe(
      HTTP_FORBIDDEN
    )
  })
})
