import { isNotFound, isRedirect } from "@tanstack/react-router"
import { logger } from "@/shared/server/logger.server"

export async function withErrorBoundary<T>(
  operation: string,
  run: () => Promise<T>
): Promise<T> {
  try {
    return await run()
  } catch (cause) {
    if (isRedirect(cause) || isNotFound(cause)) throw cause
    logger.error({ operation, err: cause }, "unexpected failure")
    throw new Error("Something went wrong. Try again.")
  }
}
