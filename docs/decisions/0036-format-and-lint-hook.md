# 0036 Format and lint each file an agent edits

- Status: accepted
- Date: 2026-11-07
- Deciders: owner, via chat, 2026-11-07: "ambil stateginya, idenya bukan kodenya. jika dan baik untuk di terapkan kenapa tidak", after sharing a bash hook that formats and lints an edited file. The design below is the agent's and can be reversed by a new ADR
- Extends: ADR 0004 (enforcement layers), ADR 0026 (hooks merged by the installer)

## Context

An agent learns about a lint error only when it runs `pnpm lint`, or when CI fails. A formatting difference fails `check` the same way. By then it has often built more code on the mistake.

The owner shared a Claude Code hook from another setup: after `Edit` or `Write`, run Prettier and `eslint --fix` on the edited file, and exit 2 with the remaining errors. The idea fits here, but the script does not:

- It is bash, while our hooks are Node scripts with tests (`docs/examples/*.hook.mjs`).
- It skips `src/components/ui/`. Our primitives live in `src/shared/ui/`, so it would run `--fix` on them, and `check:ui` fails on a primitive that changed without a person recording it (ADR 0025).
- It names a doc this repo does not have.

Facts from the Claude Code hooks docs (2026-11-07):
- A `PostToolUse` hook that exits 2 shows its stderr to Claude; the tool has already run.
- Any other non-zero exit is a non-blocking error.
- `timeout` is in seconds, with a default of 600 for a command hook.
- Matching hooks run in parallel.
- `tool_input.file_path` is always absolute.
- The hooks guide gives a Prettier-after-edit hook as an example.

## Decision

Add a `PostToolUse` hook for `Edit|Write`: `docs/examples/format-and-lint.hook.mjs`, installed as `.claude/hooks/format-and-lint.mjs`, with a 120-second timeout.

- It runs the app's own tools through `pnpm exec`, from the project root, on the edited file only. First it runs `prettier --write --ignore-unknown`. Then, on JavaScript and TypeScript files, it runs `eslint --fix --max-warnings 0 --no-warn-ignored`.
- `.prettierignore` and the ESLint ignores decide what is skipped, the same as `check` and `lint`. The hook keeps no list of its own beyond `node_modules` and paths outside the project.
- In `src/shared/ui/` it runs ESLint without `--fix`. The file is still formatted, which matches the `add-ui-component` step "format again before recording".
- A remaining lint error or a file Prettier cannot parse exits 2 with the output and the no-suppression instruction.
- If pnpm or ESLint cannot run at all (ESLint exit 2: config or crash), the hook exits 1. The user sees it, and the agent is not told to fix a gate file.
- The installer copies the hook and merges it into `.claude/settings.json` like the others. An existing install gains it on the next run.

## Consequences

- **The first real-app run found a bug.** On macOS, `/var` is a link to `/private/var`. A file path reached through such a link made typescript-eslint report "couldn't find any tsconfig.json" on a clean file: it searches only under the real project root. The fixture had missed it because its temp folder is a real path. The hook now resolves the project root and the file to real paths and hands the tools a relative path, and a test reaches the fixture through a link.
- **Faster feedback.** A lint error reaches the agent in the turn that caused it, and formatting no longer fails `check`.
- **Cost: a lint run per edit.** It takes about 1.2 seconds per edit on the test fixture, with typed linting. A real app with more files takes longer. The 120-second timeout caps a hang, and a timeout is non-blocking.
- **Risk: the file changes after the agent's edit.** The agent's next `Edit` may then need a fresh `Read`. Claude Code reports a file changed on disk itself (Inferred from its behaviour, not from the hooks page). `--fix` makes the same changes `eslint --fix` would.
- **Risk: a race with `no-suppress`.** The two `PostToolUse` hooks run in parallel, so `no-suppress` can read the file while Prettier writes it and miss a finding. This hook's ESLint run includes the no-suppression rules and reads the file after Prettier, so the finding still arrives. `check:suppressions` in CI remains the gate.
- **Limit: one file.** The hook cannot see another file the edit broke, and it does not run `typecheck` or tests. It is a loop, not a gate: the gates before a PR are unchanged.
- **Limit: only Claude Code runs hooks.** Other agents rely on `lint` and CI, as before.
- **Docs updated:** `linting-and-formatting.md` ("After each agent edit"), `no-suppression.md` (wiring), and the root `README.md`.

## Not verified

- **The hook inside a live Claude Code session.** It was run as a process with the documented input, in the gates fixture and in a scaffolded app. No live agent received its message.
- **Windows.** The hook calls `spawnSync('pnpm')`, as the installer does. On Windows pnpm is `pnpm.cmd`, which may need a shell. Not run.
- **Run time on a large app.** Measured only on the fixture and the scaffold.

## Alternatives considered

- **Use the bash script as given.** It needs bash, skips the wrong primitive folder, and has no tests. Rejected.
- **Add the work to `no-suppress.mjs`.** One hook would remove the race. But it would put a slow tool run behind the fast text check, and a broken ESLint config would then take down the backstop that ADR 0004 keeps separate on purpose. Rejected.
- **Run `pnpm lint` on the whole app.** It sees other files too, but it takes far longer on every edit and reports problems the agent did not cause. Rejected.
- **Prettier only.** Cheaper, but it gives the agent no lint feedback, which is the main gain. Rejected.
- **ESLint without `--fix` everywhere.** The agent would see every change it must make, but it would spend turns on import order and other fixes the tool makes safely. Kept only for `src/shared/ui/`.

## Verification

Docs consulted (2026-11-07):
- Claude Code hooks reference, https://code.claude.com/docs/en/hooks: exit codes, `timeout`, parallel hooks, `tool_input.file_path`.
- Claude Code hooks guide, https://code.claude.com/docs/en/hooks-guide: "Auto-format code after edits".
- `prettier@3.9.10` and `eslint@10.13.0`, the pinned versions, run in a scratch project:
  - Prettier skips an ignored path passed explicitly (exit 0).
  - `--ignore-unknown` skips an unknown extension.
  - A syntax error exits 2.
  - ESLint `--no-warn-ignored` exits 0 on an ignored file, and `--fix` applies.
  - Remaining errors exit 1, and a bad config exits 2.

Run on 2026-11-07 on macOS:
- `node --test scripts/test-gates.mjs`: 137 of 137, 8 of them new for this hook, plus the settings merge assertion.
- `bash scripts/test-real-app.sh` on a scaffolded app:
  - The hook formats a clean file and exits 0.
  - It exits 2 on `console.log` in a `.server.ts` file.
  - Every gate passes on the first and the second install.
