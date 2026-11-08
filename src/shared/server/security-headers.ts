import { createMiddleware } from "@tanstack/react-start"

// Security headers on every response (ADR 0047; security.md rule 9). HSTS is set where TLS ends,
// not here (ADR 0047 amends rule 9).

export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // Scripts only with this request's nonce; the router puts it on its own inline scripts.
    `script-src 'self' 'nonce-${nonce}'`,
    // The generated sidebar sets style attributes in the SSR HTML, which a nonce cannot cover.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

const isHtml = (headers: Headers) =>
  headers.get("content-type")?.startsWith("text/html") ?? false

export function withSecurityHeaders(
  response: Response,
  nonce: string
): Response {
  // A redirect or a passed-through fetch response has immutable headers, so the headers are set
  // on a copy (ADR 0047). The body stream moves to the copy unread.
  const headers = new Headers(response.headers)
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce))
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  headers.set("X-Frame-Options", "DENY")
  // HTML carries the nonce, so a shared cache must never keep it (ADR 0047).
  if (
    isHtml(headers) &&
    !(headers.get("cache-control") ?? "").includes("no-store")
  )
    headers.set("Cache-Control", "no-store")
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// First in requestMiddleware (src/start.ts), so every response passes through it, the CSRF 403
// included. The nonce reaches the router through the request context (src/router.tsx).
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ next }) => {
    const nonce = crypto.randomUUID().replaceAll("-", "")
    const result = await next({ context: { nonce } })
    return { ...result, response: withSecurityHeaders(result.response, nonce) }
  }
)
