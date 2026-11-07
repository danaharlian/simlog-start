# 0038 Account status and the superadmin role without the Better Auth admin plugin

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect), via chat, 2026-11-08: “05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted”

## Context

The auth PRD (`specs/auth/04-prd.md`, R5, R13, R17 to R22) needs four account statuses (pending, active, rejected, inactive) and two roles (user, superadmin). A pending, rejected, or inactive user can still sign in and sees a status page. A superadmin activates, rejects, deactivates, promotes, and demotes accounts, never itself, and at least one active superadmin always remains.

The Better Auth admin plugin (1.7) adds `role`, `banned`, `banReason`, and `banExpires` to `user`, and `impersonatedBy` to `session`. A ban blocks sign-in and revokes every session. Its only built-in roles are `admin` and `user`, and a `superadmin` role needs custom access control. It also exposes `/admin/*` endpoints: create-user, list-users, set-role, ban, impersonate, remove-user, and set-user-password (https://better-auth.com/docs/plugins/admin, read 2026-11-07). `user.additionalFields` with `input: false` adds columns that sign-up cannot set (https://better-auth.com/docs/concepts/typescript#the-input-property).

## Decision

1. `status` and `role` are `user.additionalFields`, both `input: false`, with defaults `pending` and `user`.
2. Changing status or role is a service in `features/auth`, behind a server function that requires an active superadmin. The Better Auth admin plugin is not used.
3. A status or role change runs in one transaction that locks the actor's row and the target's row and re-checks that the actor is still an active superadmin. That keeps R20 true under concurrency (`docs/04-stack/drizzle-concurrency.md`). The mechanism is fixed in the feature spec.
4. Every request reads the status and role from the user row, so a change applies on the user's next navigation (R21). The session cookie cache stays off unless the spec shows a change still applies on the next request.

## Consequences

- No `/admin/*` endpoints exist, so there is less to secure and nothing like impersonation to audit.
- We write and test the list, filter, and change code ourselves, and the auth tests carry R20 and NFR4.
- Follow-up: `docs/04-stack/better-auth.md` rule 7 says roles are decided per feature in services. This ADR is the first use of that rule. Add a line naming the auth roles.

## Not verified

- Whether the session cookie cache is off by default in 1.7.18 (`specs/auth/02-research.md`, Q15).
- Whether Better Auth fills `defaultValue` for `input: false` fields on sign-up. Both are proven in the first task (ADR 0037).

## Alternatives considered

- **Admin plugin for roles, plus our own status field.** It gives `setRole` and `listUsers` for free. It was not chosen because the status still needs our own field, a ban does not fit "can sign in but waits", and it would expose unused admin endpoints and need a second plugin ADR.
- **Map "inactive" to a ban.** This was not chosen because a banned user cannot sign in, which contradicts R13.

## Verification

better-auth@1.7 docs: plugins/admin, concepts/typescript (via the Better Auth MCP, `latest` = 1.7), read 2026-11-07.
