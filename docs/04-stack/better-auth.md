---
applies_to: "better-auth 1.7.18 (installed, exact pin); docs: Better Auth MCP `latest` (the 1.7 line)"
last_verified: 2026-11-08
verified_against: "better-auth.com docs: integrations/tanstack, installation, adapters/drizzle, concepts/cli (via Context7 /websites/better-auth); npm registry (latest 1.7.10); reference/security and reference/options pages and a run of auth.handler on 1.7.14 (2026-10-31); integrations/tanstack through the Better Auth MCP server and `auth@1.7.15` `dist/index.mjs` (2026-11-01); installed better-auth 1.7.18 run against PostgreSQL (Prisma Postgres) in specs/auth T1: `auth@1.7.18 generate`, sign-up through `auth.handler`, `getSession`, `hooks.before` (2026-11-08); better-auth 1.7.18 origin-check, sign-in, username plugin, logger sources read and tested in specs/auth T2 (2026-11-08)"
---

# Better Auth

**When to read:** before touching sign-in/sign-up, sessions, the auth route, auth tables, auth middleware, or anything that reads the current user.

**Docs:** MCP server `better-auth` (`docs/05-agent-tooling/mcp.md`, "Better Auth MCP protocol"). **Options to consider:** the Better Auth skills, which this file overrides (`docs/05-agent-tooling/skills.md`).

## Verified facts

- TanStack Start integration page: add the `tanstackStartCookies()` plugin (from `better-auth/tanstack-start`) to the `betterAuth({ plugins: [...] })` config; it **must be the last plugin** in the array. It lets cookie-setting calls (`signInEmail`, `signUpEmail`) work with Start's cookie handling.
- The auth handler is mounted as a **server route** at `src/routes/api/auth/$.ts`.
- The docs recommend using the client SDK (`authClient`) for sign-in/out rather than calling `auth.api` from server actions.
- Drizzle adapter: `drizzleAdapter(db, { provider: 'pg' })`. **The docs disagree on the import path**: the installation page imports from `better-auth/adapters/drizzle`, while the adapters page documents a separate package `@better-auth/drizzle-adapter`. **Decided (ADR 0007, R): import from `better-auth/adapters/drizzle`.** The package `exports` of better-auth 1.7.7 (installed) and 1.7.14 (latest) both define `./adapters/drizzle` (npm metadata, 2026-10-27). The separate package `@better-auth/drizzle-adapter` (1.7.14) also exists and is not used. **Not run in an app:** check the import in the installed `node_modules` when wiring it.
- CLI schema generation: `auth generate` with `--adapter drizzle` (requires `--dialect`) writes `schema.ts` at the project root by default; use `--output` to choose the file, and `--config` for our `auth.ts` path. Run it with `pnpm dlx auth@<installed better-auth version>`: the `auth` package is released with the same version number and depends on that exact `better-auth` (`auth@1.7.15`).
- `auth migrate` refuses the Drizzle adapter and tells you to use `auth generate` (read in `auth@1.7.15`, not run).
- Start 1.0 removed its built-in `useSession`. Do not use it.
- **Observed on 1.7.18 with `drizzle-orm` 1.0.0-rc.5 (specs/auth T1, 2026-11-08):** `pnpm dlx auth@1.7.18 generate --config <auth file> --output <schema file>` resolves the `@/` alias, and loads the config, so the env module needs values (placeholders work for `generate`). With `usePlural: true` and `advanced.database.generateId: "uuid"` it writes plural tables and `uuid` ids with `gen_random_uuid()`. Its `relations()` block does not compile on Drizzle v1 (ADR 0040). Better Auth writes `user.additionalFields` strings into PostgreSQL enum columns, an `input: false` field with a `defaultValue` takes the default on sign-up whatever the body says, while one without a default (or any `input: false` field on `/update-user`) rejects a sent value with `400`, and an `APIError` thrown in `hooks.before` with `code` reaches the client as `{ code }` in the JSON body.

## Rules

1. **`auth` is a feature** (`features/auth`). It owns the auth tables (generated names; confirm after running the CLI) and exposes a small public API (`getCurrentUser`, `requireUser`, types). Other features never query auth tables.
2. **One server-side `auth` instance** in `features/auth/server/auth.repository.ts` (server-only; the repository category is the only one that may import the feature's tables, `check:gates`). One `authClient` for the browser in `features/auth/hooks/auth-client.ts` (a file at the feature root matches no boundary category). ADR 0041.
3. **Mount the handler as a server route** (`src/routes/api/auth/$.ts`) that only forwards to `auth.handler`. No logic there.
4. **Server functions get the user from the auth feature's middleware** (`features/auth/server/session.functions.ts`, which calls `session.service.ts`) that reads the session from the request headers; `shared` cannot import the `auth` instance (ADR 0041). Verify the exact `auth.api.getSession` call and header handling in the docs before writing it. Route `beforeLoad` redirects are UX only (`docs/03-standards/security.md`).
5. **Schema flow:** run the CLI → review output → place it in `features/auth/db/schema.ts` → `drizzle-kit generate` → review SQL (`add-db-table` skill). Only the edits ADR 0040 and ADR 0043 allow (no relations block; `timestamptz`, `database.md` index names, enums, `NOT NULL`), each listed in `features/auth/README.md`. On a Better Auth upgrade, regenerate and compare against that list.
6. **Secrets and URLs** go through the env module (`docs/03-standards/environment.md`). The docs name `BETTER_AUTH_SECRET` (at least 32 characters; `openssl rand -base64 32`) and `BETTER_AUTH_URL` (read 2026-10-31 through Context7, whose index stops at 1.6.x: confirm on the installed version when wiring).
7. **Authorization is separate from authentication.** Roles and permissions are decided per feature in services. Scope is **email and password only** (ADR 0007, R). Social login and the organizations, roles, and 2FA plugins each need an ADR before use. Their skills are installed so the path is easy to find (`docs/05-agent-tooling/skills.md`); an installed skill does not adopt a plugin.
8. **Security-critical dependency:** pin the version, read the changelog before upgrading, and upgrade through a branch with the auth tests passing. Do not write custom password hashing, session tokens, or cookie code.
9. **Cross-site protection on the auth route comes from Better Auth, not from Start.** Start's CSRF middleware with the documented `serverFn` filter does not cover this server route (`docs/04-stack/tanstack-start.md`); do not add it there. Better Auth checks origin and Fetch Metadata itself (security reference, read 2026-10-31). **Checked on 1.7.14 by calling `auth.handler` with crafted headers (memory adapter):** sign-in returned 403 for a foreign `Origin`, `Origin: null`, cross-site Fetch Metadata, and a cross-site navigation; 200 with the same origin and with no headers (documented, for server-to-server clients). Sign-out with a cookie returned 403 for a foreign or missing `Origin`. Session cookie: `HttpOnly`, `SameSite=Lax`. Not checked: a real browser, through the Start route, or form-encoded requests.
   - `baseURL` must equal the public origin, or real logins are rejected. Keep `trustedOrigins` minimal, with no `localhost` in production.
   - **Never set `advanced.disableCSRFCheck`. Set `advanced.disableOriginCheck` only to `false`** (ADR 0046): `true` also turns CSRF protection off, and leaving it unset turns the origin check off whenever `NODE_ENV` is `test`.
   - **`/sign-in/username` has no CSRF middleware in 1.7.18** (the email path has `formCsrfMiddleware`). `features/auth` runs `formCsrfMiddleware` on it from `hooks.before` (ADR 0046). Re-check on every upgrade.
   - Keep the table above as an integration test against `/api/auth/*`, and re-run it on every Better Auth upgrade.
   - **Under Vitest:** Better Auth 1.7.18 sets `skipOriginCheck` to `true` when `NODE_ENV` is `test` unless `advanced.disableOriginCheck` is set; with `false` (ADR 0046) the table above runs in `features/auth/__tests__/sign-in.test.ts`.
10. **Logs:** Better Auth's `logger.log` receives the raw driver error as extra arguments, and its `detail` can hold an email; below `warn`, some messages hold the email in the text. Route it to pino with the level and message only, and set its level to `warn` explicitly (ADR 0046).
11. Test: sign-up, sign-in, sign-out, session expiry, unauthenticated access to every protected server function, and cross-tenant access.

## Pitfalls

- Placing `tanstackStartCookies()` anywhere but last.
- Importing the Drizzle adapter from the wrong path for the installed version.
- Using Context7 results for 1.6.x APIs on a 1.7.x install without cross-checking.
- Copying a Better Auth skill's command or sample: they use `npx`, `drizzle-kit push`, and `process.env` (`docs/05-agent-tooling/skills.md`).
- Letting UI code read the session directly and skipping server-side checks.

## Verify before use

Adapter import path, `getSession` signature, required env variable names, session/cookie options, rate-limit options, plugin list and ordering.
