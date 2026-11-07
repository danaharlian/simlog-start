# 0030 Better Auth MCP server and skills

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for the server through the Claude Code option, composition with the existing skills, and all six skills, so that a future need for 2FA, OAuth, or another feature finds its path and an adopter of this repo does not have to know what was left out; project scope, the local patch, and the limits are the agent's and can be reversed by a new ADR

## Context

The owner asked to integrate the Better Auth MCP server with the Claude Code option, and the Better Auth skills, composed with the skills this repo already has. `mcp.md` and `skills.md` require an ADR, and reading a third-party skill in full first.

Read and run on 2026-11-01:

- **The Claude Code option does not reach the repo.** `npx auth@latest mcp --claude-code` runs `claude mcp add --transport http better-auth <url>`, with no scope. It leaves the repo unchanged, so nobody else would get the server, and ADR 0028 makes `.mcp.json` the one config.
- **The server is remote and has no pin.** It has two tools, `search_docs` and `get_doc`, both marked read-only, and no prompts or resources. It asks for no credentials. Queries go to a server the vendor runs.
- **It has the installed docs line, which Context7 does not.** The index lists v1.8 (beta), v1.7 (latest), and v1.6. Context7's list stops at 1.6.x (`mcp.md`).
- **A wrong version identifier looks like a missing API.** `version: "1.7"` returned "No documentation found", and `latest` found the page.
- **The repo has six skills with no version in them.** `better-auth/skills` at 20c9e88: `better-auth-best-practices`, `create-auth`, `email-and-password-best-practices`, `better-auth-security-best-practices`, `organization-best-practices`, and `two-factor-authentication-best-practices`. All six were read in full. No hidden instruction, `allowed-tools`, or command that runs on load was found.
- **The skills conflict with our rules in places.** They use `npx auth@latest` and `npm install`, recommend `drizzle-kit push` for development, place `auth.ts` in `lib/`, read `process.env`, and show wildcard origins, Redis, `console.log`, and a custom hash with a new dependency. The email and password quick start says to run `auth migrate` with no condition, and that command refuses the Drizzle adapter. The 2FA sample adds `react-qr-code`, and the organization sample checks permissions on the client.
- **`create-auth` is a procedure as well as a reference.** Its required interview offers OAuth, passkeys, and 2FA, and its route table has no TanStack Start entry. Left as written, it would compete with the pipeline for "add login". It is also the only skill with an overview of OAuth providers; the repo has no OAuth skill.
- **Two skills cover plugins outside our scope** (ADR 0007, R): organizations and 2FA.

## Decision

- **Server:** the entry `claude mcp add --transport http --scope project` writes, `{ "type": "http", "url": "https://mcp.better-auth.com/mcp" }`, in `.mcp.json`, shipped through the installer's merge. The command and URL are the Claude Code option's; the scope is ours.
- **Docs source:** the server comes first for Better Auth, ahead of Context7, with the protocol in `mcp.md`: resolve the version from `/llms.txt` each time.
- **Skills:** copies of all six, taken with the pinned `skills` CLI. The only patch is a "PROJECT OVERRIDE" note in each `SKILL.md`. `skills.md` lists how they differ from our rules; our rules win.
- **The rule is the guard, not a missing file.** Scope stays email and password; ADR 0007, R does not change. The note in `organization-best-practices` and `two-factor-authentication-best-practices` says the plugin is not adopted and needs its ADR. The note in `create-auth` makes it a reference: Phase 1 and Phase 2 do not run, and the work starts at `write-idea`.
- **Routing:** `AGENTS.md` lists all six, and `skills.md` has a row for a plugin or sign-in method: `write-idea`, research with its skill, an ADR, then the pipeline.
- **Composition:** `verify-library-docs` resolves through the server and treats a skill's API as a lead. `new-feature`, `add-db-table`, `add-server-function`, and `add-server-route` point to `better-auth.md`. `write-feature-spec` and `write-architecture-review` apply the scope rule and name the options. `code-review` and `prepare-release` check the result. `AGENTS.md` and `skills.md` route to them.
- **No new hook.** `protect-migrations` already blocks the `drizzle-kit push` the skills recommend, and `auth migrate` refuses the Drizzle adapter.
- **`test-real-app.sh`** calls the server at the URL in `.mcp.json`, checks the exact tool list and the read-only marks, and fails if the index drops the 1.7 line. `test-gates.mjs` checks the entry, that all six are present with their patches, and the notes that say what is not adopted.

## Consequences

- An agent reads docs for the installed line, closing a gap that `better-auth.md` lists as a pitfall.
- **Risk: an outage or a changed server.** With no pin, the content can change without a commit. `test-real-app.sh` catches a changed tool list but not changed text, and it fails when the vendor's server is down. The Context7 fallback and the table in `mcp.md` cover an agent's work in that case.
- **Risk: `latest` moves.** When 1.8 leaves beta, `latest` stops describing a 1.7 install, and a search still returns results. The protocol says to compare each time; nothing enforces it, and the check in `test-real-app.sh` only sees that a 1.7 line exists.
- **Risk: queries leak something.** The rule against sending secrets, user data, or our code is in `mcp.md`. Nothing enforces it.
- **Risk: the copies go stale or lose the patch.** They have no revision, so unlike `drizzle` no check can tell they are stale. `test-gates.mjs` catches a lost note. The table in `skills.md` is re-checked by hand on each update.
- **Risk: a skill's text is followed over ours.** The note and the table limit this; an agent can still misread them, and no gate reads a config's options.
- **Risk: broad triggers.** `create-auth` matches "add login", and `organization-best-practices` matches "access control", so a skill may load before the pipeline starts or on a task that does not need its plugin. The note sends the agent to our rules first, and `code-review` blocks a plugin with no ADR. No gate does: lint cannot read a Better Auth config.
- **Cost: context.** A loaded skill adds up to 479 lines, in `organization-best-practices`.
- A person approves the server in each client before it starts. `check-docs` prints more size warnings for the skills' files. They do not fail the check.

## Not verified

- **`npx auth@latest mcp --claude-code` was not run.** Its command was read in `auth@1.7.15`.
- **`auth migrate` was not run:** the refusal was read in the source. `auth generate` with `--config` on our path was not run either.
- **Approval in the interactive client, and VS Code.** The real session used `enabledMcpjsonServers` in a fixture; nobody clicked approve in `/mcp`. No VS Code session connected. Its docs list HTTP as a transport for a root `.mcp.json`, with `type` and `url` required.
- **Whether the skills trigger as intended next to the pipeline:** they appear in the skill list, but no real feature has used them.
- **Our rules against 1.7 for each option in the conflict table:** the table compares text. It does not test each option on the installed version.
- **Linux and CI.** Runs were on macOS; the workflow has never run on GitHub (ADR 0023).

## Alternatives considered

- **Run `npx auth@latest mcp --claude-code` as given.** An unpinned package writes to one person's local config and leaves the repo with nothing to review. Rejected.
- **`--manual`.** Writes `mcp.json`, which no client here reads. Rejected.
- **Install three, and add the others with the ADR that adopts each plugin.** The agent's first version. Nobody would remember what was left out, an adopter could not know, and a request for 2FA or OAuth found no skill. Rejected by the owner.
- **`disable-model-invocation` on the skills not in scope.** Stops the broad triggers, and brings back the need to remember they exist. Rejected.
- **Rewrite the text of `create-auth` to fit.** Most of it would change, and the patch would be lost on each update. Rejected for a note.
- **Rewrite the samples in the copies.** Each update would overwrite it, and the diff against upstream stops being readable. Rejected for one note plus a table.
- **The Claude plugin in the same repo.** It offers only two skills, adds two commands, and cannot carry our override. Rejected.
- **Keep only Context7.** Its list stops at 1.6.x. Rejected as first source, kept as a fallback.
- **A hook for `auth migrate`.** It refuses our adapter already, so a hook adds code with no case to stop. Rejected for now.

## Verification

Docs consulted (2026-11-01): https://better-auth.com/docs/ai-resources/mcp; https://better-auth.com/docs/ai-resources/skills; https://better-auth.com/llms.txt through the server; `better-auth/skills` at 20c9e88; `auth@1.7.15` `dist/index.mjs`; `skills@1.7.4 add --help` and `--list`.

Run on 2026-11-01 on macOS: `test-gates.mjs` 120 of 120; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 21 warnings, 6 of them new; `bash scripts/test-real-app.sh` exit 0 with all six skills, with the server answering at the URL in `.mcp.json`. In a real `claude -p` session on a fixture, the server connected from `.mcp.json`, and `get_doc` and `search_docs` ran. In a second session on a copy of the repo, all six skills were listed, and a request for 2FA and Google sign-in, with no other hint, was answered with `write-idea`, the matching skills, and the need for an ADR; that session loaded no skill, so the override notes were not exercised. The only edit after the real-app run shortened `skills.md`.
