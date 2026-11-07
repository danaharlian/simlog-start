# 0029 Drizzle MCP server and skill

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for the server, the skill, composition with the existing skills, and pnpm; the local patch, the hook, and the limits on tools are the agent's and can be reversed by a new ADR
- Amends: ADR 0007, row N (`drizzle-kit mcp` and `skills` are adopted)

## Context

The owner asked to integrate the Drizzle MCP server for Claude Code and the Drizzle skill, composed with the skills this repo already has, using pnpm. `mcp.md` and `skills.md` require an ADR, and reading a third-party skill in full first.

Read and run on 2026-11-01 with `drizzle-kit` 1.0.0-rc.5:

- **The server has seven tools, and three of them conflict with our rules.** `push` changes a live database with no migration. `fix_conflicts` deletes migrations, and every database that ran them must then be reset. `pull` with `init` writes to the migrations table. The other tools are `generate`, `check`, `export`, and `up`, plus `pull` with no `init`. There is no `migrate` tool.
- **`drizzle-kit skills` installs through an unpinned `skills@latest`,** from the `skills/` folder inside the package, and it also removes older skills. The skill is one folder, `drizzle`, at revision 15.
- **The skill conflicts with our rules in places:** it recommends `push` for local work, has the agent approve `confirm_data_loss` itself, describes deleting migrations, and shows `process.env.DATABASE_URL!` and `./src/db/schema.ts`. `pull` writes `relations.ts`, which ADR 0014 excludes. No hidden instruction or unexpected network call was found in its Markdown.
- **`generate` does not stop for every loss of data.** A dropped column returned `ok` with no `missing_hints` and wrote `DROP COLUMN`. Reading the SQL is the only check.
- **pnpm 12 has its own path for skills.** `pnpm approve drizzle-kit` records a permission in `pnpm-workspace.yaml` and adds a git-ignored link to the unpatched skill, `.claude/skills/pnpm-drizzle-kit-drizzle`.

## Decision

- **Server:** `pnpm exec drizzle-kit mcp` in `.mcp.json`, as the docs give for pnpm, shipped through the installer's merge. It runs the app's installed version, so `.mcp.json` holds no version.
- **Skill:** a copy in `.claude/skills/drizzle/`, taken with the pinned `skills` CLI from the pinned package. The only patch is a "PROJECT OVERRIDE" note in `SKILL.md`. `skills.md` lists how it differs from our rules; our rules win.
- **Tools:** agents use `generate` and `check` by default. `up` and `pull` have limits. The table is in `mcp.md`.
- **Hook:** `protect-migrations` blocks an agent from `push`, `fix_conflicts`, and `pull` with `init`, over MCP and on the CLI. A dry run with `--explain` stays allowed. This tightens `push`: a person may still use it for local prototyping, and an agent may not, because an agent cannot tell that a database is a throwaway.
- **Composition:** `add-db-table` generates and checks through MCP, with the CLI as fallback, and uses the skill for hints. `verify-library-docs` reads the skill for `drizzle-kit` behavior, `code-review` and `prepare-release` check the result, and `AGENTS.md` and `skills.md` route to it.
- **`test-real-app.sh`** starts the server from `.mcp.json`, checks the exact tool list, generates a migration, and fails if the skill's revision differs from what the pinned package ships.

## Consequences

- An agent gets structured answers for a schema change, including the rename round trip, with no change to how migrations are reviewed or applied.
- **Risk: the server shows as failed where `drizzle-kit` is not installed,** which is this repo and an app before the Drizzle action item in `versions.md`. It is noise in `/mcp`, and nothing else is affected.
- **Risk: an agent reaches a real database.** The hook is a guard rail, and a command written another way gets past it. `generate` needs no credentials, and only a local or dev `DATABASE_URL` belongs in the client's environment (`mcp.md`). Nothing enforces that.
- **Risk: the copy goes stale or loses its patch.** `test-real-app.sh` catches a stale revision, and `test-gates.mjs` catches a lost note. Neither reads the new text, so the table in `skills.md` is re-checked by hand at each bump.
- **Risk: someone runs `pnpm approve drizzle-kit`.** Two skills with one name in their text, one unpatched. `skills.md` says not to. Nothing blocks it.
- **Risk: a new upstream tool.** `test-real-app.sh` fails when the list changes.
- pnpm prints `Agent skills awaiting approval: drizzle-kit` on install. It fails nothing.
- `check-docs` prints four more size warnings for the skill's files. They do not fail the check.

## Not verified

- **`push`, `pull`, and `up` were never run:** no PostgreSQL was available in this session. Their behavior here comes from the docs and the skill. The hook was what stopped `push`.
- **Approval in the interactive client.** The real session used `enabledMcpjsonServers` in a fixture; nobody clicked approve in `/mcp`. VS Code did not connect either.
- **The hook on `fix_conflicts` and the CLI inside a real session.** The agent in that session stopped after `push` was blocked. Those cases ran only by feeding the hook its documented input in `test-gates.mjs`.
- **Whether the skill triggers next to `add-db-table` as intended:** it appears in the skill list, but no real feature has used it.
- **Linux and CI.** Runs were on macOS; the workflow has never run on GitHub (ADR 0023).

## Alternatives considered

- **`pnpm approve drizzle-kit`, pnpm's own path.** It follows upgrades with no copy to maintain, but the skill cannot carry our override, this repo has no `package.json` to approve from, and the folder name differs from `name: drizzle`, which `check-docs` requires of a skill. Rejected.
- **`pnpm exec drizzle-kit skills`, as the docs give.** Runs an unpinned CLI and asks for choices at a prompt. Rejected.
- **`pnpm dlx drizzle-kit@<version> mcp`,** which would start in this repo too. A separate copy cannot find the project's `drizzle-orm` (`drizzle-kit/MCP.md`). Rejected.
- **A `package.json` in this repo, so the server starts here.** Adds dependencies to a docs repo so that one status line turns green. Rejected, as in ADR 0027.
- **`claude mcp add`, as the docs give.** It writes the same server with `type` and an empty `env`. We write the file directly, because the installer ships it. Rejected.
- **No hook, only rules.** The skill tells an agent to prefer the MCP tool, and `push` is one call away. Rejected.
- **Asking a person through the hook instead of blocking.** Keeps `push` in reach, but the agent still cannot judge the database, and ADR 0026 set the pattern of a person running such a command. Rejected for now.

## Verification

Docs consulted (2026-11-01): https://orm.drizzle.team/docs/drizzle-kit-mcp; https://orm.drizzle.team/docs/drizzle-kit-skills; `drizzle-kit/MCP.md` on the beta branch of drizzle-orm; `drizzle-kit@1.0.0-rc.5`: `skills/drizzle/*` read in full, `bin.cjs` for the `skills` command, and `--help`; `skills@1.7.4`; https://pnpm.io/cli/permissions and pnpm 12.16.1; https://code.claude.com/docs/en/hooks.

Run on 2026-11-01 on macOS: `test-gates.mjs` 117 of 117; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 15 warnings, 4 of them new; `bash scripts/test-real-app.sh` exit 0, with the server answering from `.mcp.json` in a real app and 8 of 8 gates passing with a real schema, config, and migration in it. In a real `claude -p` session on a fixture, `check` and `generate` ran through the server, and the hook blocked `push`.
