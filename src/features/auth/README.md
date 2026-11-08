# auth

Accounts, sessions, account status, and roles for simlog. Sign-up and sign-in run through Better Auth (email and password, plus the `username` plugin, ADR 0039). A new account is `pending` until a superadmin activates it (ADR 0038). Spec: `specs/auth/06-feature-spec.md`.

## Public API

| Export                                                                                       | Entry             | Kind                                               | Since |
| -------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------- | ----- |
| `AccountStatusView`                                                                          | `index.ts`        | component                                          | T1    |
| `currentUserQueryOptions`, `authScope`                                                       | `index.ts`        | query options, constant                            | T1    |
| `CurrentUser`, `AccountStatus`, `Role`                                                       | `index.ts`        | type                                               | T1    |
| `LoginForm`, `RegisterForm`                                                                  | `index.ts`        | component                                          | T2    |
| `useSignOut`                                                                                 | `index.ts`        | hook                                               | T2    |
| `resolveAccessRedirect`, `AccessArea`                                                        | `index.ts`        | function, type (for `beforeLoad` in layout routes) | T2    |
| `UserManagementView`, `accountsQueryOptions`, `listAccountsInputSchema`, `ListAccountsInput` | `index.ts`        | component, query options, schema, type             | T4    |
| `SIGN_OUT_TEXT`                                                                              | `index.ts`        | constant (sign-out labels for the app shell)       | T3    |
| `authHandler`                                                                                | `index.server.ts` | handler for `src/routes/api/auth/$.ts`             | T1    |

Server functions:

- `getCurrentUser` (GET, `withSession`; returns `CurrentUser | null`; `Cache-Control: private, no-store`).
- `listAccounts` (GET, `requireActiveSuperadmin`; input `listAccountsInputSchema`; returns `Result<AccountsPage>`; `AUTH_REQUIRED` or `AUTH_NOT_ACTIVE_SUPERADMIN` otherwise).
- `changeAccountStatus` (POST, `requireActiveSuperadmin`; input `changeAccountStatusSchema`; returns `Result<AccountRow>`). Errors: `AUTH_NOT_ACTIVE_SUPERADMIN`, `AUTH_ACCOUNT_NOT_FOUND`, `AUTH_CANNOT_CHANGE_SELF`, `AUTH_ACCOUNT_STATUS_CHANGED`, `AUTH_INVALID_STATUS_TRANSITION`. Logs `auth.account_status_changed` (actor and target ids, from, to).

Authorization: `requireActiveSuperadmin` reads the actor's row on every call and puts the decision (`Result`) in `context.superadmin`; the handler returns it or calls the service.

Status changes (T5): one transaction locks the actor's row and the target's row with `FOR UPDATE`, ordered by id, then `decideStatusChange` (`server/accounts.rules.ts`) checks that the actor is not the target, that the status is still the one the superadmin saw (`expectedStatus`), and that the transition is allowed. Of two superadmins acting on the same account at once, one wins and the other gets `AUTH_ACCOUNT_STATUS_CHANGED`. The write sets `status_changed_at`.

Better Auth hardening (ADR 0046): `disableOriginCheck: false`, `formCsrfMiddleware` on `/sign-in/username`, and Better Auth's logs routed to pino with the message only.

## Owned tables

`users`, `sessions`, `accounts`, `verifications`, and the enums `account_status` (`pending`, `active`, `rejected`, `inactive`) and `user_role` (`user`, `superadmin`). Migration: `drizzle/<timestamp>_add-auth-tables/`. No other feature queries these tables.

## Edits to the generated schema

`db/schema.ts` started as the output of:

```bash
pnpm dlx auth@1.7.18 generate --config src/features/auth/server/auth.repository.ts --output src/features/auth/db/schema.ts
```

The command needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` set; placeholder values work, because `generate` does not connect. The output was then edited as ADR 0040 and ADR 0043 allow. After a Better Auth upgrade, regenerate into a scratch file and compare against this list:

1. Removed the `relations` import and the `usersRelations`, `sessionsRelations`, `accountsRelations` blocks (they do not compile on Drizzle 1.0 RC, ADR 0040).
2. `timestamp(..., { withTimezone: true })` on every timestamp column.
3. `users.email`, `users.username`, `sessions.token`: `.unique()` replaced by unique indexes `users_email_key`, `users_username_key`, `sessions_token_key`.
4. Index names `sessions_user_id_idx`, `accounts_user_id_idx` (the CLI wrote `sessions_userId_idx`, `accounts_userId_idx`).
5. `users.status` and `users.role` use the enums `account_status` and `user_role`, and are `NOT NULL`. `users.username` is `NOT NULL`.
6. Added index `users_status_created_at_idx` (`status`, `created_at`) for the account list (spec section 4).
7. Quotes and `/* @__PURE__ */` comments normalized by Prettier (formatting only).

Property names, which Better Auth reads, are unchanged.

## Events

None.
