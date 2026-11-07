# Task Breakdown: <Feature name>

- Slug: `<feature-slug>` (file `07-tasks.md`)
- Feature Spec: `06-feature-spec.md`
- Tier: M | L (tier S has no task breakdown)
- Status: draft | in review | approved | dropped
- Gate: Tasks gate | Spec gate (tier M: approved together with the feature spec)
- Owner: <human>
- Author: <human, or "AI agent">
- Date: YYYY-MM-DD
- Approved by: <name> (Tech Lead), <date> — format and authority: `docs/01-workflow/roles.md`

Rules:
- One task = one reviewable PR = a **vertical** cut (database to UI) that leaves `main` releasable. Never a task per layer ("all tables", "all functions"): a layer on its own proves nothing to a user.
- Order by **risk, riskiest first** (the task that tests the biggest unknown goes first), unless a dependency forces another order (say why in "Depends on").
- Size: target at most 400 changed lines, excluding generated files and migrations (`docs/03-standards/git-and-commits.md`). Bigger means split.
- Each task lists the acceptance criteria it covers, including permission rules, the tests that prove them, and the files it may change. The file list covers everything the task's description asks for.
- Dependencies are written once, in the overview table. No second diagram: two copies come to disagree.
- Docs, ADRs, the feature `README.md` (public API, events, owned tables), and `.env.example` changes ship in the same PR as the code.

Tier M minimum: the overview table, the coverage check, and the detail block of the first task (later blocks may be brief: outcome, AC, files). Tier L: a full detail block for every task. Tier S has no task breakdown; its issue is the plan.

## Overview
| ID | Task (user-visible outcome) | Risk (and why) | Depends on | AC and NFR covered | Estimate (a person's, optional) | PR | Status |
|---|---|---|---|---|---|---|---|
| T1 | <thinnest end-to-end path through the riskiest part> | high: <unknown it tests> | none | AC1 | | | todo |
| T2 | | | | | | | todo |

Status: todo · in progress · in review · merged · dropped.

**Ready to start (Definition of Ready):** a task starts only when its outcome, acceptance criteria, file list, and first tests are written, and its dependencies are merged. Test and documentation work belong to the task they verify, not to tasks of their own.

**Coverage check (required before the gate):** every in-scope item in `04-prd.md`, every public export in `05-architecture-review.md` (tier L), and every acceptance criterion (and every NFR with its own verification) in `04-prd.md` appears in at least one task. Not covered: <none, or list with reason>. Every row of the feature spec's test strategy (section 11) and of its layer breakdown (section 3) belongs to a task.

A blocking defect found in QA becomes a fix task (`T<n>-fix`), added through the change log; its detail block is the defect id, the AC, and the files.

## Task details
Repeat this block per task.

### T1: <outcome>
- **Feature Spec rows delivered:** layer breakdown rows <…>; test strategy rows <AC ids>.
- **Files this task may change** (taken from the layer breakdown):

  | File | Create / modify |
  |---|---|
  | `src/features/<f>/…` | |

  Always allowed: this task's tests, the docs, ADR, feature `README.md`, and `.env.example` it needs. Needs a human, not an edit by the agent: lint, TypeScript, and check-script config (`AGENTS.md`). A file that is not listed needs a line in the change log below **before** it is edited.
- **Tests written first** (AC id → test name; logic and bug fixes): <…>. Exempt (layout, styling, config): <…>.
- **Read first:** <`docs/…` files and skills for this task: `build-task` always, plus `add-db-table`, `add-server-function`, `new-feature` (first task only)>. Library APIs come from spec section 13; verify any other call (`verify-library-docs`).
- **Migration · env · ADR:** <yes/no · names · links>.
- **Public API or events added** (then this task also updates `index.ts` (and `index.server.ts` for server-only exports) and the `README.md`; tasks that consume them depend on this one): <none, or list>.
- **Done when:** the AC tests above pass, plus <task-specific condition, e.g. "entry point stays unlinked">. The repo-wide checklist is `docs/01-workflow/definition-of-done.md`; it is not repeated here.

## Entry point visibility
Which task links the feature from the UI? Until then the entry point stays unlinked. `main` reaches staging only, so that link reaches users after the Release gate (`docs/01-workflow/sdlc-pipeline.md`, section 3).

## Risks and unknowns
List `TODO(verify)` items and who will resolve them.

## Change log
Tasks may be split, merged, or reordered during the build, and a task's file list may grow; record it here with the reason. A change that alters scope or acceptance criteria goes back to the PRD or feature spec change log and its gate. If breaking down the work shows the spec is wrong, the spec changes first.

| Date | Change | Reason |
|---|---|---|

## Gate review
Filled by the reviewer (`docs/01-workflow/sdlc-pipeline.md`, section 4). Every tier fills this table, including tier M and merged gates: reviewing together removes a stop, not these questions. "Yes" with nothing to point at counts as "no".

| Question | Answer and where |
|---|---|
| Does every in-scope PRD item, spec row, and AC land in a task? | |
| Is each task a vertical cut with a user-visible outcome, riskiest first? | |
| Does each file list cover its task's description? | |
| Does each task with a permission rule name it in its tests and "Done when"? | |
| Is every public export promised upstream delivered by a named task? | |

| Round | Date | Reviewer | Verdict (approve · approve with notes · changes requested · drop) | Findings, or notes and their owner |
|---|---|---|---|---|
