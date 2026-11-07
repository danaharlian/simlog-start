# 0017 Pipeline order: research before the PRD, separate spec and task gates, staging before release

- Status: accepted (gate owners, the tier M task review, and the `docs/decisions/` exception refined by ADR 0018)
- Date: 2026-10-31
- Deciders: owner (chose the order, the staging rule, and the word "task", and approved the change to `scripts/check-docs.mjs`)
- Replaces: the phase order and gates in ADR 0005. Its tiers, test-first rule, and "docs are part of every PR" stay
- Extends: ADR 0016

## Context

The owner proposed: Idea, Research, Prototype, PRD, Architecture Review, Feature Spec, Task Breakdown, Execution + Docs, Code Review, QA, Learn. Reading the previous pipeline against it found:

1. **A merged task could reach users before QA.** The link to a feature landed in a slice, merged at the PR gate, and if `main` deployed automatically to production, users had it before QA and the Release gate.
2. **Close-out waited for Measure.** `10-learnings` needed `09-measure`, so a guardrail could wait for a whole measurement window while the mistake repeated.
3. **Research could start on a draft PRD,** against the rule that no phase starts before the previous gate. The status table and the check only asked that the PRD exist.
4. **The people who own the product saw the layout late.** The sketch was in the spec, reviewed by an architect.
5. **A real project supplied evidence.** The owner's SIMLOG Master Data artifacts (12 phases, Next.js) passed separate gates and were marked complete, and they contain:
   - CRUD for manufacturers in the PRD's scope, with no `Manufacturer` in the schema, spec, or tasks.
   - Three getters in the architecture review, and only `getItemById` in the spec's contract code and `TASK-005`; `calculateBaseQuantity` does not appear there again.
   - `TASK-006` and `TASK-008` depending on one thing in their text and sitting elsewhere in the execution diagram.
   - `TASK-005` and `TASK-011` asking for work on files outside their allowed list.
   - `updateSupplierAction` and `toggleSupplierStatusAction` in the spec and not in `TASK-007`.
   - Tasks cut by layer, with the first page at `TASK-011`.
   - `TASK-007`'s definition of done covering warehouse scope and not the supplier role rule; REV-01 (Critical) found that gap in review, after the code was written.
   - A spec dated 09-11 saying `ITEMS_MANAGE` was revoked, a finding from 09-16, with no change log.

   The artifacts were read; the SIMLOG code and its file history were not. These gaps do not show that separate gates cause harm. They show that a gate without coverage questions lets them through.

## Decision

1. **Order:** Idea, Research, Prototype (only for a risky hypothesis), PRD, Architecture Review (tier L), Feature Spec, Task Breakdown, Execution with Docs and Review (loop per task), QA, Release, Learn, Measure.
2. **Six gates:** PRD, Architecture, Spec, Tasks, PR, Release. Tier M has PR, Spec (covering PRD, spec, and tasks), and Release.
3. **Tier L separates the spec and task gates;** tier M keeps one. The two documents are separate in every tier. Agents write plans cheaply and reviewers' time is scarce, which favors one gate, but a feature of SIMLOG's size asks two different questions (is the design right; are the order and coverage safe) and is too large to judge at once. A task breakdown that shows the spec is wrong sends the spec back through its change log and gate.
4. **Each gate reviews coverage,** not only content: every in-scope PRD item, every architecture decision and public export, every AC, and each permission rule must land in the next artifact.
5. **`main` deploys automatically to staging only.** Production is a human deploy: after the Release gate for tiers M and L, and as the normal deploy for tier S.
6. **Learn runs right after the release,** and Measure closes the feature after its window.
7. **"Task" replaces "slice".** One task is one vertical cut and one PR. Dependencies are written once, in the overview table.
8. **Research comes before the PRD, and it is not the last check.** A later question is added to `02-research.md` as a dated row. Exact library APIs are still verified in the spec and at each call.

From the owner's proposal, these were added: Release and Measure, which it lacked; tiers; acceptance criteria in the PRD and not the spec; a per-task loop; test-first; and ways back from gates and QA.

### New and renamed

| Before | Now |
|---|---|
| `02-prd.md`, `03-research.md` | `04-prd.md`, `02-research.md` |
| (none) | `03-prototype.md`, `05-architecture-review.md`; templates and skills `write-prototype`, `write-architecture-review` |
| `04-tech-spec.md`, template `tech-spec.md`, skill `write-tech-spec` | `06-feature-spec.md`, `feature-spec.md`, `write-feature-spec` |
| `05-slices.md`, template `slices.md`, skills `write-slices`, `build-slice` | `07-tasks.md`, `tasks.md`, `write-tasks`, `build-task` |
| `06-review-log.md`, `07-qa.md`, `08-release.md` | `08-review-log.md`, `09-qa.md`, `10-release.md` |
| `09-measure.md`, `10-learnings.md` | `12-measure.md`, `11-learnings.md` |

Section numbers inside the PRD and the feature spec did not change, so existing citations hold.

### Changes to `scripts/check-docs.mjs`

Approved by the owner on 2026-10-31.

| Change | Direction |
|---|---|
| New artifact table and prerequisites; research needs a final idea, and a PRD needs a final research and prototype if present | Stricter |
| Tier L: a final PRD needs research, a final spec needs an architecture review, and a PRD or task breakdown cannot use `Spec gate` | Stricter |
| Gate review also required on the architecture review and task breakdown | Stricter |
| A tier M task breakdown with `Gate: Spec gate` is exempt from its own Gate review, as a tier M PRD already was | Same rule, new artifact |
| Old artifact names are no longer checked under `docs/decisions/` | **Looser, on purpose:** ADRs are records, and 0005 and 0016 keep the names that were true then. The check still covers everything else |

## Consequences

- **32 files named artifacts** (195 occurrences) and 33 used "slice" before this change; all but ADRs were updated. `docs/04-stack/tanstack-table.md` keeps "slice" for state, an unrelated meaning.
- **Tier L has more stops:** five before the code is released, plus one per PR. Tier M has one before the build.
- **No tool enforces the staging rule.** The deploy setup must, and platform steps are still not written (ADR 0007).
- **A tier can be misstated.** The tier rules read the artifact's `Tier:` line, and `Tier: M` avoids them. A human confirms the tier in `01-idea.md`; the script does not compare the two.
- **Existing apps:** an app that already has `specs/` from the earlier names needs its files renamed, or its artifacts are ignored by the status checks. No such migration was written, because no feature has run on this pipeline in this repo.
- **Open decision AE stays open:** a check for a missing later artifact.

## Not verified

- This pipeline on a real feature. Expect changes after the first one, and use phase 11 for that.
- Whether reviewers keep up with five gates on tier L. If the Tasks gate only delays, a new ADR can merge it back.
- The installer on a real app with this version. Its code names no artifact or skill, and it copies folders whole, so it should carry the new files; this was read, not run.
- The trigger wording of the new and renamed skills against a real agent session.

## Alternatives considered

- **Keep the previous order and only fix the staging rule.** Smaller, but it leaves research on a draft PRD and the late layout review.
- **The owner's order unchanged.** No release, rollback, or measure step, and the pasted transition rules still pointed at the old order.
- **One Spec and Tasks gate for all tiers,** the agent's first suggestion. Rejected after reading the SIMLOG artifacts, for a feature of that size.
- **Keep "slice".** Fewer files changed, but `07-tasks.md` would hold slices, and the team says "task".
- **Keep a separate `feature flag` path for unfinished work.** Needs infrastructure that is not decided; the staging rule covers the same risk.

## Verification

Docs consulted: none for library APIs; none were added. Fixtures on a copy of this repo, with the applied script (2026-10-31):

| Input | Result |
|---|---|
| Tier L at tasks; QA failed; fix tasks running; Learn done with Measure missing; a prototype present; a PRD back in `draft` after changes requested; tier M approved at one Spec gate | Clean |
| Tier L PRD without research; tier L spec without architecture review; tier L PRD or tasks on `Spec gate`; tier L tasks with no Gate review | Error |
| Research on a draft idea; PRD on draft research; architecture review on a PRD `in review`; spec on a draft architecture review | Error |
| Release over `Result: fail`; Learn with no release; an old artifact name in a doc outside `docs/decisions/` | Error |
