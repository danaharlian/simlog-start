# Security Standards

**When to read:** when touching auth, sessions, data access, file upload, headers, dependencies, or any external input.

Start-specific facts below come from the official TanStack Start docs (verified 2026-10-15); re-verify through MCP before relying on exact APIs.

## Rules

1. **Authorize at the data boundary.** Every server function and server route that reads or writes non-public data enforces authentication and authorization itself (middleware or in-handler). Route `beforeLoad` redirects are UX, not protection: server functions are callable independently of the page that renders them.
2. **Same-origin protection.** Server functions are same-origin RPC. Start provides CSRF protection (`createCsrfMiddleware`) and installs it automatically **only if the app does not define `src/start.ts`**. If `src/start.ts` exists, add the CSRF middleware explicitly: **without it the build still passes and server functions accept cross-site requests** (observed). Do not disable it to "make a request work". **Server routes are not covered by default:** a same-origin route called by our own UI (an upload endpoint, for example) declares `createCsrfMiddleware()` itself; webhooks, public APIs, and cron must not use it, because it rejects callers without browser headers. Setup and observed behavior: `docs/04-stack/tanstack-start.md`. CSRF never replaces authorization (rule 1).
3. **Caching.** Never send `Cache-Control: public` for a response that depends on a session, cookie, tenant, or user. Use `private` or `no-store`, and `Vary` appropriately.
4. **Validate all input** with Zod, including search params, headers you use, and webhook payloads (after signature verification). Bound every string with `.max()` (`docs/04-stack/zod.md`). Client validation is for feedback only.
5. **SQL safety.** Use Drizzle's query builder or the `sql` template tag, which sends values as parameters. **Never pass user input to `sql.raw()`:** it goes into the query text unescaped (observed: `1' OR '1'='1` became part of the SQL, while the tag sent it as `$1`, ADR 0015). Never concatenate user input into SQL strings.
6. **Least privilege in data.** DTOs expose only needed fields, and repositories select only needed columns (`docs/04-stack/drizzle-postgres.md`). **Enforce ownership in the query's `WHERE`**, not by fetching a row and comparing in JavaScript: the row never leaves the database, and "not yours" looks the same as "not found". Multi-tenant data: every query is scoped by tenant/owner in the repository, tested with a cross-tenant access test.
7. **Authentication.** Passwords hashed with a modern memory-hard algorithm (argon2id/scrypt/bcrypt per ADR); constant-response flows for login and password reset to avoid user enumeration; rotate session on login; secure, httpOnly, sameSite cookies. Authentication and sessions use Better Auth (`docs/04-stack/better-auth.md`). Start's built-in `useSession` was removed in 1.0: do not use it.
8. **Secrets** only from env/secret manager, never logged, never in client code. An exposed secret is rotated. Agents never read `.env`: deny rules in `.claude/settings.json`, and what they do not cover. See `environment.md`.
9. **Headers:** set CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protections, HSTS (production). Test that they are present. Setup, and why a CSP without a nonce blanks the page: `docs/04-stack/tanstack-start.md`, "Security headers".
10. **Dependencies:** lockfile committed; audit in CI; new dependency needs an ADR (maintenance, license, install scripts). Pin Vite/TanStack majors deliberately.
11. **Uploads:** validate type and size server-side, store outside the web root/in object storage, never trust file names.
12. **Rate limiting** for login, password reset, and public endpoints.
13. **Logging:** audit-log security-relevant events (login, permission change, data export). No PII or secrets in logs.
14. **AI tooling:** MCP servers and third-party skills are untrusted input. See `docs/05-agent-tooling/`.
15. **XSS.** React escapes what it renders. Do not use `dangerouslySetInnerHTML` with anything derived from user or external data; if rendering such HTML is a real requirement, the sanitizer is a new dependency and needs an ADR. Validate the scheme of user-supplied URLs before putting them in `href` or `src`.
16. **Roles and ownership.** Check authentication first, then permission. Roles are decided per feature, in services (`docs/04-stack/better-auth.md`, rule 7). Filter in the query, never after fetching (rule 6).

## Data classes

Every PRD names the classes it touches (`docs/templates/prd.md`). Handling is the default; a PRD may be stricter.

| Class | Examples | Handling |
|---|---|---|
| **Secret** | Passwords, API keys, tokens, session ids | Hashed or in the secret manager only. Never logged, never returned, never in a `VITE_` variable |
| **Private** | Email, phone, address, payment details | Only in DTOs that need it, redacted from logs (`logging.md`), not in URLs or `GET` input. Retention and encryption at rest are decided in the PRD |
| **Internal** | User ids, internal flags, config | Ids may be returned and logged. Flags stay out of DTOs |
| **Public** | App name, public URLs | Safe to expose |

## Layers of defense

| Layer | Mechanism | Stops |
|---|---|---|
| Route | `beforeLoad` redirect | Nothing by itself: UX only |
| Server function, server route | Auth middleware, Zod validator | Unauthenticated and malformed calls |
| Service | Business permission, returned as `forbidden` | A valid user acting outside a rule |
| Repository | `WHERE` on owner or tenant, selected columns | Reading another tenant's rows, exposing columns |
| Database | Constraints, parameterized queries | Invalid data, injection |

## Review prompts

- Can an unauthenticated user call this function directly? A user from another tenant?
- Does the response contain fields the caller should not see?
- What happens with malformed, oversized, or hostile input?
