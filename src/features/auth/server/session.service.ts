import { auth } from "@/features/auth/server/auth.repository"

export function handleAuthRequest(request: Request): Promise<Response> {
  return auth.handler(request)
}

// Session reads the users row each time (cookie cache off), so status changes apply at once (D10).
export async function readSessionUserId(
  headers: Headers
): Promise<string | null> {
  const session = await auth.api.getSession({ headers })
  return session?.user.id ?? null
}
