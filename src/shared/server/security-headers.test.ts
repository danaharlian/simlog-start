import { describe, expect, it } from "vitest"
import {
  contentSecurityPolicy,
  withSecurityHeaders,
} from "@/shared/server/security-headers"

const NONCE = "abc123"

function html(headers: Record<string, string> = {}) {
  return new Response("<!doctype html><p>ok</p>", {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  })
}

describe("security headers (ADR 0047, QA D1, security.md rule 9)", () => {
  it("CSP: script hanya dengan nonce, style inline diizinkan, framing ditolak", () => {
    const csp = contentSecurityPolicy(NONCE)
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}'`)
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain("data:")
  })

  it("halaman HTML mendapat semua header dan no-store", () => {
    const headers = withSecurityHeaders(html(), NONCE).headers
    expect(headers.get("content-security-policy")).toBe(
      contentSecurityPolicy(NONCE)
    )
    expect(headers.get("x-content-type-options")).toBe("nosniff")
    expect(headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin"
    )
    expect(headers.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    )
    expect(headers.get("x-frame-options")).toBe("DENY")
    expect(headers.get("cache-control")).toBe("no-store")
  })

  it("HTML yang sudah private, no-store tetap begitu", () => {
    const headers = withSecurityHeaders(
      html({ "cache-control": "private, no-store" }),
      NONCE
    ).headers
    expect(headers.get("cache-control")).toBe("private, no-store")
  })

  it("respons non-HTML mendapat header keamanan tanpa diubah cache-nya", () => {
    const json = new Response("{}", {
      headers: {
        "content-type": "application/json",
        "cache-control": "max-age=60",
      },
    })
    const headers = withSecurityHeaders(json, NONCE).headers
    expect(headers.get("x-content-type-options")).toBe("nosniff")
    expect(headers.get("cache-control")).toBe("max-age=60")
  })

  it("redirect dengan header immutable tidak melempar error dan tetap redirect", async () => {
    const result = withSecurityHeaders(
      Response.redirect("http://localhost:3000/login", 307),
      NONCE
    )
    expect(result.status).toBe(307)
    expect(result.headers.get("location")).toBe("http://localhost:3000/login")
    expect(result.headers.get("x-frame-options")).toBe("DENY")
  })

  it("isi respons tidak berubah", async () => {
    const result = withSecurityHeaders(html(), NONCE)
    expect(await result.text()).toBe("<!doctype html><p>ok</p>")
  })
})
