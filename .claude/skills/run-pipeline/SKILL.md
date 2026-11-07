---
name: run-pipeline
description: Find where a feature stands in the SDLC pipeline and start the next phase. Use when the user says continue, resume, or "next step", names a feature that has a specs/<slug>/ folder, or starts non-trivial work and the tier and first phase are not chosen yet. Stops at every gate and never approves anything.
---

# Run the pipeline

You are the dispatcher, not a phase. You read the state, pick the next phase, run **that phase's skill**, and stop where a human must decide. Rules and the status table: `docs/01-workflow/sdlc-pipeline.md` (sections 1, 4, 8).

## Steps

1. **Find the feature.** List `specs/`. One folder: use it. Several: ask which. None, and the request is new work: start skill `write-idea` (it chooses the tier).
2. **Read only the headers.** `grep -n -E "^- (Status|Gate|Result|Tier):" specs/<slug>/*.md`. Do not read bodies yet. Task states come from the table in `07-tasks.md`.
3. **Check the files themselves.** Run `node scripts/check-docs.mjs`. An error under `specs/` (old status words, a missing `Gate:` line, an artifact marked approved before its prerequisite, an unfilled placeholder, a malformed `Approved by:`, a `Tier:` line that differs from `01-idea.md`, a numbered file that is not an artifact, a Gate review with no approving last round) is fixed or reported **first**. You may rewrite a status to the vocabulary only when its meaning is unchanged; you never set `approved`.
4. **Tier.** Read it from `01-idea.md`. Missing, or "Confirmed by" empty: stop and ask the human. Tier S has no `specs/` folder: the issue is the plan, go to skill `fix-bug` (a defect) or `build-task` (anything else).
5. **Pick the next action**, top to bottom, first match wins:

   | State | Action |
   |---|---|
   | An artifact is `in review` | **Stop.** Say which gate waits for whom and what to look at. |
   | `09-qa.md` says `Result: fail` | Fix tasks first (`sdlc-pipeline.md`, section 4). Reopen `08-review-log.md` and `09-qa.md` as `draft`, `Result: pending`; add a fix task per blocking defect through the change log in `07-tasks.md`; then the next row. |
   | `07-tasks.md` is `approved` and a task is not `merged` | First task `todo` runs `build-task` (the first task also `new-feature`); a task `in review` waits for the PR gate. Check this before the `draft` row: `08-review-log.md` stays `draft` throughout phase 8. |
   | Every task is `merged` and `08-review-log.md` is `draft` | Ask the Tech Lead for `Decided by:`. With it, set `done`, then `run-qa`. |
   | An artifact is `draft`, its content is complete, and it has no gate | **Stop.** Ask its authority (`docs/01-workflow/roles.md`) for the decision. Only with a `Decided by:` line does it become `done`. |
   | An artifact is `draft` | Continue the lowest-numbered one with its skill. |
   | `11-learnings.md` is `done` and `12-measure.md` is missing | Report when the PRD's window ends. Start `measure-feature` only after it. |
   | `11-learnings.md` and `12-measure.md` are `done` | Report that the feature is closed. |
   | All present artifacts are `approved` or `done` | Start the first missing artifact the tier requires (table below). |

6. **Check the prerequisite** in the status table (section 8) before you start. Not met: stop and report which artifact is blocking and why.
7. **Tier M, phases 2 and 3.** Skip `02-research.md` only when the idea lists no unknown about the stack, a library, or data. Skip `03-prototype.md` (any tier) when no hypothesis is risky. Each reason goes into the PRD's `Research:` and `Prototype:` lines. When unsure, ask. Tier L never skips research or the architecture review.
8. **Run the phase skill**, then stop and report. You may chain phases only when **no gate or human decision sits between them**: in tier M, the PRD, the feature spec, then the task breakdown (all end at `in review`, one Spec gate); in any tier, the feature spec then the task breakdown when the spec says `Tasks gate: merged with this gate`. Nothing else.
9. **Change request on an approved artifact.** Record it in that artifact's change log, set it back to `in review`, update the downstream artifacts in the same change, and stop at the gate again.

## Phase to skill

| Phase | Skill | Phase | Skill |
|---|---|---|---|
| 1 Idea | `write-idea` | 7 Task Breakdown | `write-tasks` |
| 2 Research | `write-research` | 8 Execution | `build-task`, `new-feature`, `add-server-function`, `add-server-route`, `add-route`, `add-db-table`, `add-ui-component` |
| 3 Prototype | `write-prototype` | 8 Review | `code-review` |
| 4 PRD | `write-prd` | 9 QA | `run-qa` |
| 5 Architecture Review | `write-architecture-review` | 10 Release | `prepare-release` |
| 6 Feature Spec | `write-feature-spec` | 11 Close out | `close-out` |
| | | 12 Measure | `measure-feature` |

## Never

- Approve your own work, or set `approved` or `done`, tick "Confirmed by", or write a human's name in `Approved by:` or `Decided by:` without an explicit human approval (`sdlc-pipeline.md`, section 4). A passing check is not one.
- Start a phase whose prerequisite is not met, or jump over a gate "to save time".
- Trust the chat history over the files: the `Status:` lines are the state.
- Invent a status, a phase, or a skill that is not in this repo.
- In `team` mode, treat a chat message as the approval. In `personal` mode, record only a message that names the artifact and the verdict, as `<name> (<role>), <date>, via chat`, adding its round to the Gate review table with the message quoted in the findings, or the quote in `Decision quote:` for a phase with no gate. Ask which roles the person holds; do not assume them. "OK" or "continue" is not one.

## Output

Per artifact one line (`file · status · gate`), the task counts, what you ran this time, and the phases the tier still requires: code merged is not the end of the feature. At a gate, end with exactly this:

```text
Gate: <name> · Waiting on: <role or person>
Review: <files>
Decide: <numbered questions only the reviewer can answer, or "none">
Verdict: fill the Gate review table in <file>; on approval set `Status: approved` and `Approved by:` there, with the role (`docs/01-workflow/roles.md`). Personal mode: or tell me the artifact and the verdict, and I record it.
```
