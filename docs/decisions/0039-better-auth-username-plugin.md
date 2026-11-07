# 0039 Better Auth username plugin

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect), via chat, 2026-11-08: “05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted”

## Context

ADR 0007 R limits Better Auth to email and password, and every plugin needs an ADR. The auth PRD needs sign-in with a username or an email (R7) and a required, case-insensitive, immutable username (R2).

The `username` plugin (part of `better-auth`, no extra package) adds `username` and `displayUsername` to `user`. It normalizes `username` to lower case. By default it allows 3 to 30 characters of letters, digits, `_`, and `.`. It adds `POST /sign-in/username` and `POST /is-username-available`, accepts an optional `username` on `POST /sign-up/email`, and has an `immutableUsername` option (https://better-auth.com/docs/plugins/username, read 2026-11-07).

## Decision

1. Use `username()` with its default length and character rules, `immutableUsername: true`, and `displayUsername: false`, because the PRD has no display name separate from `name`.
2. The server rejects a sign-up without a username. The plugin treats it as optional, so a client-side schema alone does not satisfy R1. How it is enforced (a Better Auth hook, or a database `NOT NULL`, or both) is fixed in the feature spec.
3. One sign-in field: a value containing `@` goes to the email endpoint, anything else to the username endpoint. The default validator never allows `@` in a username.
4. Whether `/is-username-available` stays open is a spec decision. The PRD accepted that sign-up messages reveal a taken username anyway (`04-prd.md`, Q6).

## Consequences

- The `user` table gains `username`. The column the CLI generates is nullable (`specs/auth/03-prototype.md`).
- The rate limit for `/sign-in/username` is Unknown. NFR1 needs a custom rule if there is no built-in one.

## Not verified

The plugin's own rate-limit rule, and the hook API that rejects a missing username. Both are verified in the feature spec against the installed types.

## Alternatives considered

- **Email only.** It needs no plugin, but the owner asked for usernames.
- **Our own username column and a lookup before sign-in.** It would duplicate normalization and add a second sign-in path outside Better Auth.

## Verification

better-auth@1.7 docs: plugins/username; `better-auth@1.7.18` `dist/plugins/username/index.d.mts` (unpkg). Read 2026-11-07.
