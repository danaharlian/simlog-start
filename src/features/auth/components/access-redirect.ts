import type { CurrentUser } from "@/features/auth/schemas"

export type AccessArea = "guest" | "status" | "app"
export type AccessRedirect = "/login" | "/status" | "/" | null

// UX only: the server checks the session in every function (spec section 1, security.md rule 1).
export function resolveAccessRedirect(
  area: AccessArea,
  user: CurrentUser | null
): AccessRedirect {
  if (area === "guest") return user === null ? null : "/"
  if (user === null) return "/login"
  const isActive = user.status === "active"
  if (area === "status") return isActive ? "/" : null
  return isActive ? null : "/status"
}
