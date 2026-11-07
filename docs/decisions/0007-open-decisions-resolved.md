# 0007 Resolved open decisions (hosting, database, query defaults, tooling, auth)

- Status: accepted (rows Q and Drizzle superseded by ADR 0008; row V by ADR 0013)
- Date: 2026-10-27
- Deciders: owner (answers given 2026-10-26)

## Context

`docs/decisions/README.md` listed open decisions that blocked templates and stack docs. The owner answered; each answer was checked against the registry or the installed package where a check was possible. Evidence is labeled **Verified** (checked on the stated date) or **Inferred**.

## Decision

| # | Decision | Chosen | Evidence and limits |
|---|---|---|---|
| F | Hosting runtime | **Node in a container** | Owner choice. Which Start/Nitro preset and which container platform: **TODO(verify)** in `tanstack-start.md`; deploy steps stay unwritten. |
| G | `pg` pool | **Set pool options explicitly**: `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` | **Verified** (node-postgres docs, 2026-10-26): defaults are `max` 10, idle 10 s, connection timeout 0 (wait forever). Starting values `max` 10 and a 5000 ms connection timeout are proposals. `max` times the container count must stay below the Postgres connection limit. |
| H | Primary key | **`uuid` with `defaultRandom()`** | **Verified**: `defaultRandom()` exists on the pg `uuid` column in drizzle-orm 0.45.4 types. |
| K | Query defaults | **`staleTime` 30 s** on the client; library `retry` defaults kept | 30 s is the value in the Start guide. Retries apply only to thrown errors (ADR 0006). |
| L | `routeTree.gen.ts` | **Commit it** | Router FAQ says to commit it (checked 2026-10-26). The file stays excluded from lint by `ignores`, never by comments. |
| N | TanStack Intent, CLI MCP, shadcn MCP | **Not adopted** | Alpha tooling. Revisit with an ADR. |
| O | Vitest | **5.0.5** (`vitest` latest 2026-10-26) | Peer range includes Vite 8 (**Verified** from npm metadata 2026-10-18). Not run in the app: run `pnpm test` after the upgrade. |
| P | TypeScript | **Stay on `~6.0.x`** | typescript-eslint 8.72.0 requires TypeScript below 6.1.0; only 6.0.2 and 6.0.3 exist (**Verified**, npm). |
| Q | React Table | ~~Stay on v8~~ **superseded by ADR 0008: v9** | The owner's package.json uses `^9.3.1`. |
| R | Better Auth scope | **Email and password only** | Plugins (organizations, 2FA, social) need an ADR. Drizzle adapter import: `better-auth/adapters/drizzle` (**Verified**: exported by 1.7.7 and 1.7.13; a separate package `@better-auth/drizzle-adapter` 1.7.14 also exists; not run). |
| V | Pure business rules | ~~Stay in `*.service.ts`~~ **superseded by ADR 0013: optional linted `*.rules.ts`** | No `domain/` folder still holds. |
| W | Accessibility level | **Each PRD sets its own** | No repo default and no checker installed. |
| T, U | Code style and error codes | see ADR 0006 | |
| Drizzle | Versions | ~~0.45.4 / 0.31.11 (stable)~~ **superseded by ADR 0008: 1.0.0-rc.5** | Stable numbers were Verified on npm, 2026-10-26; the owner's package.json uses the RC. |

Still open: **S** (placement of adapters for external services) and **X** (performance budgets and measurement).

## Consequences

- `versions.md` action items become concrete (see that file); package.json changes happen in the app, not here, and were not run.
- Docs updated with this ADR: `decisions/README.md`, `versions.md`, `drizzle-postgres.md`, `better-auth.md`, `tanstack-start.md`, `git-and-commits.md`, `testing.md`, `tanstack-table.md`, `mcp.md`, `skills.md`, `sdlc-pipeline.md`, templates, skills.
- Any of these can be reversed by a new ADR that supersedes this row.

## Alternatives considered

Each row had the options listed in the former open-decisions table (for example Cloudflare or Vercel for F, identity keys for H, v9 for Q, social login and organizations for R).

## Verification

npm registry metadata queried 2026-10-26 (vitest, typescript, typescript-eslint, drizzle-orm, drizzle-kit, better-auth, @better-auth/drizzle-adapter); node-postgres pool documentation; TanStack Router FAQ; drizzle-orm 0.45.4 installed in a scratch project.
