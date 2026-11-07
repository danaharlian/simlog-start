# 0026 Primitive flow test and a hook for the UI lock

- Status: accepted
- Date: 2026-11-01
- Deciders: owner asked for both; the design below is the agent's and can be reversed by a new ADR
- Extends: ADR 0025

## Context

ADR 0025 left two gaps:

- The steps in `add-ui-component` had never run end to end with `check:ui`. It had seen only the scaffold's `button.tsx`.
- An agent blocked by `check:ui` could record its own edit with `--accept --reason`. Only review of the lock's diff would catch that.

## Decision

- **`test-real-app.sh` runs the primitive flow.** It adds `field`, `sidebar`, and `dialog` with the CLI, confirms `check:ui` fails while they are not recorded, applies the fixes listed in `tailwind-shadcn.md`, formats, records all of them, runs every gate and `build`, and confirms a changed primitive then fails. A fix that no longer finds its expected count stops the run, so the table cannot go out of date unnoticed.
- **A `PreToolUse` hook, `protect-ui-lock.mjs`, blocks an agent** from `--accept --reason`, `--forget`, `--baseline`, a direct edit of `shadcn-primitives.lock.json`, and a shell command that writes to it. It exits 2 with what to do instead.
- **What stays open to an agent:** `--accept` on a new primitive and `--own`, which `add-ui-component` needs, and reading the lock or staging it.
- **A person runs the blocked commands** in their own terminal, where the hook does not apply.
- **The installer merges hooks by event,** so an app with settings of its own keeps them and gains the new hook.

## Consequences

- **The first run found a wrong step:** the skill said to record after "the format and any listed fix". The `sidebar` fix leaves the file unformatted, so a later `pnpm format` would change the recorded hash. The skill now says to format again before recording.
- It confirmed that the CLI's output needs recording: `dialog`, `sheet`, `sidebar`, and `tooltip` hold arbitrary values, and `dialog` and `sheet` hold `bg-black/10`.
- **Risk: the flow test adds time and depends on the shadcn registry.** The `real-app` CI job takes longer, and a registry change can turn it red with no commit here. That is a signal to read, as ADR 0023 says of this job.
- **Risk: the hook can be bypassed.** It matches text, so a command written another way gets through, and an agent can edit the hook or `.claude/settings.json`. It catches the direct route; the lock's diff and CODEOWNERS remain the check. It runs only in Claude Code.
- **Risk: a blocked command that only reads the lock,** such as `cat` with a redirect. Accepted: the agent can use another command.
- **Still needed from a human:** "Require review from Code Owners" and `check:ui` in each app's CI.

## Not verified

- **The hook inside a real Claude Code session.** It was run as a process with the documented input, and its exit codes were checked; no live agent was blocked by it.
- **The sidebar and dialog in a browser.** The flow checks lint, types, and `build`.
- **Linux and CI.** All runs were on macOS; the workflow has still never run on GitHub (ADR 0023).

## Alternatives considered

- **Block every `--accept`.** Stricter, but `add-ui-component` could not finish without a person for each new primitive. Rejected.
- **Block an agent from editing primitives directly.** It stops the edit earlier, but the listed lint fixes need those edits, and `check:ui` already fails on the result. Rejected.
- **Require a signed approval in the lock.** Stronger, but needs keys and tooling this repo does not have. Rejected.
- **Run the flow test only weekly.** Faster on a pull request, but a change to the installer or `check-ui.mjs` could merge with the flow broken. Rejected, the same reasoning as ADR 0023.

## Verification

Docs consulted (2026-11-01): Claude Code hooks page, https://code.claude.com/docs/en/hooks, for exit codes, matchers, and the `tool_input` fields of Bash, Edit, and Write; `shadcn@4.23.0` run in a real app.

Run on 2026-11-01 on macOS: `test-gates.mjs` 88 of 88, 19 of them new, with the hook's blocked and allowed commands and the settings merge; `test-check-docs.mjs` 75 of 75; `check-docs.mjs` 0 errors and 11 expected warnings; `bash scripts/test-real-app.sh` exit 0 in 36 seconds, with 8 of 8 gates on the first install, the second install, and after the primitive flow.
