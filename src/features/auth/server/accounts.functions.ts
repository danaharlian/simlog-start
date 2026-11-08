import { createServerFn } from "@tanstack/react-start"
import { withErrorBoundary } from "@/shared/server/with-error-boundary"
import {
  changeAccountStatusSchema,
  listAccountsInputSchema,
} from "@/features/auth/schemas"
import {
  changeAccountStatus as changeAccountStatusForAdmin,
  getCurrentUserDto,
  listAccountsForAdmin,
} from "@/features/auth/server/accounts.service"
import {
  requireActiveSuperadmin,
  withSession,
} from "@/features/auth/server/session.functions"

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([withSession])
  .handler(({ context }) =>
    withErrorBoundary("auth.getCurrentUser", async () =>
      context.userId === null ? null : getCurrentUserDto(context.userId)
    )
  )

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireActiveSuperadmin])
  .validator(listAccountsInputSchema)
  .handler(({ context, data }) =>
    withErrorBoundary("auth.listAccounts", async () =>
      context.superadmin.ok
        ? listAccountsForAdmin(context.superadmin.data, data)
        : context.superadmin
    )
  )

export const changeAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireActiveSuperadmin])
  .validator(changeAccountStatusSchema)
  .handler(({ context, data }) =>
    withErrorBoundary("auth.changeAccountStatus", async () =>
      context.superadmin.ok
        ? changeAccountStatusForAdmin(context.superadmin.data, data)
        : context.superadmin
    )
  )
