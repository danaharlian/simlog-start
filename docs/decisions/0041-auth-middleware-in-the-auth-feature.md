# 0041 Auth middleware lives in the auth feature

- Status: accepted
- Date: 2026-11-08
- Deciders: Dana Harliansyah (Software Architect), via chat, 2026-11-08: “05-architecture-review auth: approve with notes, jawaban section 9 sesuai rekomendasi, D8 pilih tsx, ADR 0038–0042 accepted”

## Context

`docs/04-stack/better-auth.md` contradicts the dependency rules:

- Rule 2 puts the one `auth` instance in `features/auth/server/auth.ts`.
- Rule 4 puts the middleware that reads the session in `shared/server/require-auth`, and `docs/05-agent-tooling/skills.md` repeats it.

`shared` may not import from `features` (`docs/02-architecture/modular-monolith.md`, dependency rules), so `shared/server/require-auth` cannot call that instance.

## Decision

1. The middleware that requires a signed-in user, an active user, and an active superadmin lives in `features/auth/server/`.
2. It is exported from `features/auth/index.server.ts` only when a second feature needs it. Today only `auth`'s own server functions use it.
3. `better-auth.md` rule 4 and the `skills.md` row are updated to name `features/auth` instead of `shared/server/require-auth`.
4. File names follow the boundary categories that `check:gates` enforces (found in `specs/auth` T1, 2026-11-08): the `betterAuth` instance is `server/auth.repository.ts`, the session reader and request handler are `server/session.service.ts`, and the middleware is `server/session.functions.ts`.

## Consequences

- No exception to the boundary rules is needed.
- Another feature's `*.functions.ts` will import `@/features/auth/index.server` for this middleware. Whether that keeps server code out of the client bundle when a component imports the functions file is Unknown. It is tested when the first such feature is built, and `tanstack-start.md` shows it holds for routes under `src/routes/api/**`.

## Not verified

The client-bundle question above.

## Alternatives considered

- **Keep `shared/server/require-auth` and inject the session reader.** A factory in `shared` would take a `getSession` function from `auth`. It keeps the file the docs name, but adds an indirection with one implementation (`design-principles.md`, YAGNI).
- **Move the `auth` instance to `shared/server`.** This would put feature tables and config in `shared`, against rule 1 of `better-auth.md`.

## Verification

Repo docs read 2026-11-07: `docs/04-stack/better-auth.md`, `docs/02-architecture/modular-monolith.md`, `docs/05-agent-tooling/skills.md`.
