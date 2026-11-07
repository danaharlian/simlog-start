# Learnings and Close-out: <Feature name>

- Slug: `<feature-slug>` (file `11-learnings.md`)
- Status: draft | done
- Decided by: <name> (Product Manager), <date> — format and authority: `docs/01-workflow/roles.md`
- Gate: none
- Tier: M | L (tier S: one line in the PR, see `docs/templates/pr-checklist.md`)
- Owner: <human>
- Written by: <human, or "AI agent" with the human who reviewed it>
- Date closed: YYYY-MM-DD
- Artifacts: `04-prd.md` · `06-feature-spec.md` · `07-tasks.md` · `08-review-log.md` · `09-qa.md` · `10-release.md`

This phase is how the rules improve. A lesson that stays as a paragraph in this file is forgotten; a lesson that becomes a **changed doc, skill, lint rule, test, or template** is not. Every row of section 2 therefore ends in a link to a change, or says why none is needed. Facts come from the other artifacts (PRs, review log, QA, release), each with a link; no source, no claim.

Tier M minimum (brief): sections 1, 2, 5. Write "n/a" in the rest. Tier L: all sections.

## 1. Outcome
Three lines: what shipped, the QA result, and when the PRD metric will be read (`12-measure.md` follows this file, after its window, so a mistake is not repeated in the meantime).

**Worth keeping** (what worked, so nobody removes it by accident): <one to three items, with the artifact that shows it>.

## 2. What the agent got wrong, and the guardrail that now prevents it
One row per correction a human had to make, or per finding that repeated across tasks. Evidence is a review-log id, a QA defect id, or a PR link.

| What went wrong (evidence) | Why it happened (missing rule · unclear rule · rule not enforced · outdated source · spec gap) | Guardrail (doc · skill · lint rule · test · template · hook) | Change (PR or file link) | State (merged · ticket · not needed: reason) |
|---|---|---|---|---|

Prefer the strongest guardrail that is practical: a check that fails (lint rule, test, script) over a skill step, over a sentence in a doc (see the layers in `docs/03-standards/no-suppression.md`). Changes to lint, TypeScript, or check-script config need a human (`AGENTS.md`). A change to `AGENTS.md` must keep it within its line limit (`node scripts/check-docs.mjs`). A one-off mistake with no rule to add is "not needed", with the reason.

**Product and operations findings** (feedback, support tickets, incidents, technical debt; each with its source): <list, or "none yet">. What is kept, fixed, or built next: <…>.

## 3. Pipeline and template feedback
Where the pipeline or a template got in the way, or missed something, while building this feature (`docs/decisions/0005-pipeline-revision.md` says to expect this).

| Phase or template | Friction or gap | Change proposed (and the file) |
|---|---|---|

## 4. Decisions and patterns
**Decisions made during the build:** each has an ADR (link), or says why it needs none. Decisions that changed the spec are in the spec's change log (link).
**Docs reviewed and not changed (tier L):** every doc, skill, or stack file the feature touched or relied on that you read again and left as it was, with the reason. A review that found nothing to change is a result; an empty list means nobody looked.

| Doc, skill, or ADR | Why it was relevant | Why it stays as it is |
|---|---|---|

**Patterns worth reusing:** a pattern is only recorded here when it has landed in a doc or skill; give the link. If it has not, it goes in section 2 as a guardrail to write.

## 5. Measures
Counted from the artifacts, not estimated. Write **Unknown** where nothing recorded it.

| Measure | Value | Source |
|---|---|---|
| Tasks (planned · delivered) | | `07-tasks.md` |
| Review rounds per task | | `08-review-log.md` |
| Blocking findings, and how many a tool could have caught | | `08-review-log.md` |
| Defects found in QA · found after release | | `09-qa.md` · incidents |
| Tests that failed for the expected reason before the code (logic tasks) | | PR descriptions |
| Changes to the PRD or spec after approval | | their change logs |
| Time from idea to release · to close-out | | file dates |

## 6. Close-out checklist
- [ ] Every task is `merged` in `07-tasks.md`; every artifact in `specs/<slug>/` has its final status, except `12-measure.md`, which comes later.
- [ ] The entry point is linked (or the feature is deliberately left unlinked, with the ticket). No temporary flag or workaround remains (`docs/01-workflow/sdlc-pipeline.md`, no flags by default).
- [ ] Spike branches and throwaway code are deleted (nothing from `03-prototype.md` was merged).
- [ ] Docs match what shipped: the feature `README.md` (public API, events, owned tables), `docs/`, ADRs, `.env.example`; `node scripts/check-docs.mjs` passes.
- [ ] Every `TODO(verify)` is resolved or has a ticket (link).
- [ ] Tech debt and follow-ups from QA are tickets, listed below. Measure opens its own.

## 7. Follow-ups
| Ticket (link) | What | Owner | From (QA defect, release, review) |
|---|---|---|---|
