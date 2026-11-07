---
applies_to: "Agent skills in this repo and in dependencies"
last_verified: 2026-11-01
verified_against: "TanStack Intent site and TanStack AI agent-skills page (alpha); skills CLI 1.7.4 --help and shadcn-ui/ui skills/shadcn at 24a1642; orm.drizzle.team/docs/drizzle-kit-skills, the skill shipped in drizzle-kit 1.0.0-rc.5, and pnpm 12.16.1 `permissions`, all run on 2026-11-01; better-auth.com/docs/ai-resources/skills, better-auth/skills at 20c9e88, and `auth@1.7.15` `dist/index.mjs`, read on 2026-11-01"
---

# Skills

**When to read:** when creating, editing, or installing a skill, or when deciding between a doc, a skill, and an MCP call.

## Doc vs skill vs MCP

| Need | Use |
|---|---|
| A rule or decision that is always true for this project | A doc in `docs/` |
| A repeatable **procedure** with steps and a checklist | A skill |
| Current facts about a third-party library | MCP / official docs (never copied into docs or skills) |

## Skills in this repo (`.claude/skills/<name>/SKILL.md`)

| Skill | Pipeline phase | Purpose |
|---|---|---|
| `run-pipeline` | all | Read the `Status:` lines in `specs/<slug>/`, pick the next phase, run its skill, stop at gates; never approves |
| `verify-library-docs` | all | Verify an API against installed version and official docs; produce `Docs consulted` |
| `write-idea` | 1 | Capture the problem, choose the tier (tier S: the issue) |
| `write-research` | 2 | Answer the unknowns against the installed stack; name any hypothesis for a prototype |
| `write-prototype` | 3 | Test one risky hypothesis on a throwaway branch; flow and layout for a UI |
| `write-prd` | 4 | Draft a PRD from `templates/prd.md` |
| `write-architecture-review` | 5 (tier L) | Ownership, boundaries, public API, data impact, security |
| `write-feature-spec` | 6 | Draft the feature spec with every AC mapped to a test |
| `write-tasks` | 7 | Vertical tasks, riskiest first, with a coverage check |
| `build-task` | 8 | One task, one PR: tests first, gates, review, PR template |
| `new-feature` | 8 | Scaffold a feature module that follows the architecture |
| `add-server-function` | 8 | Add a validated, authorized server function end to end |
| `add-server-route` | 8 | Add a webhook, cron, or public endpoint: own authentication, CSRF decision, response helpers |
| `add-route` | 8 | Add a thin page route to an existing feature |
| `add-db-table` | 8 | Add a table and migration safely |
| `drizzle` | 8 | Third-party (below): `drizzle-kit` responses, hints, errors, and the migrations folder. Used with `add-db-table` and `database.md` |
| `add-ui-component` | 8 | Add a shadcn primitive to `shared/ui` with the installed CLI, review it, compose instead of fork |
| `shadcn` | 8 | Third-party (below): which primitive and how to compose it. Used with `add-ui-component` and `components.md` |
| `better-auth-best-practices` | 8 | Third-party (below): Better Auth config, sessions, and gotchas. Used with `better-auth.md` |
| `email-and-password-best-practices` | 8 | Third-party (below): verification, password reset, and password policy options |
| `better-auth-security-best-practices` | 6, 8, 10 | Third-party (below): rate limits, origins, cookies, and a release reminder. Used with `security.md` |
| `create-auth` | 2, 6 | Third-party (below), reference only: sign-in methods, OAuth providers, and plugins to choose from. Never its own procedure |
| `two-factor-authentication-best-practices` | 2, 6, 8 | Third-party (below): 2FA. Not adopted: build only after its ADR |
| `organization-best-practices` | 2, 6, 8 | Third-party (below): organizations and teams. Not adopted: build only after its ADR |
| `change-dependency` | 8 | Add, upgrade, or remove a package: approval first, pinned install, stack doc re-checked, `versions.md` and ADR |
| `add-tests` | 8 (tier S) | Add tests to code that already exists, in priority order |
| `fix-bug` | 8 (tier S) | Reproduce, find the cause, failing regression test first, smallest fix, gates |
| `refactor` | 8 (tier S) | Change structure, not behavior: tests pass unchanged before and after |
| `code-review` | 8 (before each PR gate) | Review a diff against standards and architecture |
| `run-qa` | 9 | Result per AC on staging, with evidence |
| `prepare-release` | 10 | Release checklist and rollback plan (a human deploys) |
| `close-out` | 11 | Mistakes become guardrails; close-out checklist |
| `measure-feature` | 12 | PRD metric against target; Unknown without data |

## Which skill to start with

These resolve overlapping triggers, so the same request follows the same path. When a task grows past its row, go back to `run-pipeline` and re-check the tier.

| The task is… | Start with | Then |
|---|---|---|
| Continuing a feature, or "what's next" | `run-pipeline` | The phase's skill |
| New behavior, or anything with a risk trigger | `write-idea` | The pipeline, by tier |
| A defect with no risk trigger | `fix-bug` | `code-review` |
| A defect whose fix needs a migration, a contract change, or auth changes | `write-idea` (tier M or L) | The pipeline |
| One task of an approved plan | `build-task` | `new-feature`, `add-server-function`, `add-db-table`, `add-ui-component` as needed |
| A review of someone's diff | `code-review`, in a fresh context | |
| A question about a library API | `verify-library-docs` | |
| A schema change | `add-db-table` | `drizzle` for `missing_hints` and errors |
| A `drizzle-kit` error or a broken migrations folder, with no schema change | `drizzle` | Stop and ask before deleting a migration or running `fix_conflicts` |
| A new sign-in flow, or a change to sessions or the auth config | `write-idea` (auth is never tier S) | The pipeline; `better-auth.md` and the Better Auth skills in spec and build |
| A Better Auth plugin or sign-in method beyond email and password: 2FA, OAuth, organizations, and others | `write-idea` (tier L) | Research with its skill below and MCP server `better-auth`; an ADR; then the pipeline |
| A question about a Better Auth option | `verify-library-docs` | MCP server `better-auth` (`mcp.md`); `better-auth-best-practices` for where to look |
| A copy or small UI tweak | `add-ui-component` if a primitive is missing, otherwise `shadcn` | Tier S issue and PR |
| A feature component built from existing primitives | `shadcn` | `docs/03-standards/components.md`; MCP server `shadcn` to find a component (`mcp.md`) |
| A new page in an existing feature | `add-route` | `add-server-function` for its data |
| A webhook, cron, or public endpoint | `add-server-route` | The pipeline if it is a new integration (tier L) |
| A restructure with no change in behavior | `refactor` | `code-review` |
| Tests for existing code, with no behavior change | `add-tests` | `code-review` |
| Documentation only | No skill | `node scripts/check-docs.mjs` |

## What to say to start

A skill description decides when it triggers, so these sentences are enough. No role-play preamble is needed, and no prompt catalog is kept: it would be a second copy of the skills.

| You want | Say |
|---|---|
| Start something new | "New feature: <the problem, who has it>" |
| Continue | "Continue <slug>" or "What's next on <slug>?" |
| A small change | "Tier S: <the change>" |
| A review | "Review this branch" (in a new session) |
| Approve | Team: set `Status: approved` and `Approved by:` with your role in the file (`docs/01-workflow/roles.md`), or approve the PR. Personal: name the artifact and the verdict, for example "approve 04-prd.md"; the message is quoted in the Gate review (`docs/01-workflow/sdlc-pipeline.md`, section 4) |

## Skill anatomy

```
.claude/skills/<name>/SKILL.md
---
name: <name>            # must equal the folder name
description: <when to use it, one or two sentences; this decides when it triggers>
---
# Title
Steps, checklists, output format. Link to docs; do not copy them.
```

Authoring rules: one job per skill; ≤ 150 lines; reference `docs/` and templates instead of duplicating; state the expected output; end with a verification step. `scripts/check-docs.mjs` validates name/description.

## Skills shipped by dependencies: TanStack Intent (alpha)

TanStack Intent lets packages ship versioned agent skills inside the npm package, discovered from `node_modules`, so guidance updates with the package version. Per its site: discovery scans static skill files without executing package code, and an **allowlist** decides which packages may contribute guidance. The install command (`npx @tanstack/intent@latest install`, per the TanStack AI docs) writes an `intent-skills` block that points agents at `node_modules/.../SKILL.md` files.

Policy:
1. It is **alpha** and **not adopted** (ADR 0007, N): evaluate on a branch; adopt only via ADR.
2. If adopted, review the generated `intent-skills` block and the allowlist in a PR; allow only TanStack packages we use.
3. Dependency-shipped skills are **lower priority than** this repo's rules for architecture and standards, but **higher than memory** for that package's API. Conflicts: stop and ask.
4. Third-party skills from public registries are untrusted and frequently outdated (several indexed TanStack Start skills still describe the RC). Never install one without reading it fully and checking its `last-verified` date against the installed version.

## Third-party skill in use: `shadcn`

Installed from `shadcn-ui/ui`, read in full first (ADR 0024). The other skill in that repo, `migrate-radix-to-base`, is not installed because we have no Radix code. `tailwind-shadcn.md`, "Skill composition", says how it combines with our rules and which of them win.

- **To update**, in this repo only: `pnpm dlx skills@<version> add shadcn/ui --skill shadcn --agent claude-code --copy -y`. Read the diff in full.
- **Re-apply the local patch** the update overwrites, in `SKILL.md`: remove `allowed-tools` (it approves `add` and `apply` with no prompt), replace the `!` block that runs `npx shadcn@latest` on load with the instruction to run `pnpm exec shadcn info --json`, change workflow step 1 to match, and keep the "PROJECT OVERRIDE" note in place of the note on package runners. `git diff` shows all four.
- **Size:** `check-docs` warns about its files over the skill budget. Those warnings are expected; we do not trim a skill we do not own.

## Third-party skill in use: `drizzle`

Copied from the `skills/` folder of the pinned `drizzle-kit`, read in full first (ADR 0029). It says **how `drizzle-kit` behaves**; our docs say **what is allowed here**. Priority: `AGENTS.md`, `database.md`, and `drizzle-postgres.md`, then the skill, then memory. `check-docs` warns about four of its files over the skill budget; those warnings are expected.

| Question | Read |
|---|---|
| The steps of a schema change | Skill `add-db-table` |
| Table conventions, and what to look for in the SQL | `docs/03-standards/database.md` |
| Queries, transactions, and database errors in our code | `docs/04-stack/drizzle-postgres.md` |
| Which MCP tool an agent may call | `docs/05-agent-tooling/mcp.md`, "Drizzle MCP protocol" |
| `missing_hints`, an error code, the migrations folder, `drizzle-kit up` | Skill `drizzle`: `hints.md`, `responses-and-errors.md`, `migrations.md` |
| An API at the installed version | Skill `verify-library-docs` |

The skill applies, except where it says the following:

| The skill says | Here |
|---|---|
| Choose `push` for fast local work; approve its `confirm_data_loss` items | An agent does not run `push`. A person may, on a local throwaway database |
| `fix_conflicts` or `--fix-conflicts` resolves conflicting branches | Stop and ask: it deletes migrations. A person decides |
| Delete a migration no database has run | Only your own migration, not merged, and not applied anywhere but your local database. Never a merged one |
| Echo `confirm_data_loss` in the hints and retry | Call the drop out in the PR for approval (`database.md`). Never resolve a real rename as `create` |
| `pull` writes `drizzle/schema.ts` and `relations.ts` | Only to adopt an existing database. Move each table to its feature and delete `relations.ts` (ADR 0014). `init` is for a person |
| Examples with `./src/db/schema.ts` and `process.env.DATABASE_URL!` | Config in `drizzle-postgres.md`, with no `!` |
| The `generate` and `push` SDK, `console.log`, a `switch` with no `default` case | Not used: MCP or the CLI. The samples are not our code style |
| Apply with the driver's migrate runner | `pnpm db:migrate` |
| `up` when asked | Only on a branch for the Drizzle upgrade. Commit first; it writes no backup |
| Run `drizzle-kit skills` to refresh | The steps below: that command runs an unpinned `skills@latest` |

- **To update**, in this repo only, after installing the new pinned version in a temp folder and linking it as `./node_modules/drizzle-kit`: `pnpm dlx skills@<version> add ./node_modules/drizzle-kit/skills --skill drizzle --agent claude-code --copy -y`. Remove the link. The `./` is required: without it, the CLI reads the path as a GitHub repo. Read the diff in full.
- **Re-apply the local patch** the update overwrites: the "PROJECT OVERRIDE" note in `SKILL.md`. Then re-check the table above against the new text.
- **Do not run `pnpm approve drizzle-kit`.** pnpm 12 prints `Agent skills awaiting approval: drizzle-kit` on install. Approving links the unpatched skill as a second one, `pnpm-drizzle-kit-drizzle`. Leave the notice; it fails nothing.

## Third-party skills in use: Better Auth

All six skills in `better-auth/skills`, read in full first (ADR 0030). They say **which options exist and why they matter**; our docs say **what is allowed here and where it goes**. Priority: `AGENTS.md`, `better-auth.md`, and `security.md`, then the skills, then memory. **They have no version,** unlike `drizzle`: an API they name is a lead, and the MCP protocol in `mcp.md` confirms it.

**A skill being here does not adopt its feature.** Scope stays email and password (ADR 0007, R), and they are installed so that a future need finds its path without anyone remembering. A plugin or sign-in method goes: `write-idea`, research with its skill, an ADR, then the pipeline. OAuth has no skill of its own: `create-auth` and the two general skills cover it.

| Question | Read |
|---|---|
| Where `auth` lives, the schema flow, and cross-site rules | `docs/04-stack/better-auth.md` |
| The steps of a change | The pipeline: `new-feature`, `add-db-table`, `add-server-function`, `build-task` |
| An API at the installed version | MCP server `better-auth`, through `verify-library-docs` |

The skills apply, except where they say the following:

| The skills say | Here |
|---|---|
| `npm install`, `npx auth@latest ...` | `pnpm add`, and `pnpm dlx auth@<installed better-auth version> ...`. `auth@latest` may be ahead of the app |
| Phase 1 and Phase 2 of `create-auth`; its route table with no TanStack Start | Not run: the pipeline. Route: `better-auth.md`, rule 3 |
| `auth migrate`, including in the email and password, 2FA, and organization setup | Not used: it refuses the Drizzle adapter (read in `auth@1.7.15`) |
| `generate --output src/db/auth-schema.ts`, then `drizzle-kit push` | `better-auth.md`, rule 5. An agent never runs `push` (`mcp.md`) |
| `auth.ts` in `lib/`, with `auth.ts` found by search; a `pg.Pool` as `database`; the Drizzle setup in `create-auth` | `features/auth/server/auth.ts`, with `--config`; `drizzleAdapter` on the client in `shared/db/` (`drizzle-postgres.md`) |
| `process.env.BETTER_AUTH_SECRET`; `BETTER_AUTH_TRUSTED_ORIGINS` | The env module (`environment.md`) |
| Social providers, OAuth tokens, and any plugin | ADR first (ADR 0007, R) |
| `hasPermission` and `checkRolePermission` on the client | They shape the UI only. Authorize on the server (`security.md`). The ADR for the plugin reconciles it with `better-auth.md`, rule 7 |
| `trustDevice: true` in every 2FA sample; `storeOTP`; `/2fa` with `window.location.href` | Trust and OTP storage are spec decisions, never `"plain"`. Navigate with the router |
| `@node-rs/argon2`, `react-qr-code`, `@better-auth/organization/addons`, `@better-auth/*` packages, or a custom hash | Keep the default hash. Any package needs an ADR (`better-auth.md`, rule 8), and verify that the import exists |
| A `sendEmail` helper; Redis, `rateLimit.storage: "secondary-storage"`, `waitUntil` | No email provider or Redis in our stack: each needs an ADR. A Node container (ADR 0007): choose rate limit storage in the spec |
| `disableCSRFCheck: false` in a sample; wildcard or computed `trustedOrigins` | Never set it, to any value (`better-auth.md`, rule 9). A short explicit list |
| `ipAddressHeaders`, `trustedProxyHeaders`, and cookie cache `jwe` in the full sample | Only when the spec says why: the proxy is a deploy decision, and a cached session outlives its revocation until `maxAge` (**Inferred**) |
| `useSession()` or `auth.api.getSession` wherever needed | The `features/auth` public API, and `shared/server/require-auth` in server functions (`better-auth.md`, rules 1 and 4) |
| `auth.api.requestPasswordReset` on the server | `authClient`, as for sign-in (`better-auth.md`) |
| `console.log`, `auditLog`, `user.email`, and `throw new Error` in hooks; renaming auth tables | pino, with no private data (`logging.md`); errors per `error-handling.md`. A rename is a spec decision, and rule 5 still applies |
| `auth init`, `auth upgrade`, `auth mcp`, and the `ai`, `login`, and `create-admin` commands | Not used by an agent. `generate` is the only one in our flow |

- **To update**, in this repo only: `DISABLE_TELEMETRY=1 pnpm dlx skills@<version> add better-auth/skills --skill '*' --agent claude-code --copy -y`. Read the diff in full.
- **Re-apply the local patch** the update overwrites: the "PROJECT OVERRIDE" note in each `SKILL.md`. Then re-check the table above against the new text.
- **Size:** `check-docs` warns about their files. Those warnings are expected.

## Maintaining skills

A repeated agent mistake (pipeline phase 11) should end as an update to a skill, doc, lint rule, or test. Bump the skill and note the change in the PR; the guardrail table in `docs/templates/learnings.md` links each mistake to its change.
