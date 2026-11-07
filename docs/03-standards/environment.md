# Environment and Configuration

**When to read:** when adding, reading, or documenting any environment variable or runtime config, or setting up a database for an environment.

Checked on 2026-10-31 on a production build (Start 1.169.4, Vite 8.3.5, Zod 4.6.7) in Chromium (ADR 0015). The dev server was not checked. Variables table, one env file, databases per environment, `drizzle.config.ts`, and agent deny rules: ADR 0033.

## Variables

Every variable the app or its tooling reads. Update this table in the same PR as the schema and `.env.example`.

| Variable | Required | Read by | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `serverEnv` (`shared/db/client.ts`), `drizzle.config.ts` | PostgreSQL URL. The dev database locally; the staging or production database on the host |
| `TEST_DATABASE_URL` | for integration tests and `db:migrate:test` | `drizzle.config.ts` with `DB_TARGET=test`; `vitest.config.ts`, which copies it into `DATABASE_URL` for tests and refuses the dev URL (ADR 0044) | The test database only, never the dev or production one. Not in `serverEnv`: the app does not read it |
| `DB_TARGET` | no | `drizzle.config.ts` | Unset, or `test`. Set by a script or the shell, never in `.env` |
| `BETTER_AUTH_SECRET` | yes | `serverEnv` (Better Auth) | At least 32 characters (`better-auth.md`, rule 6) |
| `BETTER_AUTH_URL` | yes | `serverEnv` (Better Auth) | The public origin (`http://localhost:3000` in dev) |
| `LOG_LEVEL` | no, default `info` | `serverEnv` (`logger.server.ts`) | `fatal` `error` `warn` `info` `debug` `trace` `silent` (pino 10 docs). `silent` turns logging off |
## Rules

1. **Single source:** all env vars are declared in `.env.example` (names + safe example values + comment) and parsed by the env modules in `shared/config/`. Variables read only by tooling outside the app (`TEST_DATABASE_URL`, `DB_TARGET`) are not in the schemas; the table above documents them.
2. **Two modules, because they have different readers:**
   - `shared/config/env.server.ts` exports `serverEnv`. Its `.server.` name makes a client import **fail the build** (observed: "Import denied in client environment").
   - `shared/config/env.ts` exports `clientEnv`, `isDev`, and `isProd`, and holds only `VITE_` variables and Vite's built-in flags.
3. **Never read `process.env` or `import.meta.env` directly** outside those modules. Exception: tool config that runs outside the app (`drizzle.config.ts`). **Lint rejects `process.env` elsewhere under `src/`** (`eslint.code-rules.js`, ADR 0021). `import.meta.env` has no rule, so review checks it.
4. **`VITE_` means public.** Only `VITE_` variables reach client code, and their values are written into the bundle at build time (Vite docs; observed). Never put a secret under that prefix. Unprefixed variables are `undefined` in client code (observed), and a database password did not appear in `dist/client`.
5. **No secrets in the repo, logs, error messages, or client bundle.** Secrets come from the platform secret manager in deployed environments. **A secret that was exposed is rotated, not just deleted:** pasted in an issue, chat, PR, or doc, logged, or committed (even on a branch). A real secret lives only in the secret store and in your own `.env`.
6. **Environments:** `local`, `test`, `staging`, `production`. Config differences are env vars, not code branches on `NODE_ENV`. **A dev-only or production-only branch reads `isDev` or `isProd`** from `env.ts`, never `process.env.NODE_ENV`.
7. **`.env` and `.env.*` are git-ignored; only `.env.example` is committed,** and it is updated in the same PR that introduces a variable. The Start guide says `.env` may be committed; we do not, so a secret cannot get in by accident. Check that the app's `.gitignore` covers them.
8. **Defaults** are allowed only for non-sensitive, safe values. A missing secret is an error, never a default.
9. **One env file: `.env`.** Do not create `.env.local` or `.env.[mode]`. Vite would read them (table below), but `drizzle.config.ts` loads only `.env`, so a value placed elsewhere reaches the app and not `drizzle-kit`, and migrations run against a different database than the app.

## Agents and `.env`

Agents never read `.env`. The installer merges `Read` deny rules into the app's `.claude/settings.json` (`docs/examples/claude-settings.hooks.json`) for `.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, and `.env.test`. Not `Read(./.env.*)`, the docs' own example: it would also block `.env.example`, which agents edit.

Per the Claude Code permissions docs (read 2026-11-06, not run), they **cover** the file tools, the Bash file commands Claude Code recognizes (`cat`, `head`, `tail`, `sed`, `tee`), and redirections, and a user or local `allow` cannot reopen them (deny is evaluated first). They **do not cover** `grep -r` run from the folder, or a script that opens the file itself; only the sandbox would, and it is not set up. So a person, not an agent, fills in `.env`.

## Where values come from

| Target | Source | When it is read |
|---|---|---|
| `VITE_*` in client code | `.env` files or the shell, at **build** time | Fixed in the bundle. **Changing one needs a rebuild** |
| Server variables in the built app | The **process environment** only | At runtime |
| `drizzle-kit` (migrations, Drizzle MCP) | The shell, then `.env` through `drizzle.config.ts` | Each command |

**The built server does not read `.env` files (observed):** with `.env` present in the working directory and nothing in the shell, `process.env` had none of its values. The container must receive its variables from the platform.

`.env` file order at build time, highest first (observed by removing one file at a time). A variable already set in the shell beats all of them (Vite docs; not run). We use only `.env` (rule 9); the table says what happens if another file appears. The Start guide's short list reads as if later files override earlier ones and omits `.env.[mode].local`; this table follows the Vite docs and the build result.

| File | Purpose |
|---|---|
| `.env.[mode].local` | Local override for one mode |
| `.env.[mode]` | Values for one mode (`production`, `development`) |
| `.env.local` | Local override for every mode |
| `.env` | Defaults for every mode |

## Databases per environment

Each environment has its own PostgreSQL database; no two share one.

| Environment | Database | URL comes from | Migrations applied with |
|---|---|---|---|
| Local | dev | `DATABASE_URL` in `.env` | `pnpm db:migrate` |
| Test (local and CI) | test | `TEST_DATABASE_URL` in `.env`, or the CI secret store | `pnpm db:migrate:test` |
| Staging | staging | `DATABASE_URL` on the host | `pnpm db:migrate` with the staging URL set in the shell |
| Production | production | `DATABASE_URL` on the host | `pnpm db:migrate` with the production URL set in the shell, before deploying the code that needs it (`templates/release-checklist.md`) |

- **Production data never goes into dev or test.** Test data comes from the tests themselves or a seed (decision AB).
- Integration and E2E tests touch the test database only; unit tests touch none (`testing.md`). How a test gets `TEST_DATABASE_URL`, while lint rejects `process.env` under `src/`, is decision AH. `drizzle.config.ts` refuses a `TEST_DATABASE_URL` equal to `DATABASE_URL`.

## `drizzle.config.ts`

`drizzle-kit` does not load `.env` itself: the Drizzle docs load it with `dotenv`. Node's built-in `process.loadEnvFile` does the same with no new dependency.

```ts
// drizzle.config.ts
import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// A variable already set in the shell wins over .env. CI and the host have no .env.
if (existsSync('.env')) process.loadEnvFile('.env')

const target = process.env.DB_TARGET
if (target !== undefined && target !== 'test') throw new Error(`DB_TARGET must be unset or "test", got "${target}"`)
const url = target === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
if (!url) throw new Error(`drizzle.config.ts: no database URL (DB_TARGET=${target ?? 'unset'})`)
if (target === 'test' && url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must not be the DATABASE_URL database')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/features/*/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
})
```

Scripts (`versions.md`, action item 6): `"db:migrate:test": "DB_TARGET=test drizzle-kit migrate"` beside `db:generate` and `db:migrate`. Observed on Node 24.22.1 with this logic, without `drizzle-kit`: a shell variable wins over `.env`, even an empty one; an unknown `DB_TARGET`, a missing URL, and a test URL equal to the dev URL each throw; with no `.env`, the shell value is used. `process.loadEnvFile` throws `ENOENT` for a missing file, hence `existsSync`; it is typed in `@types/node` 22 (since Node 20.12) and not deprecated. **Not run:** the file under `drizzle-kit` and `tsc`, and the inline `DB_TARGET=test` on Windows, where pnpm runs scripts through `cmd`.

## Naming

| Rule | Example |
|---|---|
| `UPPER_SNAKE_CASE`, grouped by prefix | `DATABASE_URL`, `SMTP_HOST` |
| Prefix with the service that owns it. A library that reads its own names dictates them | `BETTER_AUTH_SECRET`, `TEST_DATABASE_URL` |
| URLs end in `_URL` | `BETTER_AUTH_URL` |
| Credentials end in `_SECRET` or `_KEY` | `BETTER_AUTH_SECRET` |
| Boolean flags start with `ENABLE_` and are parsed with `z.stringbool()`, never `z.coerce.boolean()` (`"false"` becomes `true`: `zod.md`) | `ENABLE_SIGNUP` |
| Client variables start with `VITE_` | `VITE_APP_NAME` |

## The env modules

```ts
// shared/config/env.server.ts
import { z } from 'zod'

const BETTER_AUTH_SECRET_MIN_LENGTH = 32

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(BETTER_AUTH_SECRET_MIN_LENGTH),
  BETTER_AUTH_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export const serverEnv = serverEnvSchema.parse(process.env)
```

```ts
// shared/config/env.ts
import { z } from 'zod'

const clientEnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1),
})

export const clientEnv = clientEnvSchema.parse(import.meta.env)

// Vite replaces both at build time (Vite docs, "Env Variables and Modes").
export const isDev = import.meta.env.DEV
export const isProd = import.meta.env.PROD
```

A failed parse did not print the rejected values, only the variable and the rule (observed). **Not checked:** whether the build drops an `if (isDev)` branch reached through this export, as the Vite docs say it does for `import.meta.env.DEV` written in place. Do not rely on it to keep dev-only code out of a bundle. **Module-scope parse is for Node only.** The Start docs say a module-level `process.env` read is fine on Node, and is `undefined` on edge runtimes such as Cloudflare Workers, where env arrives per request (read 2026-11-06, latest docs). We run a Node container (ADR 0007). Moving to an edge runtime means replacing `serverEnv` with a function called inside handlers and middleware.

## When a bad value is detected

**Parsing on import does not mean failing at startup.** The module loads when something first needs it. With a missing variable, the server started and the page answered 200 while its server function answered 500 (observed), so a bad deployment can look healthy. Make every request fail instead, with a dynamic import in the global middleware. A static import in `src/start.ts` would put the file in the client build, which rule 2 rejects.

```ts
// src/start.ts: add to requestMiddleware
const envCheck = createMiddleware().server(async ({ next }) => {
  await import('@/shared/config/env.server')
  return next()
})
```

Observed: 500 on the page with a bad env, normal with a good one, and no variable names in `dist/client`. **This is still at the first request, not at startup.** A check before the container accepts traffic belongs to the hosting setup, which is not written yet (`docs/04-stack/tanstack-start.md`, rule 11). Add a smoke test on a real page and a server function to the release checklist.

## `.env.example`

```bash
# Application
VITE_APP_NAME="My App"
LOG_LEVEL="info"                # fatal | error | warn | info | debug | trace | silent

# Database: a separate database per environment (environment.md)
DATABASE_URL="postgresql://user:password@localhost:5432/app_dev"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/app_test"   # never the dev database

# Authentication (docs/04-stack/better-auth.md)
BETTER_AUTH_SECRET=""           # at least 32 characters: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"   # the public origin
```

Add variables as features need them; do not pre-declare unused ones. Never put a real credential in this file.

## Checklist when adding a variable

- [ ] Added to `.env.example` with a comment saying how to obtain or generate the value
- [ ] Added to the right schema: `env.server.ts`, or `env.ts` if it is safe for anyone to read. A tooling-only variable goes in no schema
- [ ] A row in the Variables table above, and in the owning feature's `README.md` if feature-specific
- [ ] The person running the app sets it in their `.env` (an agent cannot read or fill it); the PR says so
- [ ] Set in the staging and production secret stores **before** deploying the code that needs it (note in the PR)
- [ ] For a `VITE_` variable: the value is safe to publish, and the build that ships it has the value

## Setup on a new machine

Once the `db:*` scripts and `drizzle.config.ts` exist (`versions.md`, action item 6):

```bash
pnpm install
cp .env.example .env     # a person fills in the dev and test database URLs and the secrets
pnpm db:migrate          # dev database
pnpm db:migrate:test     # test database, for integration tests
pnpm dev
```
