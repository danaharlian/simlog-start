# 0033 Environment comparison: variables table, one env file, databases per environment, agent deny rules

- Status: accepted (open decision AH remains)
- Date: 2026-11-06
- Deciders: the owner supplied a reference `environment.md` and approved the agent's recommendation to adopt items 1 to 6 below; `sslmode` was left to the owner
- Extends: ADR 0015, ADR 0028, ADR 0029

## Context

The owner supplied an `environment.md` from another TanStack Start project (`src/lib/env.server.ts`, a lazy `getServerEnv()`, a test database, `process.loadEnvFile` in `drizzle.config.ts`). Our `environment.md` already had more checked facts (two modules, the build-time file order, the env check in request middleware). The reference showed these gaps:

1. No single list of the variables: they were spread between a schema snippet and `.env.example`.
2. `testing.md` requires a test database, but no variable, migration script, or database choice in `drizzle.config.ts` existed, and the `drizzle.config.ts` snippet never said where `url` comes from.
3. We documented four `.env` files Vite reads, with no rule on which to use. `drizzle-kit` does not read any of them by itself.
4. `.gitignore` keeps `.env` out of commits, but nothing kept an agent from reading it.
5. Rule 6 forbade `NODE_ENV` branches without naming the replacement.
6. `LOG_LEVEL` allowed four of pino's seven levels; secret rotation and the naming rule for library-owned prefixes were not written down.

Facts checked on 2026-11-06:

- **`process.loadEnvFile`** (Node 24.22.1, run in a scratch folder): a variable already in the shell wins over `.env`, even an empty one; `.env.local` is not read; a missing file throws `ENOENT`. Typed in `@types/node` 22.20.5 as `loadEnvFile(path?: PathLike): void`, `@since v20.12.0`, not deprecated.
- **The `drizzle.config.ts` selection logic**, run as plain Node with the same code minus `defineConfig`: default uses `DATABASE_URL`; `DB_TARGET=test` uses `TEST_DATABASE_URL`; an unknown target, a missing URL, and a test URL equal to `DATABASE_URL` each throw; with no `.env`, a shell value is used.
- **`drizzle-kit` does not load `.env`:** the Drizzle docs' config examples import `dotenv`. The docs also show `--config` for several config files.
- **Claude Code deny rules** (code.claude.com permissions and settings pages): `Read` deny rules cover the file tools, recognized Bash file commands (`cat`, `head`, `tail`, `sed`, `tee`), and redirections; not a script that opens the file itself, nor `grep -r` from the folder. Deny is evaluated before ask and allow, so a lower-scope allow cannot reopen it. The docs' example `Read(./.env.*)` would also match `.env.example`.
- **pino** (docs for 10.3.1; 10.4.0 installed): `level` accepts `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`.
- **Vite** replaces `import.meta.env.DEV` and `PROD` statically at build (docs, "Env Variables and Modes", and `define.ts`).
- **TanStack Start** (latest docs): module-level `process.env` reads are "fine for Node.js" and `undefined` on edge runtimes such as Cloudflare Workers.

## Decision

### Adopted or adapted

| From the reference | Adapted to | Now in |
|---|---|---|
| Variables table | Our names and modules; tooling-only variables included | `environment.md`, "Variables" |
| `TEST_DATABASE_URL`, databases per environment, `db:migrate:test` | Staging added; `DB_TARGET` unset means `DATABASE_URL`, not "dev", because production migrations use the same path; a test URL equal to the dev URL is refused | `environment.md`, `testing.md`, `versions.md`, `AGENTS.md` |
| One file, `.env`; `process.loadEnvFile` in `drizzle.config.ts` | `existsSync` guard, because CI and the host have no `.env` | `environment.md`, `drizzle-postgres.md`, `mcp.md` |
| "Agents must never read `.env`" | Deny rules merged by the installer, with what they do not cover stated; `.env.example` left readable | `docs/examples/claude-settings.hooks.json`, `install.mjs`, `scripts/test-gates.mjs`, `environment.md`, `security.md`, `AGENTS.md` |
| `import.meta.env.DEV` / `PROD` instead of `NODE_ENV` | Exported as `isDev` and `isProd` from `env.ts`, because `import.meta.env` is read only there | `environment.md` |
| Full pino level list; named constant for the secret length; rotate exposed secrets; library-owned prefixes; setup on a new machine; set the host value before deploying | Our modules and checklist | `environment.md`, `security.md` |

### Not adopted

| From the reference | Why |
|---|---|
| Lazy `getServerEnv()` as a rule | Start's docs say a module-level parse is fine on Node, and we run a Node container (ADR 0007). Recorded as the change to make on an edge runtime |
| `sslmode=verify-full` enforced by the schema | A local PostgreSQL usually has no TLS. Left to the owner |
| `src/lib/env.server.ts`, `../tech/` links | Our paths are `shared/config/` and `docs/04-stack/` |
| `pnpm dlx auth@<version> secret` | `openssl rand -base64 32` needs no package |
| Temporary probes that read `TEST_DATABASE_URL` themselves | Lint rejects `process.env` under `src/`. Decision AH instead |

## Consequences

- **Installer:** `mergeSettings` now also merges `permissions.deny`, keeps the app's own rules, and adds nothing on a second run (new test in `test-gates.mjs`). The example file keeps its name, `claude-settings.hooks.json`, though it now holds permissions too; renaming it would touch the installer and the docs for no gain.
- **No gate weakened.** The deny rules add a guard; no lint, TypeScript, or check script changed.
- **New open decision AH:** how a test reaches the test database. Until it is decided, integration tests have a database but no approved way to point at it.
- **Risk: a mode file appears anyway.** Vite would read it, `drizzle-kit` would not. Rule 9 forbids it, the deny rules cover the usual names, and nothing checks for the file.
- **Risk: a script reads `.env`.** The deny rules do not stop it; only the sandbox would. `AGENTS.md` states the rule for that case.
- `db:migrate:test` uses an inline variable, which needs a POSIX shell.

## Not verified

- `drizzle.config.ts` under `drizzle-kit` 1.0.0-rc.5 and `tsc`: no app with `drizzle-kit` was available; only its selection logic ran.
- `DB_TARGET=test drizzle-kit migrate` on Windows, where pnpm runs scripts through `cmd` unless configured otherwise.
- The deny rules in a live Claude Code session: read from the docs, not run. Parts of the permissions page came through a summary; the deny-before-allow order and the list of covered Bash commands were quoted from the page.
- Whether the build removes an `if (isDev)` branch reached through an exported constant.
- The Start statement about module-level reads comes from the latest docs, not a page tied to 1.169.4.

## Alternatives considered

- **A second config file with `drizzle-kit --config`** (documented by Drizzle): works on every shell, but repeats `schema` and `out` in two files that can drift. `DB_TARGET` keeps one file.
- **`Read(./.env.*)`**, the docs' example: shorter, but blocks `.env.example`, which agents edit.
- **Rules in docs only, no installer change:** a rule an agent can break without noticing. The deny rules make the usual way fail.
- **Keep the four-file table as guidance:** leaves the app and `drizzle-kit` able to read different databases.

## Verification

Docs consulted (2026-11-06): `@tanstack/react-start`: environment-variables and execution-model guides (Context7 `/websites/tanstack_start_framework_react`). `drizzle-kit`: config file and migrate pages (Context7 `/websites/orm_drizzle_team`). `pino` 10.3.1: `docs/api.md` (Context7 `/pinojs/pino/v10.3.1`). `vite`: `docs/guide/env-and-mode.md`, `packages/vite/src/node/plugins/define.ts` (Context7 `/vitejs/vite`). Claude Code: code.claude.com/docs/en/permissions, /settings, /settings-reference. Node 24.22.1: `process.loadEnvFile`, run. `@types/node` 22.20.5: `process.d.ts`.
