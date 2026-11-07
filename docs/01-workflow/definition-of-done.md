# Definition of Done

**When to read:** before reporting a task as finished or opening a PR (it applies to every task PR).

A change is done only when **all** apply. Report each item honestly; "not run" is a valid status, "passed" without running is not.

## Correctness
- [ ] Acceptance criteria (PRD ids) covered by this task are met and each has a test. For logic and bug fixes the test was seen failing for the right reason first.
- [ ] `typecheck` has zero errors; `lint` has zero errors and zero warnings; the format check (`check`, prettier) passes; `build` succeeds.
- [ ] Zero suppressions and no weakened gate: `check:suppressions`, `check:gates`, and `check:ui` pass; no edits to lint/TS config or check scripts unless a human asked.
- [ ] Unit/integration tests pass; a bug fix includes a regression test that failed before the fix.
- [ ] Edge cases covered: empty, null/undefined, duplicates, unauthorized, not found, concurrent update.
- [ ] Each collision point the feature spec (section 4, "Transactions and concurrency") assigns to this task has its mechanism in code and a test that runs the colliding writes together against a real database, then checks the stored data.
- [ ] Zero deprecated API usage: `lint` passes `@typescript-eslint/no-deprecated`, and the `test` and `build` output shows no deprecation warning.

## Architecture
- [ ] Code lives in the right feature; no deep imports across features; `shared` has no feature imports. Server-only exports are in `index.server.ts`, never `index.ts`; events are documented in the owner's `README.md`.
- [ ] Routes are thin. Server functions only validate, authorize, and delegate.
- [ ] No new dependency without an ADR.
- [ ] The change stays within the task's file list in `07-tasks.md`. A file outside it was added to that plan's change log first.

## Grounding
- [ ] Every library API used was verified (rule zero). PR has `Docs consulted:`.
- [ ] No `TODO(verify)` left unresolved, or each is listed in the PR for a human.

## Security and data
- [ ] Every server function touching private data enforces authentication and authorization itself.
- [ ] All external input validated with Zod. No secrets in code, logs, or client bundle.
- [ ] Migrations are generated, reviewed, and reversible or explicitly documented as not.

## UX
- [ ] Loading, empty, and error states exist. Keyboard and screen-reader basics work (labels, focus, contrast).

## Documentation
- [ ] `docs/`, ADRs, and `.env.example` updated if behavior, structure, or config changed.
- [ ] The feature `README.md` lists any public API, event, or owned table this PR adds or changes.
- [ ] Docs are part of this PR, not a later phase. Use the table below. Text follows `docs/03-standards/writing.md`.
- [ ] If a human had to correct the agent: the correction and the guardrail that prevents it are recorded (tier S: in the PR; tier M and L: `11-learnings.md`).

| If the change adds or changes… | Update |
|---|---|
| A table or business term | The owner's `README.md`; the business terms in `docs/03-standards/glossary.md` |
| A dependency | `docs/04-stack/versions.md`, plus an ADR |
| An environment variable | `.env.example` and the env schema (`docs/03-standards/environment.md`) |
| A public API or event | The owner's `README.md` |
| An architecture or tooling decision | A new ADR, and `docs/decisions/README.md` |
| An MCP server | `docs/05-agent-tooling/mcp.md` |
| A skill | `AGENTS.md` and `docs/05-agent-tooling/skills.md` |
| A document | `docs/README.md` and, if agents need it often, the table in `AGENTS.md` |

## Reporting

An agent ends every task report, and fills the PR's "Verification" section, with this block, in this order. Each line holds the real result of a command run in this session; a script missing from `package.json` is reported as missing, not skipped silently.

```
Verification
- typecheck: PASS | FAIL: <first error> | not run: <why>
- lint (--max-warnings 0): …
- check:suppressions, check:gates, check:ui: …
- check (prettier): …
- test: PASS (<files> files, <tests> tests) | FAIL: <failing test names> | not run: <why>
- build: …
- node scripts/check-docs.mjs: …
- Not verified: <each claim or behavior not checked, or "none">
```

"Not verified" names what the commands do not prove: a UI not opened in a browser, a migration not applied, a library claim marked **Inferred** or **Unknown**, a race test not run against a real database.
